import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { CurrentUser } from '../auth/current-user';
import { Rol } from '../auth/roles.enum';
import { InventoryMaterialsPort } from './materials.port';
import { MaterialAccount, MaterialClosure, MaterialCommandRecord } from './materials.entity';
import { Balance, MaterialCommand, MaterialItem, emptyMaterials } from './materials-model';
import { executeMaterials, materialsSummary } from './materials-engine';
import { decimal as d, formatDecimal as f } from './cost-decimal';
import { Movimiento } from './entities/movimiento.entity';
import { Item } from './entities/item.entity';
import { TipoMovimiento } from './enums';
import { InventarioService } from './inventario.service';
import { ObjectStoragePort } from '../visitas/checks/object-storage.port';
import { detectImageMime } from '../visitas/checks/check-evidence.rules';
import { correctPurchasePrice } from './purchase-price-correction';
import { validateMaterialsCommand } from './materials-command-validation';

/** Owns inventory data only. OT lifecycle/roles are coordinated by Mantenimiento. */
@Injectable()
export class InventoryMaterialsService extends InventoryMaterialsPort {
  constructor(private readonly db: DataSource, private readonly inventory: InventarioService, private readonly storage: ObjectStoragePort) { super(); }

  async read(visitaId: string, manager = this.db.manager) {
    const row = await manager.findOneBy(MaterialAccount, { visitaId });
    const state = row?.state ?? emptyMaterials();
    return { revision: row?.revision ?? 0, state, summary: materialsSummary(state) };
  }

