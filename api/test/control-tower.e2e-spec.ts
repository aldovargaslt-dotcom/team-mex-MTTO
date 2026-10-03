import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/auth/roles.enum';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { configureApp } from '../src/configure-app';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import { operationalDay } from '../src/visitas/checks/facility-calendar';

const LEGACY_ADMIN = {
  'X-Role': 'ADMIN_DIRECTIVO',
  'X-User-Id': 'admin-tower',
};
const LEGACY_LOGISTICS = {
  'X-Role': 'LOGISTICA',
  'X-User-Id': 'logistics-tower',
};
const ADMIN = { Authorization: 'Bearer admin' };
const LOGISTICS = { Authorization: 'Bearer logistics' };
const MECHANIC = { Authorization: 'Bearer mechanic' };
const FOREIGN = { Authorization: 'Bearer foreign' };
const baseActor: TrustedActor = {
  subject: 'trusted|tower',
  displayName: 'Tower fixture',
  roles: [Rol.LOGISTICA],
  facilityScopes: ['tower-mex'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const actors: Record<string, TrustedActor> = {
  admin: {
    ...baseActor,
    subject: 'trusted|admin',
    roles: [Rol.ADMIN_DIRECTIVO],
  },
  logistics: baseActor,
  mechanic: {
    ...baseActor,
    subject: 'trusted|mechanic',
    roles: [Rol.MECANICO],
  },
  foreign: {
    ...baseActor,
    subject: 'trusted|foreign',
    facilityScopes: ['elsewhere'],
  },
};

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe('EWO-021 vehicle documents and Control Tower (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let unidadId: string;
  const operationalDate = operationalDay(new Date()).operationalDate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) =>
          actors[req.headers.authorization?.replace('Bearer ', '')] ?? null,
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);

    await db.getRepository(Facility).save({
      id: 'tower-mex',
      name: 'Tower test facility',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    const type = (
      await db.query('SELECT id FROM tipos_vehiculo ORDER BY id LIMIT 1')
    )[0].id;
    const created = await request(app.getHttpServer())
      .post('/unidades')
      .set(LEGACY_ADMIN)
      .send({
        numeroInterno: `TWR-${Date.now()}`,
        placas: `TW-${String(Date.now()).slice(-6)}`,
        tipoId: type,
      })
      .expect(201);
    unidadId = created.body.id;
    await db.getRepository(VehicleFacility).save({
      unidadId,
      facilityId: 'tower-mex',
      version: 1,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('versions POLIZA_SEGURO append-only and rejects stale replacement', async () => {
    const first = await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(ADMIN)
      .send({
        expirationDate: shiftDate(operationalDate, 1),
        issuer: 'Aseguradora fixture',
      })
      .expect(201);
    expect(first.body).toMatchObject({ unidadId, version: 1, current: true });

    await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(ADMIN)
      .send({ expirationDate: shiftDate(operationalDate, 2) })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('DOCUMENT_VERSION_REQUIRED'),
      );

    await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(ADMIN)
      .send({
        expirationDate: shiftDate(operationalDate, 2),
        expectedVersion: 99,
      })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('DOCUMENT_VERSION_CONFLICT'),
      );

    const second = await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(ADMIN)
      .send({
        expirationDate: shiftDate(operationalDate, 2),
        expectedVersion: 1,
      })
      .expect(201);
    expect(second.body).toMatchObject({
      version: 2,
      current: true,
      supersedesId: first.body.id,
    });

    const current = await request(app.getHttpServer())
      .get(`/unidades/${unidadId}/documentos/poliza-seguro`)
      .set(LOGISTICS)
      .expect(200);
    expect(current.body).toMatchObject({ status: 'PRESENT_VALID', version: 2 });
    await request(app.getHttpServer())
      .get(`/unidades/${unidadId}/documentos/poliza-seguro`)
      .set(MECHANIC)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/unidades/${unidadId}/documentos/poliza-seguro`)
      .set(FOREIGN)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(LOGISTICS)
      .send({
        expirationDate: shiftDate(operationalDate, 3),
        expectedVersion: 2,
      })
      .expect(403);
    expect(
      (
        await db.query(
          `SELECT count(*)::int AS n FROM vehicle_documents.document_versions
         WHERE unidad_id=$1`,
          [unidadId],
        )
      )[0].n,
    ).toBe(2);
  });

  it('composes physical/readiness/check/urgency independently from batch sources', async () => {
    const initial = await request(app.getHttpServer())
      .get('/logistica/torre-control')
      .set(LOGISTICS)
      .expect(200);
    const initialRow = initial.body.items.find(
      (row: { unidadId: string }) => row.unidadId === unidadId,
    );
    expect(initialRow).toMatchObject({
      physicalState: null,
      readiness: 'BLOQUEADA',
      checkState: 'REQUERIDO',
      urgency: 'CRITICAL',
    });
    const foreign = await request(app.getHttpServer())
      .get('/logistica/torre-control')
      .set(FOREIGN)
      .expect(200);
    expect(foreign.body).toMatchObject({ items: [], counts: { total: 0 } });

    await request(app.getHttpServer())
      .post(`/flota/unidades/${unidadId}/estado-fisico`)
      .set(LEGACY_LOGISTICS)
      .send({ state: 'EN_TALLER', reason: 'Ingreso explícito a taller' })
      .expect(201);
    const workshop = await request(app.getHttpServer())
      .get('/logistica/torre-control')
      .query({ physicalState: 'EN_TALLER' })
      .set(LOGISTICS)
      .expect(200);
    expect(
      workshop.body.items.find(
        (row: { unidadId: string }) => row.unidadId === unidadId,
      ),
    ).toMatchObject({
      physicalState: 'EN_TALLER',
      physicalSource: 'FLOTA_TRANSITION',
      readiness: 'BLOQUEADA',
    });

    await request(app.getHttpServer())
      .post(`/flota/unidades/${unidadId}/estado-fisico`)
      .set(LEGACY_LOGISTICS)
      .send({ state: 'EN_PATIO', reason: 'Retorno explícito a patio' })
      .expect(201);
    const patio = await request(app.getHttpServer())
      .get('/logistica/torre-control')
      .query({ checkState: 'REQUERIDO', urgency: 'ATTENTION' })
      .set(LOGISTICS)
      .expect(200);
    const patioRow = patio.body.items.find(
      (row: { unidadId: string }) => row.unidadId === unidadId,
    );
    expect(patioRow).toMatchObject({
      physicalState: 'EN_PATIO',
      readiness: 'PENDIENTE',
      checkState: 'REQUERIDO',
      urgency: 'ATTENTION',
    });
    expect(patio.body.counts.total).toBeGreaterThanOrEqual(1);
  });

  it('keeps Despachada while exposing invalid insurance as a critical cause', async () => {
    await request(app.getHttpServer())
      .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
      .set(ADMIN)
      .send({ expirationDate: operationalDate, expectedVersion: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/flota/unidades/${unidadId}/estado-fisico`)
      .set(LEGACY_LOGISTICS)
      .send({ state: 'EN_RUTA', reason: 'Salida física registrada' })
      .expect(201);
    await db.query(
      `UPDATE unidades SET ops_estado='EN_RUTA', salida_at=now() - interval '9 hours' WHERE id=$1`,
      [unidadId],
    );

    const response = await request(app.getHttpServer())
      .get('/logistica/torre-control')
      .query({ readiness: 'DESPACHADA', urgency: 'CRITICAL' })
      .set(LOGISTICS)
      .expect(200);
    const row = response.body.items.find(
      (item: { unidadId: string }) => item.unidadId === unidadId,
    );
    expect(row.readiness).toBe('DESPACHADA');
    expect(
      row.activeCauses.map((cause: { code: string }) => cause.code),
    ).toContain('INVALID_INSURANCE');
  });
});
