import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-salud' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-salud' };
const LOGISTICA = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'log-salud' };

describe('Salud v0 (e2e H14 H15)', () => {
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

  async function u101Id(): Promise<string> {
    const unidades = await request(server)
      .get('/unidades')
      .query({ numeroInterno: 'U-101' })
      .set(SUPERVISOR)
      .expect(200);
    const u101 = (
      unidades.body as { id: string; numeroInterno: string }[]
    ).find((u) => u.numeroInterno === 'U-101');
    expect(u101).toBeTruthy();
    return u101!.id;
  }

  it('GET health: supervisor ve score 0–100 o No disponible; independiente de INACTIVA', async () => {
    const id = await u101Id();
    const res = await request(server)
      .get(`/unidades/${id}/health`)
      .set(SUPERVISOR)
      .expect(200);
    expect(res.body.unitId).toBe(id);
    if (res.body.available) {
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(100);
      expect(res.body.status).toMatch(
        /EXCELLENT|GOOD|ATTENTION|POOR|CRITICAL/,
      );
      expect(res.body.label).toBeTruthy();
    } else {
      expect(res.body.label).toBe('No disponible');
    }
    expect(res.body.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'maintenance' }),
        expect.objectContaining({ id: 'alerts' }),
        expect.objectContaining({ id: 'inspections' }),
      ]),
    );
  });

  it('H14 Admin PUT ok; Supervisor y LOGISTICA 403', async () => {
    const cfg = await request(server)
      .get('/salud/config')
      .set(ADMIN)
      .expect(200);
    expect(cfg.body.dimensions).toHaveLength(3);
    expect(cfg.body.alertThreshold).toBe(60);

    await request(server).get('/salud/config').set(SUPERVISOR).expect(403);
    await request(server).put('/salud/config').set(SUPERVISOR).expect(403);
    await request(server).put('/salud/config').set(LOGISTICA).expect(403);

    const invalid = await request(server)
      .put('/salud/config')
      .set(ADMIN)
      .send({
        dimensions: [
          { id: 'maintenance', weight: 50 },
          { id: 'alerts', weight: 50 },
          { id: 'inspections', weight: 20 },
        ],
        alertEnabled: true,
        alertThreshold: 60,
        recoveryThreshold: 65,
        alertSeverity: 'WARNING',
      })
      .expect(400);
    expect(String(invalid.body.message)).toMatch(/suman 120%/);

    const saved = await request(server)
      .put('/salud/config')
      .set(ADMIN)
      .send({
        dimensions: [
          { id: 'maintenance', weight: 50 },
          { id: 'alerts', weight: 30 },
          { id: 'inspections', weight: 20 },
        ],
        alertEnabled: true,
        alertThreshold: 60,
        recoveryThreshold: 65,
        alertSeverity: 'WARNING',
      })
      .expect(200);
    expect(saved.body.version).toBeGreaterThan(1);
    expect(saved.body.isActive).toBe(true);

    const versions = await request(server)
      .get('/salud/config/versions')
      .set(ADMIN)
      .expect(200);
    expect((versions.body as { isActive: boolean }[]).filter((v) => v.isActive)).toHaveLength(
      1,
    );
  });

  it('H15 cero filas de salud en schema andon', async () => {
    const ds = app.get(DataSource);
    const schemas: { nspname: string }[] = await ds.query(
      `SELECT nspname FROM pg_namespace WHERE nspname = 'salud'`,
    );
    expect(schemas).toHaveLength(1);
    const leaked: { count: string }[] = await ds.query(
      `SELECT count(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema = 'andon' AND table_name LIKE '%health%'`,
    );
    expect(leaked[0].count).toBe('0');
  });
});
