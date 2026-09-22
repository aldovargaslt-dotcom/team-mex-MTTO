import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-cat' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-cat' };
const LOGISTICA = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'log-cat' };

type CatalogRow = { code: string; family: string; active: boolean; label: string };

describe('Alert Catalog v0 (e2e K1–K6)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 without X-Role', async () => {
    await request(server).get('/configuracion/alertas').expect(401);
  });

  it('K1: list by role (seed BR-05)', async () => {
    const sup = await request(server)
      .get('/configuracion/alertas')
      .set(SUPERVISOR)
      .expect(200);
    const supCodes = (sup.body as CatalogRow[]).map((t) => t.code).sort();
    expect(supCodes).toEqual(['MTTO_VENCIDO', 'SALUD_UMBRAL', 'STOCK_BAJO']);

    const log = await request(server)
      .get('/configuracion/alertas')
      .set(LOGISTICA)
      .expect(200);
    expect((log.body as CatalogRow[]).map((t) => t.code)).toEqual([
      'FLOTA_SIN_REGRESO',
    ]);

    const adm = await request(server)
      .get('/configuracion/alertas')
      .set(ADMIN)
      .expect(200);
    expect((adm.body as CatalogRow[]).map((t) => t.code).sort()).toEqual([
      'FLOTA_SIN_REGRESO',
      'MTTO_VENCIDO',
      'SALUD_UMBRAL',
      'STOCK_BAJO',
    ]);
  });

  it('K2: Supervisor cannot create or deactivate', async () => {
    await request(server)
      .post('/configuracion/alertas')
      .set(SUPERVISOR)
      .send({
        code: 'MTTO_EXTRA',
        label: 'Extra',
        family: 'MTTO',
        owningModule: 'OTRO',
        thresholdMode: 'MODULE',
      })
      .expect(403);
    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO')
      .set(SUPERVISOR)
      .send({ active: false })
      .expect(403);
    await request(server)
      .post('/configuracion/alertas')
      .set(LOGISTICA)
      .send({
        code: 'FLOTA_EXTRA',
        label: 'Extra',
        family: 'FLOTA',
        owningModule: 'ALERTAS',
        thresholdMode: 'CATALOG',
      })
      .expect(403);
  });

  it('K3: swimlane 403/404 on the other family', async () => {
    await request(server)
      .patch('/configuracion/alertas/FLOTA_SIN_REGRESO/umbrales')
      .set(SUPERVISOR)
      .send({ localH: 3 })
      .expect(403);
    await request(server)
      .get('/configuracion/alertas/FLOTA_SIN_REGRESO')
      .set(SUPERVISOR)
      .expect(404);
    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO/umbrales')
      .set(LOGISTICA)
      .send({ umbrales: [] })
      .expect(403);
    await request(server)
      .patch('/configuracion/alertas/STOCK_BAJO/umbrales')
      .set(LOGISTICA)
      .send({
        items: [
          {
            itemId: '11111111-1111-4111-8111-111111111111',
            minQty: 1,
          },
        ],
      })
      .expect(403);
    await request(server)
      .patch('/configuracion/alertas/SALUD_UMBRAL/umbrales')
      .set(LOGISTICA)
      .send({ alertThreshold: 50 })
      .expect(403);
  });

  it('K4: Admin create + deactivate; WO- rejected', async () => {
    const wo = await request(server)
      .post('/configuracion/alertas')
      .set(ADMIN)
      .send({
        code: 'WO-VISITA',
        label: 'No',
        family: 'MTTO',
        owningModule: 'OTRO',
        thresholdMode: 'MODULE',
      })
      .expect(400);
    expect(wo.body.message).toMatch(/WO-/);

    const created = await request(server)
      .post('/configuracion/alertas')
      .set(ADMIN)
      .send({
        code: 'MTTO_EXTRA',
        label: 'Revisión especial',
        family: 'MTTO',
        owningModule: 'OTRO',
        thresholdMode: 'MODULE',
      })
      .expect(201);
    expect(created.body.code).toBe('MTTO_EXTRA');

    const supAfterCreate = await request(server)
      .get('/configuracion/alertas')
      .set(SUPERVISOR)
      .expect(200);
    expect(
      (supAfterCreate.body as CatalogRow[]).map((t) => t.code),
    ).toContain('MTTO_EXTRA');

    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO')
      .set(ADMIN)
      .send({ active: false })
      .expect(200);

    const sup = await request(server)
      .get('/configuracion/alertas')
      .set(SUPERVISOR)
      .expect(200);
    expect((sup.body as CatalogRow[]).map((t) => t.code)).not.toContain(
      'MTTO_VENCIDO',
    );

    const adm = await request(server)
      .get('/configuracion/alertas')
      .set(ADMIN)
      .expect(200);
    const vencido = (adm.body as CatalogRow[]).find(
      (t) => t.code === 'MTTO_VENCIDO',
    );
    expect(vencido?.active).toBe(false);

    await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO')
      .set(ADMIN)
      .send({ active: true })
      .expect(200);
  });

  it('K6: Logística PATCH sin-regreso via catalog persists in schema alertas', async () => {
    const patched = await request(server)
      .patch('/configuracion/alertas/FLOTA_SIN_REGRESO/umbrales')
      .set(LOGISTICA)
      .send({ localH: 6, foraneoH: 20 })
      .expect(200);
    expect(patched.body.sinRegreso.localH).toBe(6);
    expect(patched.body.sinRegreso.foraneoH).toBe(20);

    const viaLogistica = await request(server)
      .get('/logistica/alertas/sin-regreso')
      .set(LOGISTICA)
      .expect(200);
    expect(viaLogistica.body.localH).toBe(6);
    expect(viaLogistica.body.foraneoH).toBe(20);
  });

  it('AC-05: Supervisor PATCH Andon km/días via catalog', async () => {
    const current = await request(server)
      .get('/configuracion/alertas/MTTO_VENCIDO/umbrales')
      .set(SUPERVISOR)
      .expect(200);
    const first = (
      current.body.umbrales as {
        tipoVehiculoId: string;
        tKm: number;
        tDias: number;
      }[]
    )[0];
    expect(first).toBeTruthy();
    const saved = await request(server)
      .patch('/configuracion/alertas/MTTO_VENCIDO/umbrales')
      .set(SUPERVISOR)
      .send({
        umbrales: [
          {
            tipoVehiculoId: first.tipoVehiculoId,
            tKm: 8000,
            tDias: 60,
          },
        ],
      })
      .expect(200);
    const row = (
      saved.body.umbrales as { tipoVehiculoId: string; tKm: number }[]
    ).find((u) => u.tipoVehiculoId === first.tipoVehiculoId);
    expect(row?.tKm).toBe(8000);
  });

  it('K5: inactive STOCK_BAJO does not ingest new inbox items', async () => {
    const familia = await request(server)
      .post('/inventario/familias')
      .set(SUPERVISOR)
      .send({ nombre: 'Catálogo gate' })
      .expect(201);
    const item = await request(server)
      .post('/inventario/items')
      .set(ADMIN)
      .send({
        sku: 'CAT-GATE-01',
        nombre: 'Junta catálogo',
        familiaId: familia.body.id,
      })
      .expect(201);
    await request(server)
      .post('/inventario/movimientos/entrada')
      .set(SUPERVISOR)
      .send({ itemId: item.body.id, qty: 4 })
      .expect(201);

    await request(server)
      .patch('/configuracion/alertas/STOCK_BAJO')
      .set(ADMIN)
      .send({ active: false })
      .expect(200);

    await request(server)
      .patch(`/inventario/items/${item.body.id}`)
      .set(SUPERVISOR)
      .send({ minQty: 5 })
      .expect(200);

    const inbox = await request(server)
      .get('/notifications')
      .query({ filter: 'all' })
      .set(SUPERVISOR)
      .expect(200);
    const alert = (
      inbox.body as { title: string; subjectRef: string | null }[]
    ).find((n) => n.subjectRef === item.body.id);
    expect(alert).toBeUndefined();

    await request(server)
      .patch('/configuracion/alertas/STOCK_BAJO')
      .set(ADMIN)
      .send({ active: true })
      .expect(200);
  });

  it('AC-12: schemas not merged', async () => {
    const ds = app.get(DataSource);
    const names = (
      await ds.query(
        `SELECT nspname FROM pg_namespace WHERE nspname IN ('andon','notifications','alertas','alert_catalog','inventario','salud')`,
      )
    ).map((r: { nspname: string }) => r.nspname);
    expect(names.sort()).toEqual([
      'alert_catalog',
      'alertas',
      'andon',
      'inventario',
      'notifications',
      'salud',
    ]);
  });
});
