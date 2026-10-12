import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { InventarioService } from '../src/inventario/inventario.service';
import { AndonService } from '../src/andon/andon.service';
import { PendienteComprobante } from '../src/inventario/entities/pendiente-comprobante.entity';
import { Item } from '../src/inventario/entities/item.entity';
import { AlertTypeEntity } from '../src/alert-catalog/entities/alert-type.entity';
import { ThresholdChangeEntity } from '../src/alert-catalog/entities/threshold-change.entity';
import { AlertAttentionPriority1791676800001 } from '../src/db/migrations/1791676800001-AlertAttentionPriority';
import { EstadoPendiente } from '../src/inventario/enums';
import type { AttentionResponse } from '../src/alert-catalog/attention.types';

const SUP = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'attention-supervisor' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'attention-admin' };
const LOG = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'attention-logistica' };

describe('Inicio por condiciones activas — AC01–06', () => {
  let app: INestApplication<App>;
  let server: App;
  let db: DataSource;
  let typeId: string;
  let unitId: string;
  let itemId: string;
  let secondItemId: string;
  let purchaseId: string;

  const getAttention = async () =>
    (
      await request(server)
        .get('/configuracion/alertas/activas')
        .set(SUP)
        .expect(200)
    ).body as AttentionResponse;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
    db = app.get(DataSource);
    // Ensayar migración aditiva desde forma legacy en esta base descartable.
    const legacyIntervals = await db.query(
      'SELECT tipo_vehiculo_id, t_km, t_dias FROM andon.umbrales ORDER BY tipo_vehiculo_id',
    );
    const legacyMinimums = await db.query(
      'SELECT item_id, min_qty FROM inventario.stock ORDER BY item_id',
    );
    await db.query(
      'ALTER TABLE andon.umbrales DROP COLUMN critical_overdue_km, DROP COLUMN critical_overdue_days',
    );
    await db.query('ALTER TABLE inventario.stock DROP COLUMN critical_qty');
    await db.query('DROP TABLE alert_catalog.threshold_change');
    const runner = db.createQueryRunner();
    await runner.startTransaction();
    try {
      await new AlertAttentionPriority1791676800001().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    expect(
      await db.query(
        'SELECT tipo_vehiculo_id, t_km, t_dias FROM andon.umbrales ORDER BY tipo_vehiculo_id',
      ),
    ).toEqual(legacyIntervals);
    expect(
      await db.query(
        'SELECT item_id, min_qty FROM inventario.stock ORDER BY item_id',
      ),
    ).toEqual(legacyMinimums);
    const type = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: 'ATTENTION-TEST' })
      .expect(201);
    typeId = type.body.id;
    const unit = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'ATT-001',
        placas: 'ATT-001',
        tipoId: typeId,
        marcaModelo: 'FOTON',
      })
      .expect(201);
    unitId = unit.body.id;
    await app
      .get(AndonService)
      .alignLastClosed({
        unidadId: unitId,
        tipoVehiculoId: typeId,
        visitaId: randomUUID(),
        km: 100,
        cerradoAt: new Date(Date.now() - 120 * 86400000).toISOString(),
      });
    const family = await request(server)
      .post('/inventario/familias')
      .set(ADMIN)
      .send({ nombre: 'ATTENTION-TEST' })
      .expect(201);
    for (const sku of ['ATT-01', 'ATT-02']) {
      const item = await request(server)
        .post('/inventario/items')
        .set(SUP)
        .send({
          sku,
          nombre: `Refacción ${sku}`,
          familiaId: family.body.id,
          minQty: 5,
        })
        .expect(201);
      if (sku === 'ATT-01') itemId = item.body.id;
      else secondItemId = item.body.id;
      await request(server)
        .post('/inventario/movimientos/entrada')
        .set(SUP)
        .send({ itemId: item.body.id, qty: 2 })
        .expect(201);
    }
    const repo = db.getRepository(PendienteComprobante);
    const purchase = await repo.save(
      repo.create({
        visitaId: randomUUID(),
        item: { id: itemId } as Item,
        qty: 1,
        estado: EstadoPendiente.PENDIENTE,
        ticketDataUrl: null,
      }),
    );
    purchaseId = purchase.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('restringe cola a Supervisor/Admin y configuración mantiene swimlane', async () => {
    await request(server).get('/configuracion/alertas/activas').expect(401);
    await request(server)
      .get('/configuracion/alertas/activas')
      .set(LOG)
      .expect(403);
    await request(server)
      .post('/configuracion/alertas/MTTO_VENCIDO/umbrales/preview')
      .set(LOG)
      .send({ umbrales: [] })
      .expect(404);
    await request(server)
      .get('/configuracion/alertas/activas')
      .set(ADMIN)
      .expect(200);
  });

  it('prioridades actuales, identificadores distintos y deeplinks concretos; sin Salud', async () => {
    const data = await getAttention();
    expect(data.sources.every((source) => source.status === 'ok')).toBe(true);
    expect(new Set(data.items.map((row) => row.id)).size).toBe(
      data.items.length,
    );
    expect(
      data.items.find((row) => row.id === `maintenance:${unitId}`),
    ).toMatchObject({
      severity: 'CRITICAL',
      area: 'FLOTA',
      href: `/unidades/${unitId}?vista=mantenimiento`,
    });
    expect(
      data.items.find((row) => row.id === `stock:${itemId}`),
    ).toMatchObject({
      severity: 'WARNING',
      href: `/inventario/stock?itemId=${itemId}`,
    });
    expect(
      data.items.find((row) => row.id === `purchase:${purchaseId}`),
    ).toMatchObject({
      severity: 'WARNING',
      detail: 'Comprobante de compra pendiente',
    });
    expect(data.items.every((row) => row.kind !== ('health' as string))).toBe(
      true,
    );
  });

  it('fallo parcial no significa cero ni oculta mantenimiento/compras disponibles', async () => {
    const failing = jest
      .spyOn(app.get(InventarioService), 'listStock')
      .mockRejectedValueOnce(new Error('source unavailable'));
    const data = await getAttention();
    expect(data.sources.find((source) => source.id === 'stock')?.status).toBe(
      'error',
    );
    expect(data.items.some((row) => row.id === `maintenance:${unitId}`)).toBe(
      true,
    );
    expect(data.items.some((row) => row.id === `purchase:${purchaseId}`)).toBe(
      true,
    );
    failing.mockRestore();
  });

  it('marcar inbox como leído no cierra condición ni cambia el conteo', async () => {
    const before = await getAttention();
    const inbox = await request(server)
      .get('/notifications?filter=all')
      .set(SUP)
      .expect(200);
    const notice = inbox.body.find(
      (row: { subjectRef: string }) => row.subjectRef === unitId,
    );
    await request(server)
      .post(`/notifications/${notice.id}/read`)
      .set(SUP)
      .expect(201);
    const after = await getAttention();
    expect(after.items.map((row) => row.id)).toEqual(
      before.items.map((row) => row.id),
    );
  });

  it('preview muestra un cierre y no cambia configuración, avisos ni auditoría', async () => {
    const audits = await db.getRepository(ThresholdChangeEntity).count();
    const before = await getAttention();
    const preview = await request(server)
      .post('/configuracion/alertas/MTTO_VENCIDO/umbrales/preview')
      .set(SUP)
      .send({
        umbrales: [
          {
            tipoVehiculoId: typeId,
            tKm: 10000,
            tDias: 150,
            criticalOverdueDays: 30,
            criticalOverdueKm: 1000,
          },
        ],
      })
      .expect(201);
    expect(preview.body.closed).toBe(1);
    expect(await db.getRepository(ThresholdChangeEntity).count()).toBe(audits);
    expect((await getAttention()).items.map((row) => row.id)).toEqual(
      before.items.map((row) => row.id),
    );
    const cfg = await request(server)
      .get('/andon/umbrales')
      .set(SUP)
      .expect(200);
    expect(
      cfg.body.find(
        (row: { tipoVehiculoId: string }) => row.tipoVehiculoId === typeId,
      ).tDias,
    ).toBe(90);
  });

  it('confirmar regla retira condición, audita actor y no registra visita ficticia', async () => {
    const last = await app.get(AndonService).getLastClosed(unitId);
    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO/umbrales')
      .set(SUP)
      .send({
        umbrales: [
          {
            tipoVehiculoId: typeId,
            tKm: 10000,
            tDias: 150,
            criticalOverdueDays: 30,
            criticalOverdueKm: 1000,
          },
        ],
      })
      .expect(200);
    expect(
      (await getAttention()).items.some(
        (row) => row.id === `maintenance:${unitId}`,
      ),
    ).toBe(false);
    expect(await app.get(AndonService).getLastClosed(unitId)).toEqual(last);
    const resolved = await request(server)
      .get(`/andon/avisos?unidadId=${unitId}&estado=RESUELTO`)
      .set(SUP)
      .expect(200);
    expect(resolved.body[0].visitaResolutoriaId).toBeNull();
    const audit = await db
      .getRepository(ThresholdChangeEntity)
      .findOneByOrFail({ code: 'MTTO_VENCIDO' });
    expect(audit.actorId).toBe('attention-supervisor');
    expect(audit.actorRole).toBe('SUPERVISOR');
    expect(audit.after).toMatchObject({ changes: [{ tDias: 150 }] });
  });

  it('stock cambia de prioridad al ajustar sólo crítico; reabastecer retira alerta', async () => {
    const preview = await request(server)
      .post('/configuracion/alertas/STOCK_BAJO/umbrales/preview')
      .set(SUP)
      .send({ items: [{ itemId, minQty: 5, criticalQty: 2 }] })
      .expect(201);
    expect(preview.body.priorityChanged).toBe(1);
    await request(server)
      .patch('/configuracion/alertas/STOCK_BAJO/umbrales')
      .set(SUP)
      .send({ items: [{ itemId, minQty: 5, criticalQty: 2 }] })
      .expect(200);
    expect(
      (await getAttention()).items.find((row) => row.id === `stock:${itemId}`)
        ?.severity,
    ).toBe('CRITICAL');
    const inbox = await request(server)
      .get('/notifications?filter=all')
      .set(SUP)
      .expect(200);
    expect(
      inbox.body.find(
        (row: { subjectRef: string }) => row.subjectRef === itemId,
      ).severity,
    ).toBe('CRITICAL');
    await request(server)
      .post('/inventario/movimientos/entrada')
      .set(SUP)
      .send({ itemId, qty: 4 })
      .expect(201);
    expect(
      (await getAttention()).items.some((row) => row.id === `stock:${itemId}`),
    ).toBe(false);
  });

  it('lote inválido no deja configuración/auditoría parcial; fracciones/negativos se rechazan', async () => {
    const count = await db.getRepository(ThresholdChangeEntity).count();
    await request(server)
      .patch('/configuracion/alertas/STOCK_BAJO/umbrales')
      .set(SUP)
      .send({
        items: [
          { itemId, minQty: 7, criticalQty: 2 },
          { itemId: secondItemId, minQty: 5, criticalQty: 6 },
        ],
      })
      .expect(400);
    const cfg = await request(server)
      .get('/configuracion/alertas/STOCK_BAJO/umbrales')
      .set(SUP)
      .expect(200);
    expect(
      cfg.body.items.find((row: { itemId: string }) => row.itemId === itemId)
        .minQty,
    ).toBe(5);
    expect(await db.getRepository(ThresholdChangeEntity).count()).toBe(count);
    await request(server)
      .post('/configuracion/alertas/STOCK_BAJO/umbrales/preview')
      .set(SUP)
      .send({ items: [{ itemId, minQty: 5, criticalQty: -1 }] })
      .expect(400);
    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO/umbrales')
      .set(SUP)
      .send({
        umbrales: [
          {
            tipoVehiculoId: typeId,
            tKm: 10000,
            tDias: 150,
            criticalOverdueDays: 0.5,
          },
        ],
      })
      .expect(400);
  });

  it('comprobante adjunto elimina sólo su problema; conserva recepción independiente', async () => {
    await request(server)
      .post(`/inventario/pendientes-comprobante/${purchaseId}/ticket`)
      .set(SUP)
      .send({ dataUrl: 'data:image/png;base64,aGVsbG8=' })
      .expect(201);
    expect(
      (await getAttention()).items.some(
        (row) => row.id === `purchase:${purchaseId}`,
      ),
    ).toBe(false);
    const row = await db
      .getRepository(PendienteComprobante)
      .findOneByOrFail({ id: purchaseId });
    expect(row.estado).toBe(EstadoPendiente.PENDIENTE);
  });

  it('tipo desactivado no aparece en cola y no duplica otras condiciones', async () => {
    await db
      .getRepository(AlertTypeEntity)
      .update({ code: 'STOCK_BAJO' }, { active: false });
    expect(
      (await getAttention()).items.some((row) => row.kind === 'stock'),
    ).toBe(false);
  });
});
