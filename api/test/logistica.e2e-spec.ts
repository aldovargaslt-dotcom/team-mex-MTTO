import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import {
  MSG_CHOFER_INACTIVO,
  MSG_CHOFER_OCUPADO,
  MSG_INACTIVAR_ASIGNADO,
  MSG_UNIDAD_OCUPADA,
} from '../src/logistica/logistica-rules';
import {
  CHOFERES_DEMO,
  UNIDAD_ANDON_DEMO,
  UNIDAD_SEGUNDA_DEMO,
} from '../src/seed/catalogo-demo';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-log' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-log' };
const LOGISTICA = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'log-asig' };

type ChoferRow = {
  choferId: string;
  nombre: string;
  ops: 'DISPONIBLE' | 'EN_RUTA';
  unidadId?: string;
  placas?: string;
};

type ListBody = {
  items: ChoferRow[];
  kpis: { enRuta: number; disponibles: number; total: number };
};

describe('Logística asignación chofer↔unidad (e2e L1–L4)', () => {
  let app: INestApplication<App>;
  let server: App;
  let ds: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function unidad(numeroInterno: string) {
    const res = await request(server)
      .get('/unidades')
      .query({ numeroInterno })
      .set(LOGISTICA)
      .expect(200);
    const found = (
      res.body as {
        id: string;
        numeroInterno: string;
        placas: string;
        choferId: string | null;
      }[]
    ).find((u) => u.numeroInterno === numeroInterno);
    if (!found) throw new Error(`No se sembró ${numeroInterno}`);
    return found;
  }

  async function chofer(nombre: string) {
    const res = await request(server).get('/choferes').set(LOGISTICA).expect(200);
    const found = (res.body as { id: string; nombre: string }[]).find(
      (c) => c.nombre === nombre,
    );
    if (!found) throw new Error(`No se sembró ${nombre}`);
    return found;
  }

  async function list(query: Record<string, string> = {}) {
    const res = await request(server)
      .get('/logistica/choferes')
      .query(query)
      .set(LOGISTICA)
      .expect(200);
    return res.body as ListBody;
  }

  it('LOGISTICA y Admin entran; Supervisor 403', async () => {
    await request(server).get('/logistica/choferes').set(LOGISTICA).expect(200);
    await request(server).get('/logistica/choferes').set(ADMIN).expect(200);
    const denied = await request(server)
      .get('/logistica/choferes')
      .set(SUPERVISOR)
      .expect(403);
    expect(denied.body.message).toMatch(/supervisor/i);
  });

  it('L2 lista solo ACTIVO; INACTIVO no aparece; kpis ACTIVO', async () => {
    const body = await list();
    expect(body.kpis.total).toBe(CHOFERES_DEMO.length);
    expect(body.items).toHaveLength(CHOFERES_DEMO.length);
    expect(body.items.every((row) => row.ops === 'DISPONIBLE')).toBe(true);
    expect(body.kpis).toEqual({
      enRuta: 0,
      disponibles: CHOFERES_DEMO.length,
      total: CHOFERES_DEMO.length,
    });

    const inactivo = await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'Chofer Logística Inactivo' })
      .expect(201);
    await request(server)
      .patch(`/choferes/${inactivo.body.id}`)
      .set(ADMIN)
      .send({ estado: 'INACTIVO' })
      .expect(200);

    const after = await list();
    expect(after.items.some((r) => r.nombre === 'Chofer Logística Inactivo')).toBe(
      false,
    );
    expect(after.kpis.total).toBe(CHOFERES_DEMO.length);
  });

  it('L1 assign/unassign 1:0..1 y L4 escribe kernel sin outbox', async () => {
    const u1 = await unidad(UNIDAD_ANDON_DEMO);
    const u2 = await unidad(UNIDAD_SEGUNDA_DEMO);
    const wero = await chofer('WERO');
    const noe = await chofer('DON NOE');
    const outboxBefore = Number(
      (
        await ds.query(
          `SELECT count(*)::int AS n FROM outbox_events`,
        )
      )[0].n,
    );

    await request(server)
      .post('/logistica/asignaciones')
      .set(LOGISTICA)
      .send({ unidadId: u1.id, choferId: wero.id })
      .expect(204);

    const kernel = await request(server)
      .get(`/unidades/${u1.id}`)
      .set(LOGISTICA)
      .expect(200);
    expect(kernel.body.choferId).toBe(wero.id);

    const enRuta = await list({ chip: 'EN_RUTA' });
    expect(enRuta.items).toHaveLength(1);
    expect(enRuta.items[0]).toMatchObject({
      choferId: wero.id,
      nombre: 'WERO',
      ops: 'EN_RUTA',
      unidadId: u1.id,
      placas: u1.placas ?? kernel.body.placas,
    });
    expect(enRuta.kpis.enRuta).toBe(1);

    const q = await list({ q: 'wer' });
    expect(q.items.map((r) => r.nombre)).toEqual(['WERO']);

    const secondChofer = await request(server)
      .post('/logistica/asignaciones')
      .set(LOGISTICA)
      .send({ unidadId: u2.id, choferId: wero.id })
      .expect(400);
    expect(secondChofer.body.message).toBe(MSG_CHOFER_OCUPADO);

    const secondUnidad = await request(server)
      .post('/logistica/asignaciones')
      .set(LOGISTICA)
      .send({ unidadId: u1.id, choferId: noe.id })
      .expect(400);
    expect(secondUnidad.body.message).toBe(MSG_UNIDAD_OCUPADA);

    await request(server)
      .delete(`/logistica/asignaciones/${u1.id}`)
      .set(LOGISTICA)
      .expect(204);
    const after = await request(server)
      .get(`/unidades/${u1.id}`)
      .set(LOGISTICA)
      .expect(200);
    expect(after.body.choferId).toBeNull();

    const outboxAfter = Number(
      (
        await ds.query(
          `SELECT count(*)::int AS n FROM outbox_events`,
        )
      )[0].n,
    );
    expect(outboxAfter).toBe(outboxBefore);
  });

  it('L2 INACTIVO no se asigna; L3 soft-block al desactivar asignado', async () => {
    const u1 = await unidad(UNIDAD_ANDON_DEMO);
    const created = await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'Chofer Soft Block' })
      .expect(201);
    await request(server)
      .patch(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .send({ estado: 'INACTIVO' })
      .expect(200);

    const inactive = await request(server)
      .post('/logistica/asignaciones')
      .set(LOGISTICA)
      .send({ unidadId: u1.id, choferId: created.body.id })
      .expect(400);
    expect(inactive.body.message).toBe(MSG_CHOFER_INACTIVO);

    await request(server)
      .patch(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .send({ estado: 'ACTIVO' })
      .expect(200);
    await request(server)
      .post('/logistica/asignaciones')
      .set(LOGISTICA)
      .send({ unidadId: u1.id, choferId: created.body.id })
      .expect(204);

    const blocked = await request(server)
      .patch(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .send({ estado: 'INACTIVO' })
      .expect(400);
    expect(blocked.body.message).toBe(MSG_INACTIVAR_ASIGNADO);

    await request(server)
      .delete(`/logistica/asignaciones/${u1.id}`)
      .set(ADMIN)
      .expect(204);
    await request(server)
      .patch(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .send({ estado: 'INACTIVO' })
      .expect(200);
  });
});
