import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import { MaintenanceOrderOpening1791763200001 } from '../src/db/migrations/1791763200001-MaintenanceOrderOpening';

const actor: TrustedActor = {
  subject: 'trusted|mechanic',
  displayName: 'Mecánico',
  roles: [Rol.MECANICO],
  facilityScopes: ['mex'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const actors: Record<string, TrustedActor> = {
  mechanic: actor,
  supervisor: {
    ...actor,
    subject: 'trusted|supervisor',
    roles: [Rol.SUPERVISOR],
  },
  logistics: { ...actor, roles: [Rol.LOGISTICA] },
  admin: { ...actor, roles: [Rol.ADMIN_DIRECTIVO] },
  foreign: { ...actor, facilityScopes: ['other'] },
};
describe('EWO032 maintenance opening and mechanic queue', () => {
  let app: INestApplication, db: DataSource, vehicle: string, driver: string;
  let n = 0;
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
      id: 'mex',
      name: 'Test',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    driver = (await db.query('SELECT id FROM choferes LIMIT 1'))[0].id;
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  beforeEach(async () => {
    const type = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0]
      .id;
    vehicle = (
      await request(app.getHttpServer())
        .post('/unidades')
        .set('X-Role', 'ADMIN_DIRECTIVO')
        .send({
          numeroInterno: `OPEN-${++n}`,
          placas: `OPEN-${n}`,
          tipoId: type,
        })
        .expect(201)
    ).body.id;
    await db
      .getRepository(VehicleFacility)
      .save({ unidadId: vehicle, facilityId: 'mex', version: 1 });
  });
  const maintenance = () =>
    request(app.getHttpServer())
      .post(`/unidades/${vehicle}/mantenimiento-ordenes`)
      .set('Authorization', 'Bearer supervisor')
      .send({
        type: 'CORRECTIVE',
        choferId: driver,
        km: 100,
        blocksOperation: false,
      });
  const open = (id: string, token = 'mechanic') =>
    request(app.getHttpServer())
      .post(`/mantenimiento-ordenes/${id}/abrir`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
  it('opens once under a concurrent confirmation, records actor and has no closure effects', async () => {
    const order = (await maintenance().expect(201)).body;
    expect(order.openedAt).toBeNull();
    expect(order.unit.fotoDataUrl).toBeNull();
    const before = (
      await db.query('SELECT count(*)::int AS n FROM outbox_events')
    )[0].n;
    const responses = await Promise.all([open(order.id), open(order.id)]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(responses[0].body.openedAt).toBe(responses[1].body.openedAt);
    expect(responses[0].body).toMatchObject({
      status: 'PENDING',
      openedBy: actor.subject,
      legacyCompatDraft: false,
    });
    expect(
      (await db.query('SELECT count(*)::int AS n FROM outbox_events'))[0].n,
    ).toBe(before);
    const row = (
      await db.query('SELECT estado, cerrado_at FROM visitas WHERE id=$1', [
        order.id,
      ])
    )[0];
    expect(row).toMatchObject({ estado: 'BORRADOR', cerrado_at: null });
    await request(app.getHttpServer())
      .get(`/mantenimiento-ordenes/${order.id}`)
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) => expect(r.body.openedAt).toBe(responses[0].body.openedAt));
    await request(app.getHttpServer())
      .get('/mantenimiento-ordenes')
      .query({ unidadId: vehicle })
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) =>
        expect(r.body.items.map((o: { id: string }) => o.id)).toEqual([
          order.id,
        ]),
      );
  });
  it('opening a legacy draft frees only its preparation slot and preserves both orders', async () => {
    const createDraft = () =>
      request(app.getHttpServer())
        .post(`/unidades/${vehicle}/visitas`)
        .set('X-Role', 'SUPERVISOR')
        .set('X-User-Id', 'legacy-supervisor')
        .send({ tipo: 'CORRECTIVO', choferId: driver, km: 100 });
    const first = (await createDraft().expect(201)).body;
    await open(first.id).expect(201);
    const second = (await createDraft().expect(201)).body;
    expect(second.id).not.toBe(first.id);
    const list = await request(app.getHttpServer())
      .get('/mantenimiento-ordenes')
      .query({ unidadId: vehicle })
      .set('Authorization', 'Bearer mechanic')
      .expect(200);
    expect(
      list.body.items.find((o: { id: string }) => o.id === first.id).openedAt,
    ).toBeTruthy();
    expect(
      list.body.items.find((o: { id: string }) => o.id === second.id).openedAt,
    ).toBeNull();
  });

  it('keeps patio, role and terminal protections, and CHECK is never opened as maintenance', async () => {
    const order = (await maintenance().expect(201)).body;
    await open(order.id, 'foreign').expect(403);
    await open(order.id, 'logistics').expect(403);
    await open(order.id, 'admin').expect(403);
    await request(app.getHttpServer())
      .get('/mantenimiento-ordenes')
      .set('Authorization', 'Bearer foreign')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
    await request(app.getHttpServer())
      .get(`/mantenimiento-ordenes/${order.id}`)
      .set('Authorization', 'Bearer foreign')
      .expect(403);
    const check = (
      await request(app.getHttpServer())
        .post(`/unidades/${vehicle}/checks`)
        .set('Authorization', 'Bearer logistics')
        .send({})
        .expect(201)
    ).body;
    await open(check.id).expect(404);
    await db.query(
      "UPDATE visitas SET work_order_status='COMPLETED', estado='CERRADO', cerrado_at=now(), completed_at=now() WHERE id=$1",
      [order.id],
    );
    await open(order.id).expect(409);
    await request(app.getHttpServer())
      .post(`/unidades/${vehicle}/mantenimiento-ordenes`)
      .set('Authorization', 'Bearer mechanic')
      .send({
        type: 'CORRECTIVE',
        choferId: driver,
        km: 101,
        blocksOperation: false,
      })
      .expect(403);
  });
  it('history includes only the mechanic own completed CHECK, with active queue unchanged', async () => {
    const check = (
      await request(app.getHttpServer())
        .post(`/unidades/${vehicle}/checks`)
        .set('Authorization', 'Bearer logistics')
        .send({})
        .expect(201)
    ).body;
    await db.query(
      "UPDATE visitas SET work_order_status='COMPLETED', assigned_user_id=$1, completed_at=now() WHERE id=$2",
      [actor.subject, check.id],
    );
    await request(app.getHttpServer())
      .get('/checks')
      .query({ cola: 'cerradas', unidadId: vehicle })
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) =>
        expect(r.body.items.map((o: { id: string }) => o.id)).toEqual([
          check.id,
        ]),
      );
    await request(app.getHttpServer())
      .get('/checks')
      .query({ unidadId: vehicle })
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
    await db.query('UPDATE visitas SET assigned_user_id=$1 WHERE id=$2', [
      'other-mechanic',
      check.id,
    ]);
    await request(app.getHttpServer())
      .get('/checks')
      .query({ cola: 'cerradas', unidadId: vehicle })
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
  });
  it('additive migration preserves older visits without automatically opening them', async () => {
    const order = (await maintenance().expect(201)).body;
    await db.query(
      'ALTER TABLE visitas DROP COLUMN opened_at, DROP COLUMN opened_by, DROP COLUMN opened_actor_name',
    );
    const runner = db.createQueryRunner();
    try {
      await new MaintenanceOrderOpening1791763200001().up(runner);
      await new MaintenanceOrderOpening1791763200001().up(runner);
    } finally {
      await runner.release();
    }
    const row = (
      await db.query(
        'SELECT opened_at,opened_by,estado,work_order_status FROM visitas WHERE id=$1',
        [order.id],
      )
    )[0];
    expect(row).toMatchObject({
      opened_at: null,
      opened_by: null,
      estado: 'BORRADOR',
      work_order_status: 'PENDING',
    });
  });
});