  async command(manager: EntityManager, visitaId: string, key: string, revision: number, command: MaterialCommand, user: CurrentUser, closed = false) {
    if (![Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO].includes(user.rol)) throw new ForbiddenException();
    try { validateMaterialsCommand(command); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Comando inválido.'); }
    if (command.type === 'CORRECT_PRICE' && user.rol !== Rol.ADMIN_DIRECTIVO) throw new ForbiddenException('Sólo Administrador puede corregir precios.');
    const hash = createHash('sha256').update(canonical({ visitaId, revision, command, user })).digest('hex');
    await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('inventory-material-posting', 0))");
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`material-command:${key}`]);
    const previous = await manager.findOneBy(MaterialCommandRecord, { id: key });
    if (previous) {
      if (previous.hash !== hash || previous.visitaId !== visitaId) throw new ConflictException('La clave ya se usó con otros datos.');
      return previous.result as Awaited<ReturnType<InventoryMaterialsService['read']>>;
    }
    if (closed && (user.rol !== Rol.ADMIN_DIRECTIVO || !['CORRECT_USE', 'COMPLETE_COST', 'VALUE_STOCK', 'DESTINATION', 'CORRECT_PRICE', 'SETTLEMENT', 'REPLACEMENT_RECEIPT'].includes(command.type)))
      throw new ForbiddenException('Sólo Administrador puede corregir materiales de una orden cerrada.');
    if (closed && (!('reason' in command) || !command.reason?.trim())) throw new BadRequestException('El motivo es obligatorio.');
    await manager.query(`INSERT INTO inventario.material_accounts (visita_id) VALUES ($1) ON CONFLICT DO NOTHING`, [visitaId]);
    const account = await manager.findOneOrFail(MaterialAccount, { where: { visitaId }, lock: { mode: 'pessimistic_write' } });
    if (account.revision !== revision) throw new ConflictException('Esta orden cambió. Revisa los datos actualizados antes de guardar.');
    const itemIds = new Set<string>();
    if ('itemId' in command) itemIds.add(command.itemId);
    if (command.type === 'PURCHASE') for (const line of command.lines ?? []) itemIds.add(line.itemId);
    if ('returnId' in command) {
      const row = account.state.postings.find(p => p.id === command.returnId);
      if (!row) throw new NotFoundException('No se encontró la devolución.');
      itemIds.add(row.itemId);
    }
    if ('postingId' in command) {
      const row = account.state.postings.find(p => p.id === command.postingId);
      if (!row) throw new NotFoundException('No se encontró el movimiento.');
      itemIds.add(row.itemId);
    }
    if (command.type === 'DESTINATION' || command.type === 'CORRECT_PRICE') {
      const line = account.state.purchases.find(p => p.id === command.purchaseId)?.lines.find(l => l.id === command.lineId);
      if (!line) throw new NotFoundException('No se encontró la compra.');
      itemIds.add(line.itemId);
    }
    const items: Record<string, MaterialItem> = {};
    const balances: Record<string, Balance> = {};
    for (const itemId of [...itemIds].sort()) {
      const [item] = await manager.query('SELECT id, sku, nombre, uom, activo, quantity_scale AS "quantityScale" FROM inventario.items WHERE id=$1', [itemId]);
      if (!item) throw new NotFoundException('No se encontró la refacción activa.');
      if ((command.type === 'USE' || command.type === 'PURCHASE') && !item.activo) throw new BadRequestException('Selecciona una refacción activa.');
      const [stock] = await manager.query('SELECT qty::text, known_value::text AS "knownValue", unknown_qty::text AS "unknownQty", cost_sources AS sources, min_qty::text AS min, critical_qty::text AS critical FROM inventario.stock WHERE item_id=$1 FOR UPDATE', [itemId]);
      if (!stock) throw new NotFoundException('No se encontró el saldo de la refacción.');
      items[itemId] = item; balances[itemId] = stock;
    }
    let result: ReturnType<typeof executeMaterials>;
    try {
      if (command.type === 'CORRECT_PRICE') {
        if (user.rol !== Rol.ADMIN_DIRECTIVO) throw new ForbiddenException();
        const accounts: MaterialAccount[] = await manager.query('SELECT visita_id AS "visitaId", revision, state FROM inventario.material_accounts ORDER BY visita_id FOR UPDATE');
        const states = Object.fromEntries(accounts.map(row => [row.visitaId, row.state]));
        const expenseRows: Movimiento[] = await manager.getRepository(Movimiento).find({ where: { visitaId: IsNull() } });
        const expenses = expenseRows.filter(row => Number(row.delta) < 0 && row.costSources?.length).map(row => ({ id: row.id, itemId: row.item.id, kind: 'INVENTORY_ADJUSTMENT', qty: String(row.qty), stockDelta: String(row.delta), cost: row.cost, knownCost: row.knownCost ?? '0', unknownQty: row.unknownQty ?? '0', sources: row.costSources ?? [], actor: row.createdBy ?? 'legacy', occurredAt: row.createdAt.toISOString() }));
        const corrected = correctPurchasePrice(states, balances, visitaId, command.purchaseId, command.lineId, command.paid, { actor: user.userId ?? user.rol, reason: command.reason, now: new Date().toISOString(), id: randomUUID }, expenses);
        for (const row of accounts) { const prior = new Set(row.state.audits.map(a => a.id)); for (const audit of corrected.states[row.visitaId].audits) if (!prior.has(audit.id)) audit.actorRole = user.rol; }
        for (const row of accounts) if (row.visitaId !== visitaId && JSON.stringify(row.state) !== JSON.stringify(corrected.states[row.visitaId])) await manager.query('UPDATE inventario.material_accounts SET state=$2::jsonb, revision=revision+1 WHERE visita_id=$1', [row.visitaId, JSON.stringify(corrected.states[row.visitaId])]);
        result = { state: corrected.states[visitaId], balances: corrected.balances };
      } else result = executeMaterials(account.state, balances, items, command, { actor: user.userId ?? user.rol, now: new Date().toISOString(), id: randomUUID, admin: user.rol === Rol.ADMIN_DIRECTIVO });
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'No se pudo contabilizar.'); }
    const priorAuditIds = new Set(account.state.audits.map(a => a.id));
    for (const audit of result.state.audits) if (!priorAuditIds.has(audit.id)) audit.actorRole = user.rol;
    for (const itemId of [...itemIds].sort()) {
      const stock = result.balances[itemId];
      await manager.query('UPDATE inventario.stock SET qty=$2, known_value=$3, unknown_qty=$4, cost_sources=$5::jsonb, updated_at=now() WHERE item_id=$1', [itemId, stock.qty, stock.knownValue, stock.unknownQty, JSON.stringify(stock.sources ?? [])]);
    }
    // Immutable stock movements appear in the existing inventory movement view.
    for (const posting of result.state.postings.slice(account.state.postings.length)) {
      if (d(posting.stockDelta) === 0n) continue;
      await manager.save(Movimiento, manager.create(Movimiento, {
        id: posting.id, item: { id: posting.itemId } as Item, qty: Number(f(d(posting.stockDelta) < 0n ? -d(posting.stockDelta) : d(posting.stockDelta))),
        delta: Number(posting.stockDelta), tipo: posting.kind === 'WAREHOUSE_USE' ? TipoMovimiento.SALIDA_OT : TipoMovimiento.AJUSTE,
        visitaId, nota: posting.reason ?? posting.kind, createdBy: posting.actor,
        cost: posting.cost, knownCost: posting.knownCost, unknownQty: posting.unknownQty, costSources: posting.sources ?? null,
      }));
    }
    account.state = result.state; account.revision++;
    await manager.save(account);
    const view = { revision: account.revision, state: account.state, summary: materialsSummary(account.state) };
    await manager.save(MaterialCommandRecord, manager.create(MaterialCommandRecord, { id: key, visitaId, hash, result: view, actor: user.userId ?? user.rol, revision }));
    return view;
  }
  async reconcile(visitaId: string) {
    const view = await this.read(visitaId);
    await this.inventory.reconcileAlertThresholds([...new Set(view.state.postings.map(p => p.itemId))]);
  }
  async attachReceipt(manager: EntityManager, visitaId: string, purchaseId: string, dataUrl: string, user: CurrentUser) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match || dataUrl.length > 2_000_000) throw new BadRequestException('El comprobante debe ser una imagen PNG, JPEG o WebP de hasta 2 MB.');
    const content = Buffer.from(match[2], 'base64');
    const mime = detectImageMime(content);
    if (!mime || mime !== match[1]) throw new BadRequestException('El contenido de la imagen no corresponde a su formato.');
    const hash = createHash('sha256').update(content).digest('hex');
    const account = await manager.findOne(MaterialAccount, { where: { visitaId }, lock: { mode: 'pessimistic_write' } });
    const purchase = account?.state.purchases.find(p => p.id === purchaseId);
    if (!account || !purchase) throw new NotFoundException('No se encontró la compra.');
    const final = `inventory/receipts/${purchaseId}/${hash}`;
    if (purchase.receiptKey === final) return this.read(visitaId, manager);
    if (purchase.receiptKey) throw new ConflictException('La compra ya tiene un comprobante; conserva el original.');
    const temporary = `inventory/temporary/${randomUUID()}`;
    try {
      await this.storage.putTemporary(temporary, content);
      await this.storage.referenceImmutableObject(temporary, final);
      purchase.receiptKey = final; purchase.receiptMime = mime; account.revision++;
      account.state.audits.push({ id: randomUUID(), actor: user.userId ?? user.rol, actorRole: user.rol, reason: 'Comprobante adjuntado', before: { purchaseId, receiptKey: null }, after: { purchaseId, sha256: hash }, occurredAt: new Date().toISOString() });
      await manager.save(account);
    } finally { await this.storage.removeUnreferencedTemporary(temporary); }
    return this.read(visitaId, manager);
  }
  async receipt(visitaId: string, purchaseId: string) {
    const view = await this.read(visitaId);
    const purchase = view.state.purchases.find(p => p.id === purchaseId);
    if (!purchase?.receiptKey || !purchase.receiptMime) throw new NotFoundException('El comprobante está pendiente.');
    return { content: await this.storage.readPrivate(purchase.receiptKey), mime: purchase.receiptMime };
  }

  async prepareClose(manager: EntityManager, visitaId: string, eventId: string, legacy: MaterialClosure['legacy']) {
    await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('inventory-material-posting', 0))");
    const view = await this.read(visitaId, manager);
    if (view.summary.pendingDestinations.length) throw new BadRequestException('Faltan piezas por asignar a un destino antes de cerrar.');
    await manager.save(MaterialClosure, manager.create(MaterialClosure, { eventId, visitaId, legacy }));
  }
  async hasPostings(manager: EntityManager, visitaId: string) {
    const view = await this.read(visitaId, manager);
    return view.state.postings.length > 0 || view.state.purchases.length > 0;
  }
  async pendingReceipts() {
    const rows = await this.db.getRepository(MaterialAccount).find();
    return rows.flatMap(row => row.state.purchases.filter(p => !p.receiptKey).map(p => ({
      id: p.id, visitaId: row.visitaId, createdAt: p.createdAt, nombre: 'Comprobante pendiente', sku: `${p.lines.length} refacción(es)`,
      estado: 'PENDIENTE', ticketDataUrl: null, qty: 0, purchase: true,
      href: `/ordenes/${row.visitaId}?compra=${p.id}`,
    })));
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
}
