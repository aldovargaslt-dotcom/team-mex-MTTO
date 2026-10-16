import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import { InventarioService } from '../src/inventario/inventario.service';
import { PendienteComprobante } from '../src/inventario/entities/pendiente-comprobante.entity';
import { DocumentAttachment } from '../src/inventario/entities/cost.entity';
import { EstadoPendiente } from '../src/inventario/enums';
import { InventoryCosts1792108800001 } from '../src/db/migrations/1792108800001-InventoryCosts';
import {
  OrigenConsumo,
  VISITA_CERRADA,
} from '../src/kernel/events/visita-cerrada';
const headers = (role = 'SUPERVISOR') => ({
  'X-Role': role,
  Authorization: `Bearer ${role}`,
});
const cost = (amount: string) => ({
  state: 'RECORDED',
  inputTotalCents: amount,
  taxMode: 'EXCLUDED',
  taxTreatment: 'TAXED',
  rateBps: 1600,
});
describe('Inventory costs: transaction, identity and history', () => {
  let app: INestApplication,
    db: DataSource,
    inv: InventarioService,
    supplier: string,
    family: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { header: (name: string) => string }) => {
          const token = req.header('authorization')?.replace('Bearer ', '');
          if (!['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA'].includes(token))
            return null;
          return {
            subject: token,
            displayName: token,
            roles: [token as Rol],
            facilityScopes: ['*'],
            authMode: 'TRUSTED',
            attributionLevel: 'SERVER_VERIFIED',
          };
        },
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    inv = app.get(InventarioService);
    family = (
      await request(app.getHttpServer())
        .get('/inventario/familias')
        .set(headers())
        .expect(200)
    ).body[0].id;
    supplier = (
      await request(app.getHttpServer())
        .post('/inventario/proveedores')
        .set(headers())
        .send({ nombre: 'COST-TEST Supplier' })
        .expect(201)
    ).body.id;
  });
  afterAll(async () => {
    await app?.close();
  });
  async function item() {
    return (
      await request(app.getHttpServer())
        .post('/inventario/items')
        .set(headers())
        .send({
          sku: `COST-${randomUUID().slice(0, 8)}`,
          nombre: 'Prueba de costos',
          familiaId: family,
        })
        .expect(201)
    ).body.id as string;
  }
  function receive(
    itemId: string,
    qty: number,
    amount: string | null,
    key = randomUUID(),
  ) {
    return request(app.getHttpServer())
      .post('/inventario/recepciones')
      .set(headers())
      .set('Idempotency-Key', key)
      .send({
        itemId,
        qty,
        supplierId: supplier,
        cost: amount == null ? { state: 'PENDING' } : cost(amount),
      });
  }
  async function detail(id: string) {
    return (
      await request(app.getHttpServer())
        .get(`/inventario/items/${id}/costos`)
        .set(headers())
        .expect(200)
    ).body;
  }
  async function consume(itemId: string, qty: number) {
    const payload = {
      eventId: randomUUID(),
      eventType: VISITA_CERRADA as typeof VISITA_CERRADA,
      visitaId: randomUUID(),
      unidadId: randomUUID(),
      tipoVehiculoId: randomUUID(),
      km: 100,
      cerradoAt: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
      consumos: [{ itemId, qty, origen: OrigenConsumo.DESDE_STOCK }],
    };
    await db.transaction((m) => inv.applyVisitaCerrada(payload, m));
    return payload;
  }
  it('computes weighted cost, applies close once and preserves historical snapshots', async () => {
    const id = await item();
    await receive(id, 10, '100000').expect(201);
    await receive(id, 10, '120000').expect(201);
    expect((await detail(id)).valuation.valueCents).toBe('220000');
    const payload = await consume(id, 3);
    let d = await detail(id);
    expect(d.quantity).toBe(17);
    expect(d.valuation.valueCents).toBe('187000');
    expect(
      d.operations.find((o: { kind: string }) => o.kind === 'CONSUMPTION')
        .netCents,
    ).toBe('33000');
    await db.transaction((m) => inv.applyVisitaCerrada(payload, m));
    expect((await detail(id)).quantity).toBe(17);
    await receive(id, 1, '50000').expect(201);
    d = await detail(id);
    expect(
      d.operations.find((o: { kind: string }) => o.kind === 'CONSUMPTION')
        .netCents,
    ).toBe('33000');
  });
  it('replays concurrent same-key receipts once and rejects changed payload', async () => {
    const id = await item(),
      key = randomUUID();
    const [a, b] = await Promise.all([
      receive(id, 2, '20000', key),
      receive(id, 2, '20000', key),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.operation.id).toBe(b.body.operation.id);
    expect((await detail(id)).quantity).toBe(2);
    await receive(id, 3, '20000', key).expect(409);
    expect((await detail(id)).quantity).toBe(2);
  });
  it('keeps missing costs pending and requires Admin for verified opening', async () => {
    const id = await item();
    await receive(id, 10, null).expect(201);
    await consume(id, 2);
    let d = await detail(id);
    expect(d.quantity).toBe(8);
    expect(d.valuation.valueCents).toBeNull();
    expect(
      d.operations.find((o: { kind: string }) => o.kind === 'CONSUMPTION')
        .netCents,
    ).toBeNull();
    const body = {
      qty: 8,
      valueCents: '80000',
      expectedVersion: d.valuation.version,
      reason: 'Conteo y apertura verificados',
    };
    await request(app.getHttpServer())
      .post(`/inventario/items/${id}/valoraciones/aperturas`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/inventario/items/${id}/valoraciones/aperturas`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(201);
    d = await detail(id);
    expect(d.valuation.valueCents).toBe('80000');
    expect(
      d.operations.find((o: { kind: string }) => o.kind === 'CONSUMPTION')
        .netCents,
    ).toBeNull();
  });
  it('distinguishes completion/correction, authorizes revisions and rejects stale versions', async () => {
    const id = await item(),
      receipt = await receive(id, 1, null).expect(201),
      op = receipt.body.operation;
    const body = {
      cost: cost('10000'),
      expectedVersion: op.version,
      reason: 'Importe confirmado',
      supplierId: supplier,
    };
    const revise = (
      action: string,
      role: string,
      version: number,
      amount = '10000',
    ) =>
      request(app.getHttpServer())
        .post(`/inventario/costos/${op.id}/${action}`)
        .set(headers(role))
        .set('Idempotency-Key', randomUUID())
        .send({ ...body, cost: cost(amount), expectedVersion: version });
    await revise('completar', 'SUPERVISOR', 1).expect(201);
    await revise('completar', 'SUPERVISOR', 2).expect(409);
    await revise('corregir', 'SUPERVISOR', 2).expect(403);
    await revise('corregir', 'ADMIN_DIRECTIVO', 1).expect(409);
    await revise('corregir', 'ADMIN_DIRECTIVO', 2, '11000').expect(201);
    const final = (await detail(id)).operations.find(
      (o: { id: string }) => o.id === op.id,
    );
    expect(final.revisions).toHaveLength(2);
    expect(final.netCents).toBe('11000');
  });
  it('returns historical cost with exact final residual and prevents over-return', async () => {
    const id = await item();
    await receive(id, 3, '100').expect(201);
    await consume(id, 2);
    const op = (await detail(id)).operations.find(
      (o: { kind: string }) => o.kind === 'CONSUMPTION',
    );
    expect(op.netCents).toBe('67');
    const ret = () =>
      request(app.getHttpServer())
        .post(`/inventario/costos/${op.id}/retornos`)
        .set(headers())
        .set('Idempotency-Key', randomUUID())
        .send({ qty: 1, reason: 'Pieza sin utilizar' });
    expect((await ret().expect(201)).body.operation.netCents).toBe('34');
    expect((await ret().expect(201)).body.operation.netCents).toBe('33');
    await ret().expect(409);
    expect((await detail(id)).valuation.valueCents).toBe('100');
  });
  it('rejects missing identity and roles without financial access', async () => {
    const id = await item();
    await request(app.getHttpServer())
      .get(`/inventario/items/${id}/costos`)
      .set('X-Role', 'SUPERVISOR')
      .expect(401);
    await request(app.getHttpServer())
      .get(`/inventario/items/${id}/costos`)
      .set(headers('LOGISTICA'))
      .expect(403);
  });
  it('allows audited attachments after receipt without changing cost or stock', async () => {
    const id = await item();
    const row = await db
      .getRepository(PendienteComprobante)
      .save({
        id: randomUUID(),
        item: { id },
        visitaId: randomUUID(),
        qty: 1,
        estado: EstadoPendiente.RECIBIDA,
        ticketDataUrl: null,
      });
    const url = `/inventario/pendientes-comprobante/${row.id}/ticket`,
      dataUrl = 'data:image/png;base64,aGVsbG8=';
    await request(app.getHttpServer())
      .post(url)
      .set(headers())
      .send({ dataUrl })
      .expect(201);
    await request(app.getHttpServer())
      .post(url)
      .set(headers())
      .send({ dataUrl })
      .expect(201);
    expect(
      await db.getRepository(DocumentAttachment).countBy({ pendingId: row.id }),
    ).toBe(1);
    expect((await detail(id)).quantity).toBe(0);
  });
  it('rehearses the additive migration within a rollback-only disposable transaction', async () => {
    const marker = 'migration-rehearsal-rollback';
    await expect(
      db.transaction(async (m) => {
        await m.query(
          'DROP TABLE inventario.document_attachments, inventario.operation_receipts, inventario.valuation_state, inventario.cost_operations',
        );
        await new InventoryCosts1792108800001().up(m.queryRunner!);
        expect(
          (await m.query('SELECT count(*) FROM inventario.cost_operations'))[0]
            .count,
        ).toBe('0');
        await new InventoryCosts1792108800001()
          .down()
          .catch((e) => expect(e.message).toContain('must not be dropped'));
        throw new Error(marker);
      }),
    ).rejects.toThrow(marker);
    expect(
      (await db.query('SELECT count(*) FROM inventario.cost_operations'))[0]
        .count,
    ).not.toBe('0');
  });
});
