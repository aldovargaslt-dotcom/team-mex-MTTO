import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import { CanonicalOrdersService } from '../src/visitas/checks/canonical-orders.service';
import { CheckSource } from '../src/visitas/work-order';
import { VisitasService } from '../src/visitas/visitas.service';
import { UnidadesService } from '../src/unidades/unidades.service';

const logistics: TrustedActor = {
  subject: 'trusted|logistics',
  displayName: 'Logistics Fixture',
  roles: [Rol.LOGISTICA],
  facilityScopes: ['mex'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const mechanic: TrustedActor = {
  ...logistics,
  subject: 'trusted|mechanic',
  roles: [Rol.MECANICO],
};
const supervisor: TrustedActor = {
  ...logistics,
  subject: 'trusted|supervisor',
  roles: [Rol.SUPERVISOR],
};
const system: TrustedActor = {
  ...logistics,
  subject: 'trusted|daily',
  roles: ['SYSTEM'],
};
const actors: Record<string, TrustedActor> = {
  logistics,
  mechanic,
  supervisor,
  foreign: { ...logistics, facilityScopes: ['elsewhere'] },
  empty: { ...logistics, roles: [] },
};
const legacy = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'legacy-1' };

describe('EWO-015 canonical CHECK / maintenance APIs', () => {
  let app: INestApplication, db: DataSource, service: CanonicalOrdersService;
  let vehicle: string, driver: string;
  let fixtureNumber = 0;
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
    service = app.get(CanonicalOrdersService);
    await db.getRepository(Facility).save({
      id: 'mex',
      name: 'Test facility',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    driver = (await db.query('SELECT id FROM choferes ORDER BY id LIMIT 1'))[0]
      .id;
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  beforeEach(async () => {
    const type = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0]
      .id;
    const res = await request(app.getHttpServer())
      .post('/unidades')
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .send({
        numeroInterno: `CHK-${++fixtureNumber}`,
        placas: `CHK-${fixtureNumber}`,
        tipoId: type,
      })
      .expect(201);
    vehicle = res.body.id;
    await db
      .getRepository(VehicleFacility)
      .save({ unidadId: vehicle, facilityId: 'mex', version: 1 });
  });
  const create = (v: string, token = 'logistics', body: object = {}) =>
    request(app.getHttpServer())
      .post(`/unidades/${v}/checks`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('S1-T01 all active states conflict with winner details; terminal states allow another', async () => {
    let winner = (await create(vehicle).expect(201)).body;
    for (const status of ['PENDING', 'ASSIGNED', 'IN_PROGRESS']) {
      await db.query('UPDATE visitas SET work_order_status=$1 WHERE id=$2', [
        status,
        winner.id,
      ]);
      const conflict = await create(vehicle).expect(409);
      expect(conflict.body.code).toBe('ACTIVE_CHECK_ALREADY_EXISTS');
      expect(conflict.body.details.active).toMatchObject({
        id: winner.id,
        status,
        folio: expect.any(String),
        deeplink: expect.any(String),
      });
    }
    for (const status of ['COMPLETED', 'CANCELLED']) {
      await db.query('UPDATE visitas SET work_order_status=$1 WHERE id=$2', [
        status,
        winner.id,
      ]);
      winner = (await create(vehicle).expect(201)).body;
    }
  });

  it('S1-T02 manual/automatic prechecks pass on two PostgreSQL connections: one create, one conflict', async () => {
    const original = service.findActiveIn.bind(service);
    let arrive = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pids = new Set<number>();
    const transactionStates: boolean[] = [];
    const spy = jest
      .spyOn(service, 'findActiveIn')
      .mockImplementation(async (manager: EntityManager, id: string) => {
        const result = await original(manager, id);
        transactionStates.push(
          manager.queryRunner?.isTransactionActive ?? false,
        );
        if (id === vehicle && arrive < 2) {
          pids.add(
            (await manager.query('SELECT pg_backend_pid() AS pid'))[0].pid,
          );
          arrive++;
          if (arrive === 2) release();
          await barrier;
        }
        return result;
      });
    try {
      const results = await Promise.allSettled([
        service.createCheck(vehicle, CheckSource.LOGISTICS_MANUAL, logistics),
        service.createCheck(vehicle, CheckSource.DAILY_AUTOMATIC, system),
      ]);
      expect(pids.size).toBe(2);
      expect(transactionStates).toEqual([true, true, false]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const loser = results.find(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult;
      expect(loser.reason.getResponse()).toMatchObject({
        code: 'ACTIVE_CHECK_ALREADY_EXISTS',
        details: { active: { id: expect.any(String) } },
      });
      expect(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM visitas WHERE unidad_id=$1 AND work_order_type='CHECK' AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS')",
            [vehicle],
          )
        )[0].n,
      ).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('S1-T03/T04 CHECK + N maintenance coexist; legacy retains its own 201/200 slot', async () => {
    const check = (await create(vehicle).expect(201)).body;
    for (const type of [
      'PREVENTIVE',
      'CORRECTIVE',
      'PREVENTIVE',
      'CORRECTIVE',
    ]) {
      const response = await request(app.getHttpServer())
        .post(`/unidades/${vehicle}/mantenimiento-ordenes`)
        .set('Authorization', 'Bearer supervisor')
        .send({ type, choferId: driver, km: 100, blocksOperation: false })
        .expect(201);
      expect(response.body).toMatchObject({
        type,
        blocksOperation: false,
        legacyCompatDraft: false,
      });
      expect(response.body.outcome).toBeUndefined();
    }
    const body = { choferId: driver, km: 100, tipo: 'PREDICTIVO' };
    const replies = await Promise.all([
      request(app.getHttpServer())
        .post(`/unidades/${vehicle}/visitas`)
        .set(legacy)
        .send(body),
      request(app.getHttpServer())
        .post(`/unidades/${vehicle}/visitas`)
        .set(legacy)
        .send(body),
    ]);
    expect(replies.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(replies[0].body.id).toBe(replies[1].body.id);
    const list = await request(app.getHttpServer())
      .get('/mantenimiento-ordenes')
      .query({ unidadId: vehicle })
      .set('Authorization', 'Bearer supervisor')
      .expect(200);
    expect(list.body.items).toHaveLength(5);
    expect(list.body.items.map((r: { id: string }) => r.id)).not.toContain(
      check.id,
    );
    for (const method of ['get', 'patch', 'delete'] as const)
      await request(app.getHttpServer())
        [method](`/visitas/${check.id}`)
        .set(legacy)
        .send(method === 'patch' ? { km: 200 } : undefined)
        .expect(404);
    await request(app.getHttpServer())
      .post(`/visitas/${check.id}/cerrar`)
      .set(legacy)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/checks/${check.id}/complete`)
      .set('Authorization', 'Bearer mechanic')
      .expect(400);
    expect(
      (
        await db.query('SELECT work_order_status FROM visitas WHERE id=$1', [
          check.id,
        ])
      )[0].work_order_status,
    ).toBe('PENDING');
  });
  it('S1-T03 maintenance request idempotency does not allocate a global draft slot', async () => {
    const body = {
      type: 'PREVENTIVE',
      choferId: driver,
      km: 100,
      blocksOperation: false,
      idempotencyKey: 'request-one',
    };
    const send = () =>
      request(app.getHttpServer())
        .post(`/unidades/${vehicle}/mantenimiento-ordenes`)
        .set('Authorization', 'Bearer supervisor')
        .send(body);
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.id).toBe(b.body.id);
    await request(app.getHttpServer())
      .post(`/unidades/${vehicle}/mantenimiento-ordenes`)
      .set('Authorization', 'Bearer supervisor')
      .send({ ...body, km: 101 })
      .expect(409);
  });
  it('S1-T03/T04 canonical maintenance keeps driver/km validation and independent blocking', async () => {
    const endpoint = `/unidades/${vehicle}/mantenimiento-ordenes`;
    const body = {
      type: 'CORRECTIVE',
      choferId: driver,
      km: 100,
      blocksOperation: false,
    };
    const send = (patch: object) =>
      request(app.getHttpServer())
        .post(endpoint)
        .set('Authorization', 'Bearer supervisor')
        .send({ ...body, ...patch });
    await send({ km: -1 }).expect(400);
    await send({ choferId: '99999999-9999-4999-8999-999999999999' }).expect(
      404,
    );
    await db.query("UPDATE choferes SET estado='INACTIVO' WHERE id=$1", [
      driver,
    ]);
    await send({}).expect(400);
    await db.query("UPDATE choferes SET estado='ACTIVO' WHERE id=$1", [driver]);
    await send({ blocksOperation: 'false' }).expect(400);
    await send({ blocksOperation: true }).expect(400);
    const blocked = await send({
      type: 'PREVENTIVE',
      blocksOperation: true,
      blockReason: 'Explicit fixture decision',
    }).expect(201);
    expect(blocked.body.blocksOperation).toBe(true);
    await db.query("UPDATE unidades SET estado='INACTIVA' WHERE id=$1", [
      vehicle,
    ]);
    await send({}).expect(400);
  });
  it('S1-T08/T11 rejects forged headers, missing roles, cross-facility, body actors and invalid IDs', async () => {
    await request(app.getHttpServer())
      .post(`/unidades/${vehicle}/checks`)
      .set({
        'X-Role': 'LOGISTICA',
        'X-User-Id': 'forged',
        'X-Facility': 'mex',
      })
      .send({})
      .expect(401);
    await create(vehicle, 'empty').expect(401);
    await create(vehicle, 'foreign').expect(403);
    await create(vehicle, 'mechanic').expect(403);
    await create(vehicle, 'mechanic')
      .set({ 'X-Role': 'LOGISTICA', 'X-Facility': 'mex' })
      .expect(403);
    await create(vehicle, 'logistics', { actor: logistics }).expect(400);
    await create(vehicle, 'logistics', { source: 'DAILY_AUTOMATIC' }).expect(
      403,
    );
    await create('not-a-uuid').expect(400);
    await create(vehicle).expect(201);
    await request(app.getHttpServer())
      .get(`/unidades/${vehicle}/checks/active`)
      .set('Authorization', 'Bearer mechanic')
      .expect(200);
    await request(app.getHttpServer())
      .get(`/unidades/${vehicle}/checks/active`)
      .set('Authorization', 'Bearer foreign')
      .expect(403);
    await request(app.getHttpServer())
      .get('/checks')
      .set('Authorization', 'Bearer foreign')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
  });
  it('S1-T08 conflict details remain scoped to the CHECK facility after vehicle remapping', async () => {
    const winner = (await create(vehicle).expect(201)).body;
    await db
      .getRepository(Facility)
      .save({ id: 'elsewhere', name: 'Other test facility' });
    await db
      .getRepository(VehicleFacility)
      .update({ unidadId: vehicle }, { facilityId: 'elsewhere', version: 2 });
    const response = await create(vehicle, 'foreign').expect(403);
    expect(JSON.stringify(response.body)).not.toContain(winner.id);
  });
  it('S1-T08 own/eligible scope filters details, queue and counts consistently', async () => {
    const first = (await create(vehicle).expect(201)).body;
    await db.query(
      "UPDATE visitas SET assigned_user_id='another-mechanic',work_order_status='ASSIGNED' WHERE id=$1",
      [first.id],
    );
    await request(app.getHttpServer())
      .get(`/checks/${first.id}`)
      .set('Authorization', 'Bearer mechanic')
      .expect(404);
    const hidden = await request(app.getHttpServer())
      .get('/checks')
      .query({ unidadId: vehicle, limit: 1 })
      .set('Authorization', 'Bearer mechanic')
      .expect(200);
    expect(hidden.body).toMatchObject({
      items: [],
      counts: { total: 0, active: 0 },
      nextCursor: null,
    });
    await db.query('UPDATE visitas SET assigned_user_id=$1 WHERE id=$2', [
      mechanic.subject,
      first.id,
    ]);
    const own = await request(app.getHttpServer())
      .get('/checks')
      .query({ unidadId: vehicle, limit: 1 })
      .set('Authorization', 'Bearer mechanic')
      .expect(200);
    expect(own.body.items[0].id).toBe(first.id);
    expect(own.body.counts).toEqual({ total: 1, active: 1 });
    await request(app.getHttpServer())
      .get('/checks')
      .query({ actor: 'another-mechanic' })
      .set('Authorization', 'Bearer mechanic')
      .expect(400);
  });
  it('S1-T09 CHECK creation/read never change inventory/outbox/history/ultimoKm/Andon/Salud', async () => {
    const snapshot = async () => ({
      outbox: await db.query('SELECT * FROM outbox_events ORDER BY id'),
      stock: await db.query(
        'SELECT row_to_json(s) AS row FROM inventario.stock s ORDER BY item_id',
      ),
      movements: await db.query(
        'SELECT to_jsonb(t) AS row FROM inventario.movimientos t ORDER BY to_jsonb(t)::text',
      ),
      pending: await db.query(
        'SELECT to_jsonb(t) AS row FROM inventario.pendientes_comprobante t ORDER BY to_jsonb(t)::text',
      ),
      andonCadence: await db.query(
        'SELECT to_jsonb(t) AS row FROM andon.ultima_visita_cerrada t ORDER BY to_jsonb(t)::text',
      ),
      andonAlerts: await db.query(
        'SELECT to_jsonb(t) AS row FROM andon.avisos t ORDER BY to_jsonb(t)::text',
      ),
      health: await db.query(
        'SELECT to_jsonb(t) AS row FROM salud.health_snapshot t ORDER BY to_jsonb(t)::text',
      ),
      healthAlerts: await db.query(
        'SELECT to_jsonb(t) AS row FROM salud.health_alert t ORDER BY to_jsonb(t)::text',
      ),
    });
    const before = await snapshot();
    const check = (await create(vehicle).expect(201)).body;
    const afterCreate = await snapshot();
    expect(afterCreate.outbox).toHaveLength(before.outbox.length + 1);
    expect(afterCreate.outbox[afterCreate.outbox.length - 1]?.type).toBe(
      'CHECK_CREATED',
    );
    await request(app.getHttpServer())
      .get(`/checks/${check.id}`)
      .set('Authorization', 'Bearer mechanic')
      .expect(200);
    expect(await snapshot()).toEqual(afterCreate);
    await db.query(
      "UPDATE visitas SET work_order_status='COMPLETED', km=999999, cerrado_at=now() WHERE id=$1",
      [check.id],
    );
    expect(await app.get(VisitasService).ultimoKmCerrado(vehicle)).toBeNull();
    expect(await app.get(UnidadesService).ultimoKmCerrado(vehicle)).toBeNull();
    const hub = await app
      .get(UnidadesService)
      .hub(vehicle, { rol: Rol.SUPERVISOR, userId: 'legacy' });
    expect(hub.historialCerrado).toEqual([]);
    expect(hub.borradores).toEqual([]);
    expect(await app.get(VisitasService).listHistorial(vehicle)).toEqual([]);
  });
  it('S1-T10 requires explicit facility mapping; never invents one', async () => {
    await db.getRepository(VehicleFacility).delete({ unidadId: vehicle });
    const response = await create(vehicle).expect(422);
    expect(response.body.code).toBe('FACILITY_CONFIGURATION_REQUIRED');
    expect(
      await db.getRepository(VehicleFacility).findOneBy({ unidadId: vehicle }),
    ).toBeNull();
  });
});
