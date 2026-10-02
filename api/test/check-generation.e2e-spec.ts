import { DailyChecksService } from '../src/visitas/checks/daily-checks.service';
import {
  CheckEventsService,
  CheckDeliveryRunner,
} from '../src/visitas/checks/check-events.service';
import { CheckInboxAdapter } from '../src/notifications/check-inbox.adapter';
import { PhysicalStateReadPort } from '../src/flota/physical-state-read.port';
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

describe('EWO-016 daily generation, audit and delivery', () => {
  let app: INestApplication, db: DataSource, service: CanonicalOrdersService;
  let vehicle: string, driver: string;
  let fixtureNumber = 0;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PhysicalStateReadPort)
      .useValue({
        read: async () => ({
          physicalKnowledge: 'KNOWN',
          physicalState: 'EN_PATIO',
          version: 1,
          observedAt: new Date(),
          operationalInconsistency: false,
        }),
      })
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

  const day = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
    }).format(new Date());
  const daily = () =>
    app
      .get(DailyChecksService)
      .generateVehicle('mex', vehicle, day(), system, 'fixture-command');
  it('S2-T01 manual creation commits audit/outbox atomically and does not emit VisitaCerrada', async () => {
    const check = (await create(vehicle).expect(201)).body;
    const audit = await db.query(
      'SELECT * FROM check_audit WHERE check_id=$1',
      [check.id],
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      event_type: 'CHECK_CREATED',
      actor_subject: logistics.subject,
      facility_id: 'mex',
      source: 'LOGISTICS_MANUAL',
    });
    const events = await db.query(
      "SELECT * FROM outbox_events WHERE payload->>'checkId'=$1",
      [check.id],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'CHECK_CREATED',
      processed_at: null,
    });
    expect(events[0].id).toBe(audit[0].event_id);
    const spy = jest
      .spyOn(app.get(CheckEventsService), 'created')
      .mockRejectedValueOnce(new Error('audit unavailable'));
    await db.query(
      "UPDATE visitas SET work_order_status='CANCELLED' WHERE id=$1",
      [check.id],
    );
    await expect(
      service.createCheck(vehicle, CheckSource.LOGISTICS_MANUAL, logistics),
    ).rejects.toThrow('audit unavailable');
    spy.mockRestore();
    expect(
      await db.query('SELECT id FROM visitas WHERE unidad_id=$1', [vehicle]),
    ).toHaveLength(1);
  });
  it('S2-T02 daily ledger survives completion/cancellation and concurrent retries', async () => {
    const [a, b] = await Promise.all([daily(), daily()]);
    expect([a.status, b.status].sort()).toEqual(['CREATED', 'SKIPPED']);
    const id = a.checkId ?? b.checkId;
    for (const status of ['COMPLETED', 'CANCELLED']) {
      await db.query('UPDATE visitas SET work_order_status=$1 WHERE id=$2', [
        status,
        id,
      ]);
      expect(await daily()).toMatchObject({
        status: 'SKIPPED',
        reason: 'DAILY_ALREADY_GENERATED',
        checkId: id,
      });
    }
    expect(
      await db.query(
        'SELECT * FROM check_daily_generation WHERE unidad_id=$1',
        [vehicle],
      ),
    ).toHaveLength(1);
    expect(
      await db.query('SELECT * FROM check_audit WHERE unidad_id=$1', [vehicle]),
    ).toHaveLength(1);
  });
  it('S2-T03 scheduler/manual race reaches PostgreSQL on two connections after precheck', async () => {
    const original = service.findActiveIn.bind(service);
    let arrive = 0;
    let release!: () => void;
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    const pids = new Set<number>();
    const spy = jest
      .spyOn(service, 'findActiveIn')
      .mockImplementation(async (manager, id) => {
        const result = await original(manager, id);
        if (id === vehicle && arrive < 2) {
          pids.add((await manager.query('SELECT pg_backend_pid() pid'))[0].pid);
          if (++arrive === 2) release();
          await barrier;
        }
        return result;
      });
    try {
      const result = await Promise.allSettled([
        daily(),
        service.createCheck(vehicle, CheckSource.LOGISTICS_MANUAL, logistics),
      ]);
      expect(pids.size).toBe(2);
      const created = result.filter(
        (r) =>
          r.status === 'fulfilled' &&
          ('id' in r.value || r.value.status === 'CREATED'),
      );
      expect(created).toHaveLength(1);
      const loser = result.find((r) => r !== created[0])!;
      if (loser.status === 'rejected')
        expect(loser.reason.getResponse().code).toBe(
          'ACTIVE_CHECK_ALREADY_EXISTS',
        );
      else
        expect(loser.value).toMatchObject({
          status: 'CONFLICT',
          reason: 'ACTIVE_CHECK_ALREADY_EXISTS',
          checkId: expect.any(String),
        });
      expect(
        (
          await db.query(
            "SELECT count(*)::int n FROM visitas WHERE unidad_id=$1 AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS')",
            [vehicle],
          )
        )[0].n,
      ).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
  it('S2-T03 existing manual CHECK is skipped with reference, without consuming daily generation', async () => {
    const existing = (await create(vehicle).expect(201)).body;
    expect(await daily()).toMatchObject({
      status: 'SKIPPED',
      reason: 'ACTIVE_CHECK_ALREADY_EXISTS',
      checkId: existing.id,
    });
    expect(
      await db.query(
        'SELECT * FROM check_daily_generation WHERE unidad_id=$1',
        [vehicle],
      ),
    ).toHaveLength(0);
  });
  it('S2-T04 eligibility and scope fail closed; past operational date cannot create', async () => {
    const physical = app.get(PhysicalStateReadPort);
    const spy = jest
      .spyOn(physical, 'read')
      .mockResolvedValue({
        physicalKnowledge: 'UNAVAILABLE',
        physicalState: null,
      });
    expect(await daily()).toMatchObject({
      status: 'SKIPPED',
      reason: 'PHYSICAL_SOURCE_UNAVAILABLE',
    });
    expect(
      await db.query(
        'SELECT * FROM check_daily_generation WHERE unidad_id=$1',
        [vehicle],
      ),
    ).toHaveLength(0);
    spy.mockRestore();
    await expect(
      app
        .get(DailyChecksService)
        .generateVehicle('elsewhere', vehicle, day(), system, 'fixture'),
    ).rejects.toThrow();
    await expect(
      app
        .get(DailyChecksService)
        .generateVehicle('mex', vehicle, '2020-01-01', system, 'fixture'),
    ).rejects.toThrow();
  });
  it('S2-T05 committed event survives delivery failure/restart/replay; audience is not read state', async () => {
    const check = (await create(vehicle).expect(201)).body;
    const adapter = app.get(CheckInboxAdapter);
    const runner = app.get(CheckDeliveryRunner);
    const original = adapter.deliver.bind(adapter);
    const spy = jest
      .spyOn(adapter, 'deliver')
      .mockImplementation(async (event, manager) => {
        await original(event, manager);
        throw new Error('fixture outage');
      });
    expect((await runner.runOnce()).failed).toBeGreaterThan(0);
    expect(
      (
        await db.query(
          "SELECT processed_at FROM outbox_events WHERE payload->>'checkId'=$1",
          [check.id],
        )
      )[0].processed_at,
    ).toBeNull();
    spy.mockRestore();
    expect(
      await db.query(
        'SELECT * FROM notifications.check_inbox WHERE check_id=$1',
        [check.id],
      ),
    ).toHaveLength(0);
    await Promise.all([runner.runOnce(), runner.runOnce()]);
    await db.query(
      "UPDATE outbox_events SET processed_at=NULL WHERE payload->>'checkId'=$1",
      [check.id],
    );
    await runner.runOnce();
    const rows = await db.query(
      'SELECT * FROM notifications.check_inbox WHERE check_id=$1',
      [check.id],
    );
    expect(rows).toHaveLength(1);
    const id = rows[0].event_id;
    const list = await request(app.getHttpServer())
      .get('/notifications/checks')
      .set('Authorization', 'Bearer logistics')
      .expect(200);
    expect(list.body.items.some((x: { id: string }) => x.id === id)).toBe(true);
    expect(
      list.body.items.find((x: { id: string }) => x.id === id).deeplinkPath,
    ).toBe(`/checks/${check.id}`);
    await request(app.getHttpServer())
      .post(`/notifications/checks/${id}/read`)
      .set('Authorization', 'Bearer logistics')
      .expect(201);
    await request(app.getHttpServer())
      .get('/notifications/checks')
      .set('Authorization', 'Bearer foreign')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
    await request(app.getHttpServer())
      .post(`/notifications/checks/${id}/read`)
      .set('Authorization', 'Bearer foreign')
      .expect(404);
    await request(app.getHttpServer())
      .get('/notifications/checks')
      .set(legacy)
      .expect(401);
    await request(app.getHttpServer())
      .get('/notifications/checks')
      .set('Authorization', 'Bearer mechanic')
      .expect(200)
      .expect((r) => expect(r.body.items).toEqual([]));
    await runner.runOnce();
    const again = await request(app.getHttpServer())
      .get('/notifications/checks')
      .set('Authorization', 'Bearer logistics')
      .expect(200);
    expect(again.body.items.some((x: { id: string }) => x.id === id)).toBe(
      false,
    );
  });
});
