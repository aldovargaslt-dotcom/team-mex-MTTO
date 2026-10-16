import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TrustedActor, validateActor } from '../auth/trusted-actor';
import { Rol } from '../auth/roles.enum';
import { allocatedCost, calculateCost, cents } from './cost-rules';
import { inventoryCostsEnabled } from './cost-feature';
import { AjusteDto } from './dto/ajuste.dto';
import { stockTrasMovimiento } from './stock-rules';
import { OpeningDto, ReceiptDto, ReturnDto, RevisionDto } from './dto/cost.dto';
import {
  CostOperation,
  OperationReceipt,
  ValuationState,
} from './entities/cost.entity';
import { Item } from './entities/item.entity';
import { Stock } from './entities/stock.entity';
import { Movimiento } from './entities/movimiento.entity';
import { Proveedor } from './entities/proveedor.entity';
import { TipoMovimiento } from './enums';
import { STOCK_ALERT_PORT, StockAlertPort } from './ports';
import { publicarAlertaStock } from './stock-alert-emit';
import {
  ALERT_TYPE_ACTIVE_PORT,
  AlertTypeActivePort,
} from '../alert-catalog/ports';

@Injectable()
export class InventoryCostsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @Optional()
    @Inject(STOCK_ALERT_PORT)
    private readonly alerts?: StockAlertPort,
    @Optional()
    @Inject(ALERT_TYPE_ACTIVE_PORT)
    private readonly alertTypes?: AlertTypeActivePort,
  ) {}
  private readonly logger = new Logger(InventoryCostsService.name);
  private async emitStock(
    itemId: string,
    prevQty: number,
    nextQty: number,
    eventId: string,
  ) {
    try {
      const [item, stock] = await Promise.all([
        this.db.getRepository(Item).findOneByOrFail({ id: itemId }),
        this.db.getRepository(Stock).findOneByOrFail({ itemId }),
      ]);
      await publicarAlertaStock(
        this.alerts,
        {
          eventId,
          occurredAt: new Date(),
          itemId,
          sku: item.sku,
          prevQty,
          nextQty,
          prevMin: stock.minQty,
          nextMin: stock.minQty,
          prevCritical: stock.criticalQty,
          nextCritical: stock.criticalQty,
        },
        this.alertTypes,
      );
    } catch {
      this.logger.error(`Stock notification pending for operation ${eventId}`);
    }
  }
  get enabled() {
    return inventoryCostsEnabled();
  }
  authorize(actor: TrustedActor, admin = false) {
    if (!this.enabled)
      throw new ServiceUnavailableException(
        'Los costos de refacciones aún no están habilitados.',
      );
    validateActor(actor, process.env.NODE_ENV);
    if (
      !actor.roles.some(
        (r) => r === Rol.ADMIN_DIRECTIVO || (!admin && r === Rol.SUPERVISOR),
      )
    )
      throw new ForbiddenException(
        'No tiene permiso para esta operación de costos.',
      );
  }
  private async command(
    actor: TrustedActor,
    key: string,
    payload: unknown,
    work: (m: EntityManager) => Promise<Record<string, unknown>>,
    admin = false,
  ) {
    this.authorize(actor, admin);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key ?? '',
      )
    )
      throw new BadRequestException('Se requiere una clave de operación UUID.');
    const identity = createHash('sha256')
      .update(actor.subject + ':' + key)
      .digest('hex');
    const canonical = (v: unknown): unknown =>
      Array.isArray(v)
        ? v.map(canonical)
        : v && typeof v === 'object'
          ? Object.fromEntries(
              Object.entries(v)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, x]) => [k, canonical(x)]),
            )
          : v;
    const hash = createHash('sha256')
      .update(JSON.stringify(canonical(payload)))
      .digest('hex');
    return this.db.transaction(async (m) => {
      await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [identity]);
      const old = await m.findOneBy(OperationReceipt, { identity });
      if (old) {
        if (old.hash !== hash)
          throw new ConflictException(
            'La clave ya se utilizó con otros datos.',
          );
        return old.result;
      }
      const result = await work(m);
      await m.save(OperationReceipt, { identity, hash, result });
      return result;
    });
  }
  private async locked(
    m: EntityManager,
    itemId: string,
    quantityBefore?: number,
  ) {
    const stock = await m.findOne(Stock, {
      where: { itemId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!stock)
      throw new NotFoundException(
        'No se encontró la existencia de la refacción.',
      );
    let state = await m.findOneBy(ValuationState, { itemId });
    const expected = quantityBefore ?? stock.qty;
    if (!state)
      state = m.create(ValuationState, {
        itemId,
        valueCents: expected === 0 ? '0' : null,
        version: 0,
        cutAt: null,
        quantityAtCost: expected,
      });
    if (state.quantityAtCost !== expected) {
      state.valueCents = expected === 0 ? '0' : null;
      state.quantityAtCost = expected;
    }
    return { stock, state };
  }
  private async supplier(m: EntityManager, id: string) {
    const s = await m.findOneBy(Proveedor, { id });
    if (!s || !s.activo)
      throw new BadRequestException('Seleccione un proveedor activo.');
    return s;
  }
  private operation(m: EntityManager, data: Partial<CostOperation>) {
    return m.create(CostOperation, {
      id: randomUUID(),
      visitaId: null,
      unidadId: null,
      supplierId: null,
      supplierName: null,
      reference: null,
      money: null,
      netCents: null,
      revisions: [],
      version: 1,
      reason: null,
      sourceId: null,
      effectiveAt: new Date(),
      ...data,
    });
  }
  async receive(input: ReceiptDto, actor: TrustedActor, key: string) {
    const money = calculateCost(input.cost);
    const result = await this.command(
      actor,
      key,
      { action: 'receive', ...input },
      async (m) => {
        const supplier = await this.supplier(m, input.supplierId);
        const { stock, state } = await this.locked(m, input.itemId);
        const item = await m.findOneByOrFail(Item, { id: input.itemId });
        if (!item.activo)
          throw new BadRequestException('La refacción está inactiva.');
        stock.qty += input.qty;
        if (!Number.isSafeInteger(stock.qty) || stock.qty > 2147483647)
          throw new BadRequestException('Cantidad fuera de rango.');
        state.valueCents =
          state.valueCents != null && money
            ? (BigInt(state.valueCents) + BigInt(money.netCents)).toString()
            : null;
        state.version++;
        state.quantityAtCost = stock.qty;
        await m.save(Stock, stock);
        await m.save(ValuationState, state);
        const op = await m.save(
          this.operation(m, {
            kind: 'RECEIPT',
            qty: input.qty,
            itemId: input.itemId,
            money,
            netCents: money?.netCents ?? null,
            supplierId: supplier.id,
            supplierName: supplier.nombre,
            reference: input.documentReference ?? null,
            reason: input.note ?? null,
            actor: actor.subject,
          }),
        );
        await m.save(Movimiento, {
          id: op.id,
          tipo: TipoMovimiento.ENTRADA,
          item: { id: input.itemId },
          qty: input.qty,
          delta: input.qty,
          nota: input.note ?? null,
          createdBy: actor.subject,
          visitaId: null,
        });
        return { operation: op, quantityAfter: stock.qty, valuation: state };
      },
    );
    await this.emitStock(
      input.itemId,
      Number(result.quantityAfter) - input.qty,
      Number(result.quantityAfter),
      (result.operation as CostOperation).id,
    );
    return result;
  }
  /** Called within the existing stock transaction, after its physical delta. */
  async recordDelta(
    m: EntityManager,
    data: {
      itemId: string;
      before: number;
      delta: number;
      visitaId?: string | null;
      unidadId?: string | null;
      eventId?: string;
      at?: Date;
      actor?: string;
      reason?: string;
      kind?: string;
    },
  ) {
    const { state } = await this.locked(m, data.itemId, data.before);
    // A newly introduced state must use the quantity BEFORE the operation.
    if (state.version === 0) state.valueCents = data.before === 0 ? '0' : null;
    const net =
      data.delta < 0 && state.valueCents != null
        ? allocatedCost(state.valueCents, -data.delta, data.before)
        : null;
    state.valueCents =
      data.delta < 0 && state.valueCents != null && net != null
        ? (BigInt(state.valueCents) - BigInt(net)).toString()
        : null;
    if (data.before + data.delta === 0) state.valueCents = '0';
    state.version++;
    state.quantityAtCost = data.before + data.delta;
    await m.save(ValuationState, state);
    await m.save(
      this.operation(m, {
        kind: data.visitaId ? 'CONSUMPTION' : (data.kind ?? 'ADJUSTMENT'),
        qty: Math.abs(data.delta),
        itemId: data.itemId,
        visitaId: data.visitaId ?? null,
        unidadId: data.unidadId ?? null,
        sourceId: data.eventId ?? null,
        effectiveAt: data.at ?? new Date(),
        netCents: net,
        actor: data.actor ?? 'SYSTEM:CLOSE',
        reason: data.reason ?? null,
      }),
    );
  }
  async recordExternal(
    m: EntityManager,
    data: {
      itemId: string;
      qty: number;
      visitaId: string;
      unidadId: string;
      eventId: string;
      at: Date;
    },
  ) {
    await m.save(
      this.operation(m, {
        kind: 'EXTERNAL',
        itemId: data.itemId,
        qty: data.qty,
        visitaId: data.visitaId,
        unidadId: data.unidadId,
        sourceId: data.eventId,
        effectiveAt: data.at,
        actor: 'SYSTEM:CLOSE',
      }),
    );
  }
  async adjust(input: AjusteDto, actor: TrustedActor, key: string) {
    const result = await this.command(
      actor,
      key,
      { action: 'adjust', ...input },
      async (m) => {
        const { stock } = await this.locked(m, input.itemId),
          before = stock.qty;
        try {
          stock.qty = stockTrasMovimiento(before, input.qtyDelta);
        } catch {
          throw new BadRequestException(
            'El ajuste dejaría existencias negativas.',
          );
        }
        await m.save(Stock, stock);
        await m.save(Movimiento, {
          id: randomUUID(),
          tipo: TipoMovimiento.AJUSTE,
          item: { id: input.itemId },
          qty: Math.abs(input.qtyDelta),
          delta: input.qtyDelta,
          nota: input.nota,
          createdBy: actor.subject,
          visitaId: null,
        });
        await this.recordDelta(m, {
          itemId: input.itemId,
          before,
          delta: input.qtyDelta,
          actor: actor.subject,
          reason: input.nota,
          kind: 'ADJUSTMENT',
        });
        return { quantityAfter: stock.qty, eventId: randomUUID() };
      },
    );
    await this.emitStock(
      input.itemId,
      Number(result.quantityAfter) - input.qtyDelta,
      Number(result.quantityAfter),
      String(result.eventId),
    );
    return result;
  }
  async opening(
    itemId: string,
    input: OpeningDto,
    actor: TrustedActor,
    key: string,
  ) {
    const value = cents(input.valueCents);
    if (!input.reason.trim())
      throw new BadRequestException(
        'Indique motivo y referencia de la valoración.',
      );
    if (input.qty === 0 && value !== 0n)
      throw new BadRequestException('Sin existencias el valor debe ser cero.');
    return this.command(
      actor,
      key,
      { action: 'opening', itemId, ...input },
      async (m) => {
        const { stock, state } = await this.locked(m, itemId);
        if (stock.qty !== input.qty || state.version !== input.expectedVersion)
          throw new ConflictException(
            'Las existencias o su versión cambiaron. Revise el corte.',
          );
        state.valueCents = value.toString();
        state.version++;
        state.cutAt = new Date();
        state.quantityAtCost = stock.qty;
        await m.save(ValuationState, state);
        const op = await m.save(
          this.operation(m, {
            kind: 'OPENING',
            itemId,
            qty: stock.qty,
            netCents: value.toString(),
            actor: actor.subject,
            reason: input.reason,
          }),
        );
        return { operation: op, valuation: state, quantityAfter: stock.qty };
      },
      true,
    );
  }
  async revise(
    id: string,
    input: RevisionDto,
    actor: TrustedActor,
    key: string,
    correct = false,
  ) {
    const money = calculateCost(input.cost);
    if (!money || !input.reason.trim())
      throw new BadRequestException('Indique costo y motivo.');
    return this.command(
      actor,
      key,
      { action: correct ? 'correct' : 'complete', id, ...input },
      async (m) => {
        const seed = await m.findOneBy(CostOperation, { id });
        if (!seed) throw new NotFoundException('No se encontró el costo.');
        await this.locked(m, seed.itemId);
        const op = await m.findOne(CostOperation, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!op) throw new NotFoundException('No se encontró el costo.');
        if (op.version !== input.expectedVersion)
          throw new ConflictException('El costo cambió. Vuelva a consultarlo.');
        if (!['RECEIPT', 'CONSUMPTION', 'EXTERNAL'].includes(op.kind))
          throw new BadRequestException(
            'Esta operación requiere regularización de valoración.',
          );
        if (op.netCents != null && !correct)
          throw new ConflictException(
            'El importe ya existe; solicite corrección a Admin.',
          );
        if (op.kind === 'EXTERNAL' || op.kind === 'RECEIPT') {
          const supplier = await this.supplier(
            m,
            input.supplierId ?? op.supplierId ?? '',
          );
          op.supplierId = supplier.id;
          op.supplierName = supplier.nombre;
        }
        if (
          op.kind === 'CONSUMPTION' &&
          (await m.countBy(CostOperation, { kind: 'RETURN', sourceId: op.id }))
        )
          throw new ConflictException(
            'Este consumo tiene retornos. Requiere revisión de Admin antes de corregir su costo.',
          );
        op.revisions = [
          ...op.revisions,
          {
            actor: actor.subject,
            at: new Date().toISOString(),
            reason: input.reason,
            before: op.money,
            after: money,
            netBefore: op.netCents,
            netAfter: money.netCents,
          },
        ];
        op.money = money;
        op.netCents = money.netCents;
        op.version++;
        await m.save(CostOperation, op);
        if (op.kind === 'RECEIPT' || op.kind === 'CONSUMPTION') {
          const { state, stock } = await this.locked(m, op.itemId);
          if (!state.cutAt || op.effectiveAt >= state.cutAt) {
            state.valueCents = stock.qty === 0 ? '0' : null;
            state.version++;
            await m.save(ValuationState, state);
          }
        }
        return { operation: op };
      },
      correct,
    );
  }
  async returnFromOrder(
    id: string,
    input: ReturnDto,
    actor: TrustedActor,
    key: string,
  ) {
    if (!input.reason.trim())
      throw new BadRequestException('Indique el motivo del retorno.');
    const result = await this.command(
      actor,
      key,
      { action: 'return', id, ...input },
      async (m) => {
        const seed = await m.findOneBy(CostOperation, { id });
        if (!seed) throw new NotFoundException('No se encontró el consumo.');
        await this.locked(m, seed.itemId);
        const source = await m.findOne(CostOperation, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!source || source.kind !== 'CONSUMPTION')
          throw new BadRequestException('Seleccione un consumo desde almacén.');
        const prior = await m.findBy(CostOperation, {
          sourceId: id,
          kind: 'RETURN',
        });
        const returned = prior.reduce((n, x) => n + x.qty, 0);
        if (input.qty > source.qty - returned)
          throw new ConflictException(
            'El retorno supera la cantidad disponible del consumo.',
          );
        const known =
          source.netCents != null && prior.every((x) => x.netCents != null);
        const remaining = known
          ? (
              BigInt(source.netCents!) -
              prior.reduce((n, x) => n + BigInt(x.netCents!), 0n)
            ).toString()
          : null;
        const net =
          remaining == null
            ? null
            : allocatedCost(remaining, input.qty, source.qty - returned);
        const { stock, state } = await this.locked(m, source.itemId);
        stock.qty += input.qty;
        state.valueCents =
          state.valueCents != null && net != null
            ? (BigInt(state.valueCents) + BigInt(net)).toString()
            : null;
        state.version++;
        state.quantityAtCost = stock.qty;
        const op = await m.save(
          this.operation(m, {
            kind: 'RETURN',
            itemId: source.itemId,
            qty: input.qty,
            visitaId: source.visitaId,
            unidadId: source.unidadId,
            sourceId: id,
            netCents: net,
            actor: actor.subject,
            reason: input.reason,
          }),
        );
        await m.save(Stock, stock);
        await m.save(ValuationState, state);
        await m.save(Movimiento, {
          id: op.id,
          tipo: TipoMovimiento.AJUSTE,
          item: { id: source.itemId },
          qty: input.qty,
          delta: input.qty,
          visitaId: source.visitaId,
          nota: `Retorno: ${input.reason}`,
          createdBy: actor.subject,
        });
        return { operation: op, valuation: state, quantityAfter: stock.qty };
      },
    );
    await this.emitStock(
      (result.operation as CostOperation).itemId,
      Number(result.quantityAfter) - input.qty,
      Number(result.quantityAfter),
      (result.operation as CostOperation).id,
    );
    return result;
  }
  async detail(itemId: string, actor: TrustedActor) {
    this.authorize(actor);
    const stock = await this.db.getRepository(Stock).findOneBy({ itemId });
    if (!stock) throw new NotFoundException('No se encontró la refacción.');
    const state = await this.db
      .getRepository(ValuationState)
      .findOneBy({ itemId });
    const operations = await this.db
      .getRepository(CostOperation)
      .find({ where: { itemId }, order: { createdAt: 'DESC' }, take: 100 });
    if (state && state.quantityAtCost !== stock.qty)
      state.valueCents = stock.qty === 0 ? '0' : null;
    return {
      quantity: stock.qty,
      valuation: state ?? {
        itemId,
        valueCents: stock.qty === 0 ? '0' : null,
        version: 0,
        cutAt: null,
      },
      operations,
    };
  }
  async consumptions(
    actor: TrustedActor,
    unidadId?: string,
    visitaId?: string,
  ) {
    this.authorize(actor);
    if (!unidadId && !visitaId)
      throw new BadRequestException('Indique unidad u orden.');
    const qb = this.db
      .getRepository(CostOperation)
      .createQueryBuilder('cost')
      .where('cost.kind IN (:...kinds)', {
        kinds: ['CONSUMPTION', 'EXTERNAL', 'RETURN'],
      });
    if (unidadId) qb.andWhere('cost.unidadId = :unidadId', { unidadId });
    if (visitaId) qb.andWhere('cost.visitaId = :visitaId', { visitaId });
    return {
      currency: 'MXN',
      asOf: new Date().toISOString(),
      operations: await qb.orderBy('cost.effectiveAt', 'DESC').getMany(),
    };
  }
}
