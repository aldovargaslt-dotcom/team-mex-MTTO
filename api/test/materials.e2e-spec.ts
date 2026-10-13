import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { InventarioService } from '../src/inventario/inventario.service';
import { InventoryMaterialsService } from '../src/inventario/materials.service';
import { Rol } from '../src/auth/roles.enum';
import { VisitaCerradaPayload, OrigenConsumo } from '../src/kernel/events/visita-cerrada';
import { decimal, formatDecimal } from '../src/inventario/cost-decimal';
import { MaterialAccount } from '../src/inventario/materials.entity';
import { UNIDAD_ANDON_DEMO } from '../src/seed/catalogo-demo';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const SUP = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-costs' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'admin-costs' };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('SPEC-INV-OT-001 material transactions / HTTP boundaries', () => {
  let app: INestApplication<App>, server: App, db: DataSource, ot: string, item: string, oil: string, unit: string, driver: string;
  let storageRoot: string;
  const oldStorage = { provider: process.env.CHECK_STORAGE_PROVIDER, root: process.env.CHECK_STORAGE_ROOT };
  beforeAll(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'materials-e2e-'));
    process.env.CHECK_STORAGE_PROVIDER = 'filesystem'; process.env.CHECK_STORAGE_ROOT = storageRoot;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); server = app.getHttpServer(); db = app.get(DataSource);
    const units = await request(server).get('/unidades').set(SUP).expect(200);
    unit = units.body.find((u: { numeroInterno: string }) => u.numeroInterno === UNIDAD_ANDON_DEMO).id;
    const drivers = await request(server).get('/choferes?estado=ACTIVO').set(SUP).expect(200); driver = drivers.body[0].id;
    const draft = await request(server).post(`/unidades/${unit}/visitas`).set(SUP).send({ choferId: driver, km: 2000, tipo: 'PREDICTIVO' }).expect(201); ot = draft.body.id;
    const family = await request(server).post('/inventario/familias').set(SUP).send({ nombre: 'Costeo pruebas' }).expect(201);
    const created = await request(server).post('/inventario/items').set(SUP).send({ sku: 'COST-FILTER', nombre: 'Filtro costeo', familiaId: family.body.id }).expect(201); item = created.body.id;
    const lubricant = await request(server).post('/inventario/items').set(SUP).send({ sku: 'COST-OIL', nombre: 'Aceite costeo', familiaId: family.body.id, uom: 'L', quantityScale: 3 }).expect(201); oil = lubricant.body.id;
    await request(server).post('/inventario/movimientos/entrada').set(SUP).send({ itemId: item, qty: 10 }).expect(201);
    // Explicit, verified opening valuation; quantities are seeded through owner API.
    await db.query("UPDATE inventario.stock SET known_value=2000, unknown_qty=0, cost_sources='[]'::jsonb WHERE item_id=$1", [item]);
  }, 60_000);
  afterAll(async () => {
    if (app) await app.close();
    if (storageRoot) await rm(storageRoot, { recursive: true, force: true });
    if (oldStorage.provider === undefined) delete process.env.CHECK_STORAGE_PROVIDER; else process.env.CHECK_STORAGE_PROVIDER = oldStorage.provider;
    if (oldStorage.root === undefined) delete process.env.CHECK_STORAGE_ROOT; else process.env.CHECK_STORAGE_ROOT = oldStorage.root;
  });
  const view = () => request(server).get(`/visitas/${ot}/materiales`).set(SUP).expect(200);
  async function command(command: object, actor = SUP, status = 201) {
    const current = await view();
    return request(server).post(`/visitas/${ot}/materiales/comandos`).set(actor).send({ key: randomUUID(), revision: current.body.revision, command }).expect(status);
  }
  it('AC-02/03/08/16/19 posts direct cost once, one receipt condition, real warehouse remainder', async () => {
    const payload = { key: randomUUID(), revision: 0, command: { type: 'PURCHASE', lines: [
      { itemId: item, purchased: '3', used: '2', received: '1', paid: '750', conversion: '1' },
      { itemId: oil, purchased: '5', used: '4.5', received: '0.5', paid: '500', conversion: '1' },
    ] } };
    const [first, retry] = await Promise.all([request(server).post(`/visitas/${ot}/materiales/comandos`).set(SUP).send(payload).expect(201), request(server).post(`/visitas/${ot}/materiales/comandos`).set(SUP).send(payload).expect(201)]);
    expect(first.body).toEqual(retry.body);
    expect(first.body.state.purchases).toHaveLength(1);
    expect(first.body.summary.materialsCost).toBe('950');
    const [{ qty, value }] = await db.query('SELECT qty::text, known_value::text AS value FROM inventario.stock WHERE item_id=$1', [item]);
    expect(Number(qty)).toBe(11); expect(Number(value)).toBe(2250);
    const attention = await request(server).get('/configuracion/alertas/activas').set(SUP).expect(200);
    expect(attention.body.items.filter((p: { id: string }) => p.id === `purchase:${first.body.state.purchases[0].id}`)).toHaveLength(1);
    await request(server).post(`/visitas/${ot}/materiales/comandos`).set(SUP).send({ ...payload, command: { type: 'USE', itemId: item, qty: '1' } }).expect(409);
  });
  it('AC-06/14 malformed quantity rolls back every purchase line and stock write', async () => {
    const before = (await view()).body;
    const stock = await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id');
    await command({ type: 'PURCHASE', lines: [
      { itemId: item, purchased: '1', used: '0', received: '1', paid: '250', conversion: '1' },
      { itemId: oil, purchased: '1', received: '0', paid: '100', conversion: '1' },
    ] }, SUP, 400);
    expect((await view()).body).toEqual(before);
    expect(await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id')).toEqual(stock);
  });
  it('AC-15/21/24 sub-unit warehouse uses retain independent identities and unknown costs', async () => {
    await command({ type: 'USE', itemId: oil, qty: '0.1' });
    const repeated = await command({ type: 'USE', itemId: oil, qty: '0.1' });
    expect(repeated.body.state.postings.filter((p: { itemId: string; kind: string }) => p.itemId === oil && p.kind === 'WAREHOUSE_USE')).toHaveLength(2);
    await request(server).post('/inventario/movimientos/entrada').set(SUP).send({ itemId: oil, qty: 1 }).expect(201);
    const unknown = await command({ type: 'USE', itemId: oil, qty: '0.25' });
    expect(unknown.body.summary).toMatchObject({ complete: false, materialsCost: null });
    await command({ type: 'USE', itemId: item, qty: '0.25' }, SUP, 400);
  });
  it('AC-13 competing usage of the same stock across OTs cannot overdraw', async () => {
    // Two independent OT references contend on the same inventory stock row.
    const secondId = randomUUID();
    await db.query(`INSERT INTO visitas(id, unidad_id, estado, work_order_type, work_order_status, version, legacy_compat_draft, migration_backfilled) VALUES ($1,$2,'BORRADOR','CORRECTIVE','PENDING',1,false,false)`, [secondId, unit]);
    const a = (await view()).body;
    const requests = [ot, secondId].map((id, index) => request(server).post(`/visitas/${id}/materiales/comandos`).set(SUP).send({ key: randomUUID(), revision: index === 0 ? a.revision : 0, command: { type: 'USE', itemId: item, qty: '8' } }));
    const results = await Promise.all(requests);
    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
    const [{ qty }] = await db.query('SELECT qty::text FROM inventario.stock WHERE item_id=$1', [item]); expect(Number(qty)).toBe(3);
    // Keep the successful consumption history regardless of which OT won.
    const consumed = results.find(r => r.status === 201)!.body;
    expect(consumed.state.postings.some((p: { kind: string }) => p.kind === 'WAREHOUSE_USE')).toBe(true);
  });
  it('AC-18 posted draft cannot be deleted and LOGISTICA cannot post materials', async () => {
    await request(server).delete(`/visitas/${ot}`).set(SUP).expect(400);
    await request(server).post(`/visitas/${ot}/materiales/comandos`).set({ 'X-Role': 'LOGISTICA' }).send({ key: randomUUID(), revision: 0, command: { type: 'USE', itemId: item, qty: '1' } }).expect(403);
  });
  it('AC-07 quantities without destination block close; receipt and unknown costs do not', async () => {
    const purchase = await command({ type: 'PURCHASE', lines: [{ itemId: oil, purchased: '1', used: '0', received: '0', paid: '100', conversion: '1' }] });
    await request(server).patch(`/visitas/${ot}`).set(SUP).send({ choferId: driver, km: 2000, tipo: 'PREDICTIVO', trabajos: [{ categoria: 'A', item: 'Afinación / filtros de aceite' }], firmas: [{ tipo: 'CHOFER', dataUrl: PNG }, { tipo: 'JEFE', dataUrl: PNG }] }).expect(200);
    await request(server).post(`/visitas/${ot}/cerrar`).set(SUP).expect(400);
    const p = purchase.body.state.purchases[purchase.body.state.purchases.length - 1];
    await command({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, qty: '1', source: 'PENDING', destination: 'LOSS', reason: 'Derrame documentado' });
    const beforeStock = await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id');
    await request(server).post(`/visitas/${ot}/cerrar`).set(SUP).expect(200);
    expect(await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id')).toEqual(beforeStock);
    const [{ count }] = await db.query(`SELECT count(*) FROM outbox_events WHERE payload->>'visitaId'=$1 AND type='VisitaCerrada'`, [ot]);
    expect(Number(count)).toBe(1);
  });
  it('AC-11/12 administrator-only correction preserves closed status and emits no completed event', async () => {
    // Create a warehouse use if it happened on the competing OT, then use its closed metadata.
    const account = await db.manager.findOneByOrFail(MaterialAccount, { visitaId: ot });
    const posting = account.state.postings.find(p => p.kind === 'WAREHOUSE_USE' && p.itemId === item);
    if (!posting) {
      const second = await db.getRepository(MaterialAccount).find();
      const candidate = second.find(a => a.visitaId !== ot && a.state.postings.some(p => p.kind === 'WAREHOUSE_USE'))!;
      await db.query(`UPDATE visitas SET estado='CERRADO', work_order_status='COMPLETED', cerrado_at=now(), completed_at=now() WHERE id=$1`, [candidate.visitaId]);
      const before = await db.query('SELECT count(*) FROM outbox_events');
      await request(server).post(`/visitas/${candidate.visitaId}/materiales/comandos`).set(SUP).send({ key: randomUUID(), revision: candidate.revision, command: { type: 'CORRECT_USE', postingId: candidate.state.postings[0].id, replacementQty: '1', destination: 'WAREHOUSE', reason: 'Conteo físico' } }).expect(403);
      await request(server).post(`/visitas/${candidate.visitaId}/materiales/comandos`).set(ADMIN).send({ key: randomUUID(), revision: candidate.revision, command: { type: 'CORRECT_USE', postingId: candidate.state.postings[0].id, replacementQty: '1', destination: 'WAREHOUSE', reason: 'Conteo físico' } }).expect(201);
      expect(await db.query('SELECT count(*) FROM outbox_events')).toEqual(before);
    } else {
      await command({ type: 'CORRECT_USE', postingId: posting.id, replacementQty: '1', destination: 'WAREHOUSE', reason: 'Conteo físico' }, SUP, 403);
      const before = await db.query('SELECT count(*) FROM outbox_events');
      const corrected = await command({ type: 'CORRECT_USE', postingId: posting.id, replacementQty: '1', destination: 'WAREHOUSE', reason: 'Conteo físico' }, ADMIN);
      expect(corrected.body.state.audits.length).toBeGreaterThan(0);
      expect(await db.query('SELECT count(*) FROM outbox_events')).toEqual(before);
    }
    const visit = await request(server).get(`/visitas/${ot}`).set(SUP).expect(200); expect(visit.body.estado).toBe('CERRADO');
  });
  it('AC-19/20 receipt after closure resolves one condition without valuation, stock or event effects', async () => {
    const account = (await view()).body;
    const purchase = account.state.purchases[0];
    const stock = await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id');
    const events = await db.query('SELECT count(*) FROM outbox_events');
    const before = await request(server).get('/configuracion/alertas/activas').set(SUP).expect(200);
    expect(before.body.items.some((p: { id: string }) => p.id === `purchase:${purchase.id}`)).toBe(true);
    // Reading the façade does not resolve a documentary condition.
    const readAgain = await request(server).get('/configuracion/alertas/activas').set(SUP).expect(200);
    expect(readAgain.body.items.some((p: { id: string }) => p.id === `purchase:${purchase.id}`)).toBe(true);
    const url = `/visitas/${ot}/materiales/compras/${purchase.id}/comprobante`;
    const attached = await request(server).post(url).set(SUP).send({ dataUrl: PNG }).expect(201);
    const retry = await request(server).post(url).set(SUP).send({ dataUrl: PNG }).expect(201);
    expect(retry.body).toEqual(attached.body);
    expect(attached.body.summary).toEqual(account.summary);
    expect(await db.query('SELECT item_id, qty, known_value FROM inventario.stock ORDER BY item_id')).toEqual(stock);
    expect(await db.query('SELECT count(*) FROM outbox_events')).toEqual(events);
    const after = await request(server).get('/configuracion/alertas/activas').set(SUP).expect(200);
    expect(after.body.items.some((p: { id: string }) => p.id === `purchase:${purchase.id}`)).toBe(false);
    await request(server).get(url).set({ 'X-Role': 'LOGISTICA' }).expect(403);
    const evidence = await request(server).get(url).set(SUP).expect(200);
    expect(evidence.headers['content-type']).toContain('image/png');
    expect(evidence.headers['cache-control']).toBe('private, no-store');
  });
  it('AC-11/21 administrator completes unknown closed-OT cost and corrects purchase price with append-only history', async () => {
    const current = (await view()).body;
    const unknown = current.state.postings.find((p: { cost: string | null; kind: string }) => p.cost === null && p.kind === 'WAREHOUSE_USE');
    const events = await db.query('SELECT count(*) FROM outbox_events');
    await command({ type: 'COMPLETE_COST', postingId: unknown.id, unitCost: '100', reason: 'Costo de apertura verificado' }, SUP, 403);
    const completed = await command({ type: 'COMPLETE_COST', postingId: unknown.id, unitCost: '100', reason: 'Costo de apertura verificado' }, ADMIN);
    expect(completed.body.summary.complete).toBe(true);
    expect(completed.body.state.postings.find((p: { id: string }) => p.id === unknown.id).cost).toBeNull();
    const purchase = current.state.purchases[0], line = purchase.lines[0];
    await command({ type: 'CORRECT_PRICE', purchaseId: purchase.id, lineId: line.id, paid: '900', reason: 'Factura corregida' }, SUP, 403);
    const corrected = await command({ type: 'CORRECT_PRICE', purchaseId: purchase.id, lineId: line.id, paid: '900', reason: 'Factura corregida' }, ADMIN);
    expect(corrected.body.state.purchases[0].lines[0].paid).toBe('900');
    expect(corrected.body.state.postings.some((p: { kind: string }) => p.kind === 'PRICE_ADJUSTMENT')).toBe(true);
    expect(await db.query('SELECT count(*) FROM outbox_events')).toEqual(events);
  });
  it('AC-24 legacy closure preserves sub-unit liters and rejects fractional indivisible pieces', async () => {
    await request(server).post('/inventario/movimientos/entrada').set(SUP).send({ itemId: oil, qty: 1 }).expect(201);
    const draft = await request(server).post(`/unidades/${unit}/visitas`).set(SUP).send({ choferId: driver, km: 2500, tipo: 'PREDICTIVO' }).expect(201);
    const legacy = draft.body.id;
    await request(server).patch(`/visitas/${legacy}`).set(SUP).send({ trabajos: [{ categoria: 'A', item: 'Afinación / filtros de aceite' }], firmas: [{ tipo: 'CHOFER', dataUrl: PNG }, { tipo: 'JEFE', dataUrl: PNG }], piezas: [{ itemId: item, qty: 0.5, origen: 'DESDE_STOCK' }] }).expect(200);
    const stock = await db.query('SELECT qty::text FROM inventario.stock WHERE item_id=$1', [oil]);
    await request(server).post(`/visitas/${legacy}/cerrar`).set(SUP).expect(400);
    await request(server).patch(`/visitas/${legacy}`).set(SUP).send({ piezas: [{ itemId: oil, qty: 0.25, origen: 'DESDE_STOCK' }] }).expect(200);
    const closed = await request(server).post(`/visitas/${legacy}/cerrar`).set(SUP).expect(200);
    expect(closed.body.piezas[0].qty).toBe(0.25);
    const after = await db.query('SELECT qty::text FROM inventario.stock WHERE item_id=$1', [oil]);
    expect(formatDecimal(decimal(after[0].qty))).toBe(formatDecimal(decimal(stock[0].qty) - decimal('0.25')));
    const [{ payload }] = await db.query("SELECT payload FROM outbox_events WHERE type='VisitaCerrada' AND payload->>'visitaId'=$1", [legacy]);
    expect(payload.consumos).toEqual([{ itemId: oil, qty: 0.25, origen: 'DESDE_STOCK' }]);
  });

  it('AC-12/13 old outbox consumption and a new purchase serialize without losing account history', async () => {
    await request(server).post('/inventario/movimientos/entrada').set(SUP).send({ itemId: oil, qty: 1 }).expect(201);
    const opaqueOt = randomUUID(), key = randomUUID();
    const payload: VisitaCerradaPayload = { eventId: randomUUID(), eventType: 'VisitaCerrada', occurredAt: '2026-10-01T00:00:00Z', cerradoAt: '2026-10-01T00:00:00Z', visitaId: opaqueOt, unidadId: unit, tipoVehiculoId: randomUUID(), km: 1000, consumos: [{ itemId: oil, qty: 0.25, origen: OrigenConsumo.DESDE_STOCK }] };
    const purchase = { type: 'PURCHASE' as const, lines: [{ itemId: oil, purchased: '1', used: '1', received: '0', paid: '100', conversion: '1' }] };
    const materials = app.get(InventoryMaterialsService);
    const actor = { rol: Rol.SUPERVISOR, userId: 'sup-costs' };
    const [legacy, current] = await Promise.allSettled([
      db.transaction(manager => app.get(InventarioService).applyVisitaCerrada(payload, manager)),
      db.transaction(manager => materials.command(manager, opaqueOt, key, 0, purchase, actor)),
    ]);
    expect(legacy.status).toBe('fulfilled');
    if (current.status === 'rejected') {
      expect(current.reason.getStatus()).toBe(409);
      const refreshed = await materials.read(opaqueOt);
      await db.transaction(manager => materials.command(manager, opaqueOt, key, refreshed.revision, purchase, actor));
    }
    const result = await materials.read(opaqueOt);
    expect(result.state.postings.map(p => p.kind).sort()).toEqual(['DIRECT_USE', 'WAREHOUSE_USE']);
    expect(result.state.postings.find(p => p.kind === 'WAREHOUSE_USE')?.qty).toBe('0.25');
    expect(result.state.purchases).toHaveLength(1);
  });

});
