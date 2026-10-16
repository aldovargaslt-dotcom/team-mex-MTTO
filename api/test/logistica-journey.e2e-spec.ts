import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import { LogisticaJourney } from '../src/logistica/journey.entity';
import { LogisticaJourneyService } from '../src/logistica/journey.service';
import { LogisticaJourneyReceipt } from '../src/logistica/journey-receipt.entity';
import { LogisticaDepartureAudit } from '../src/logistica/departure-audit.entity';
import { LogisticaService } from '../src/logistica/logistica.service';
import { Unidad } from '../src/unidades/unidad.entity';
import { UnidadesService } from '../src/unidades/unidades.service';
import { UnitOperationCoordinator } from '../src/kernel/unit-operation.module';
import { SeedService } from '../src/seed/seed.service';
import {
  LEGACY_UNIDADES_PLACAS,
  UNIDADES_DEMO,
  UnidadDemoSeed,
} from '../src/seed/catalogo-demo';
import { FacilityCalendarPort } from '../src/visitas/checks/facility-calendar.port';
import { LogisticaJourneyCapture } from '../src/logistica/journey-capture.entity';
import {
  commandHeaders,
  initializeJourneyFixture,
} from './journey-test-fixture';
import {
  prepareDepartureFixture,
  trustedTestActor,
} from './departure-test-fixture';

describe('EWO-038 durable Logistics journeys (real PostgreSQL)', () => {
  let app: INestApplication, db: DataSource, id: string;
  const actor = trustedTestActor(
    'journey|logistics',
    Rol.LOGISTICA,
    'journey-mex',
  );
  const authorization = { Authorization: 'Bearer logistics' };
  const admin = { 'X-Role': 'ADMIN_DIRECTIVO' };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) => {
          const token = req.headers.authorization;
          return token === 'Bearer logistics'
            ? actor
            : token === 'Bearer foreign'
              ? { ...actor, facilityScopes: ['elsewhere'] }
              : token === 'Bearer mechanic'
                ? { ...actor, roles: [Rol.MECANICO] }
                : null;
        },
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await initializeJourneyFixture(db);
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  beforeEach(async () => {
    const type = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0]
      .id;
    const suffix = randomUUID().slice(0, 8);
    const result = await request(app.getHttpServer())
      .post('/unidades')
      .set(admin)
      .send({
        numeroInterno: 'J-' + suffix,
        placas: 'J-' + suffix,
        tipoId: type,
      })
      .expect(201);
    id = result.body.id;
    await prepareDepartureFixture(db, id, 'journey-mex', actor.subject);
  });
  const post = async (
    kind: string,
    headers?: Record<string, string>,
    body?: object,
    token: Record<string, string> = authorization,
  ) =>
    request(app.getHttpServer())
      .post('/logistica/' + kind + '/' + id)
      .set(token)
      .set(headers ?? (await commandHeaders(db, id, actor.subject)))
      .send(body);
  const depart = async () =>
    post('salidas', undefined, { ambito: 'LOCAL', destino: 'CEDIS' });
  const unit = () => db.getRepository(Unidad).findOneByOrFail({ id });

  it('LJ-01/02 captures repeat trips, exact audit, independent driver context and trusted times', async () => {
    expect((await depart()).status).toBe(204);
    let current = await unit();
    const j1 = current.activeLogisticaJourneyId!;
    const journey = await db
      .getRepository(LogisticaJourney)
      .findOneByOrFail({ id: j1 });
    const audit = await db
      .getRepository(LogisticaDepartureAudit)
      .findOneByOrFail({ id: journey.departureAuditId! });
    expect(journey.departureActorId).toBe(actor.subject);
    expect(audit.actorId).toBe(actor.subject);
    expect(journey.departedEffectiveAt).toEqual(current.salidaAt);
    expect(journey.departedRegisteredAt!.getTime()).toBeGreaterThanOrEqual(
      journey.departedEffectiveAt!.getTime(),
    );
    const snapshot = JSON.stringify(audit);
    expect((await post('regresos')).status).toBe(204);
    const returned = await db
      .getRepository(LogisticaJourney)
      .findOneByOrFail({ id: j1 });
    expect(returned.returnActorId).toBe(actor.subject);
    expect(returned.returnAttributionLevel).toBe('SERVER_VERIFIED');
    expect(returned.returnedRegisteredAt!.getTime()).toBeGreaterThanOrEqual(
      returned.returnedEffectiveAt!.getTime(),
    );
    expect((await unit()).salidaAt).toBeNull();
    expect((await depart()).status).toBe(204);
    current = await unit();
    expect(current.activeLogisticaJourneyId).not.toBe(j1);
    expect(
      JSON.stringify(
        await db
          .getRepository(LogisticaDepartureAudit)
          .findOneByOrFail({ id: audit.id }),
      ),
    ).toBe(snapshot);
    expect(
      await db.getRepository(LogisticaJourney).countBy({ unidadId: id }),
    ).toBe(2);
  });
  it('LJ-03 genuine return preserves Flota and ignores expired departure prerequisites', async () => {
    expect((await depart()).status).toBe(204);
    await db.query("UPDATE unidades SET estado='INACTIVA' WHERE id=$1", [id]);
    await db.query(
      "UPDATE vehicle_documents.document_versions SET expiration_date='2000-01-01' WHERE unidad_id=$1",
      [id],
    );
    await db.query(
      "UPDATE check_inspections SET day_end_instant='2000-01-01' WHERE visita_id IN (SELECT id FROM visitas WHERE unidad_id=$1)",
      [id],
    );
    const physical = JSON.stringify(
      await db.query(
        'SELECT * FROM flota.physical_state_events WHERE unidad_id=$1',
        [id],
      ),
    );
    expect((await post('regresos')).status).toBe(204);
    expect(
      JSON.stringify(
        await db.query(
          'SELECT * FROM flota.physical_state_events WHERE unidad_id=$1',
          [id],
        ),
      ),
    ).toBe(physical);
    const blocked = await depart();
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('DEPARTURE_BLOCKED');
  });
  it('LJ-03/07 return/context need resource mapping but never operational-calendar readiness', async () => {
    expect((await depart()).status).toBe(204);
    const calendar = jest
      .spyOn(app.get(FacilityCalendarPort), 'resolve')
      .mockRejectedValue(new Error('calendar unavailable'));
    try {
      const result = await request(app.getHttpServer())
        .get('/logistica/unidades/' + id + '/journey-context')
        .set(authorization);
      expect(result.status).toBe(200);
      expect((await post('regresos')).status).toBe(204);
      expect(calendar).not.toHaveBeenCalled();
    } finally {
      calendar.mockRestore();
    }
    await db.query('DELETE FROM vehicle_facilities WHERE unidad_id=$1', [id]);
    const denied = await post('salidas', undefined, { ambito: 'LOCAL' });
    expect(denied.status).toBe(422);
    expect((await unit()).opsEstado).toBe('DISPONIBLE');
  });
  it('LJ-04 saved return replay after J2 never touches J2; conflicting key/payload rejected', async () => {
    expect((await depart()).status).toBe(204);
    const headers = await commandHeaders(db, id, actor.subject);
    expect((await post('regresos', headers)).status).toBe(204);
    const old = await db
      .getRepository(LogisticaJourney)
      .findOneByOrFail({ unidadId: id });
    expect((await depart()).status).toBe(204);
    const before = await unit();
    expect((await post('regresos', headers)).status).toBe(204);
    expect(await unit()).toEqual(before);
    expect(
      (await db.getRepository(LogisticaJourney).findOneByOrFail({ id: old.id }))
        .returnedEffectiveAt,
    ).toEqual(old.returnedEffectiveAt);
    expect(
      (await post('regresos', { ...headers, 'Idempotency-Key': randomUUID() }))
        .status,
    ).toBe(409);
    const reused = await post('regresos', {
      ...headers,
      'X-Logistica-Unit-Revision': '999',
    });
    expect(reused.body.code).toBe('LOGISTICA_COMMAND_REUSED');
  });
  it('LJ-04 concurrent departure and return intents create only one endpoint each', async () => {
    const h = await commandHeaders(db, id, actor.subject);
    const results = await Promise.all([
      post('salidas', h, { ambito: 'LOCAL' }),
      post(
        'salidas',
        { ...h, 'Idempotency-Key': randomUUID() },
        { ambito: 'LOCAL' },
      ),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    const r = await commandHeaders(db, id, actor.subject);
    const returns = await Promise.all([
      post('regresos', r),
      post('regresos', { ...r, 'Idempotency-Key': randomUUID() }),
    ]);
    expect(returns.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(
      await db.getRepository(LogisticaJourney).countBy({ unidadId: id }),
    ).toBe(1);
  });
  it('LJ-04 concurrent identical retries and cross-unit key reuse are durable', async () => {
    const h = await commandHeaders(db, id, actor.subject);
    const same = await Promise.all([
      post('salidas', h, { ambito: 'LOCAL' }),
      post('salidas', h, { ambito: 'LOCAL' }),
    ]);
    expect(same.map((r) => r.status)).toEqual([204, 204]);
    const another = (
      await db.query(
        "SELECT id FROM unidades WHERE id<>$1 AND ops_estado='DISPONIBLE' LIMIT 1",
        [id],
      )
    )[0].id;
    await prepareDepartureFixture(db, another, 'journey-mex', actor.subject);
    const next = {
      ...(await commandHeaders(db, another, actor.subject)),
      'Idempotency-Key': h['Idempotency-Key'],
    };
    const result = await request(app.getHttpServer())
      .post('/logistica/salidas/' + another)
      .set(authorization)
      .set(next)
      .send({ ambito: 'LOCAL' });
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('LOGISTICA_COMMAND_REUSED');
  });
  it('LJ-04 shared key racing on two different units commits only one transaction', async () => {
    const other = (
      await db.query(
        "SELECT id FROM unidades WHERE id<>$1 AND ops_estado='DISPONIBLE' AND active_logistica_journey_id IS NULL LIMIT 1",
        [id],
      )
    )[0].id;
    await prepareDepartureFixture(db, other, 'journey-mex', actor.subject);
    const first = await commandHeaders(db, id, actor.subject);
    const second = {
      ...(await commandHeaders(db, other, actor.subject)),
      'Idempotency-Key': first['Idempotency-Key'],
    };
    const results = await Promise.all([
      post('salidas', first, { ambito: 'LOCAL' }),
      request(app.getHttpServer())
        .post('/logistica/salidas/' + other)
        .set(authorization)
        .set(second)
        .send({ ambito: 'LOCAL' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    const rows = await db.query(
      'SELECT * FROM logistica_journey_commands WHERE actor_id=$1 AND command_id=$2',
      [actor.subject, first['Idempotency-Key']],
    );
    expect(rows).toHaveLength(1);
    const loser = results[0].status === 409 ? id : other;
    expect(
      (await db.getRepository(Unidad).findOneByOrFail({ id: loser })).opsEstado,
    ).toBe('DISPONIBLE');
  });
  it.each([
    'logistica_departure_audits',
    'logistica_journeys',
    'logistica_journey_commands',
    'unidades',
  ])('LJ-05 departure rollback on %s persistence failure', async (table) => {
    const before = await unit();
    await db.query(
      "CREATE FUNCTION ewo038_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected EWO038 failure'; END $$",
    );
    await db.query(
      'CREATE TRIGGER ewo038_failure BEFORE INSERT OR UPDATE ON ' +
        table +
        ' FOR EACH ROW EXECUTE FUNCTION ewo038_fail()',
    );
    try {
      expect((await depart()).status).toBe(500);
    } finally {
      await db.query('DROP TRIGGER ewo038_failure ON ' + table);
      await db.query('DROP FUNCTION ewo038_fail()');
    }
    expect(await unit()).toEqual(before);
    expect(
      await db.getRepository(LogisticaJourney).countBy({ unidadId: id }),
    ).toBe(0);
    expect(
      await db.getRepository(LogisticaJourneyReceipt).countBy({ unidadId: id }),
    ).toBe(0);
    expect(
      await db.getRepository(LogisticaDepartureAudit).countBy({ unidadId: id }),
    ).toBe(0);
  });
  it('LJ-05 return rollback and postcommit projection failure retain safe retry identity', async () => {
    expect((await depart()).status).toBe(204);
    const before = await unit();
    const headers = await commandHeaders(db, id, actor.subject);
    await db.query(
      "CREATE FUNCTION ewo038_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$",
    );
    await db.query(
      'CREATE TRIGGER ewo038_failure BEFORE INSERT ON logistica_journey_commands FOR EACH ROW EXECUTE FUNCTION ewo038_fail()',
    );
    try {
      expect((await post('regresos', headers)).status).toBe(500);
    } finally {
      await db.query(
        'DROP TRIGGER ewo038_failure ON logistica_journey_commands',
      );
      await db.query('DROP FUNCTION ewo038_fail()');
    }
    expect(await unit()).toEqual(before);
    const service = app.get(LogisticaService);
    const failure = jest
      .spyOn(service as never, 'evalCurrentUnidad' as never)
      .mockRejectedValueOnce(new Error('postcommit') as never);
    expect((await post('regresos', headers)).status).toBe(500);
    failure.mockRestore();
    expect((await unit()).opsEstado).toBe('DISPONIBLE');
    expect((await post('regresos', headers)).status).toBe(204);
  });
  it.each(['logistica_journeys', 'unidades'])(
    'LJ-05 return endpoint rolls back on %s failure',
    async (table) => {
      expect((await depart()).status).toBe(204);
      const before = await unit();
      await db.query(
        "CREATE FUNCTION ewo038_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected return'; END $$",
      );
      await db.query(
        'CREATE TRIGGER ewo038_failure BEFORE UPDATE ON ' +
          table +
          ' FOR EACH ROW EXECUTE FUNCTION ewo038_fail()',
      );
      try {
        expect((await post('regresos')).status).toBe(500);
      } finally {
        await db.query('DROP TRIGGER ewo038_failure ON ' + table);
        await db.query('DROP FUNCTION ewo038_fail()');
      }
      expect(await unit()).toEqual(before);
      const j = await db
        .getRepository(LogisticaJourney)
        .findOneByOrFail({ id: before.activeLogisticaJourneyId! });
      expect(j.returnedEffectiveAt).toBeNull();
      expect(j.revision).toBe('1');
    },
  );
  it.each([false, true])(
    'LJ-06/10 incomplete legacy recovery with dangling pointer=%s',
    async (dangling) => {
      const pointer = dangling ? randomUUID() : null;
      await db.query(
        "UPDATE unidades SET ops_estado='EN_RUTA',salida_at=NULL,active_logistica_journey_id=$2 WHERE id=$1",
        [id, pointer],
      );
      const c = await app.get(LogisticaJourneyService).context(id, actor);
      expect(c.journeyRevision).toBeNull();
      expect(c.historyState).toBe(dangling ? 'MISSING_ROW' : 'MISSING_POINTER');
      expect((await post('regresos')).status).toBe(204);
      const j = await db
        .getRepository(LogisticaJourney)
        .findOneByOrFail({ unidadId: id });
      expect(j.origin).toBe('LEGACY_RECOVERED');
      expect(j.departedEffectiveAt).toBeNull();
      expect(j.driverId).toBeNull();
      expect(j.departureAuditId).toBeNull();
      expect(j.returnedEffectiveAt).not.toBeNull();
      if (pointer) expect(j.id).toBe(pointer);
    },
  );
  it('LJ-06 rejects a row that appears after missing-history preparation', async () => {
    const pointer = randomUUID();
    await db.query(
      "UPDATE unidades SET ops_estado='EN_RUTA',active_logistica_journey_id=$2 WHERE id=$1",
      [id, pointer],
    );
    const h = await commandHeaders(db, id, actor.subject);
    const capture = (
      await db.query('SELECT id FROM logistica_journey_capture LIMIT 1')
    )[0].id;
    await db
      .getRepository(LogisticaJourney)
      .save({
        id: pointer,
        unidadId: id,
        captureId: capture,
        origin: 'LEGACY_OPEN',
        revision: '1',
        driverProvenance: 'UNKNOWN',
        contextProvenance: 'LEGACY_OBSERVED',
        historyGaps: ['UNKNOWN_DEPARTURE'],
      });
    expect((await post('regresos', h)).status).toBe(409);
    expect((await unit()).opsEstado).toBe('EN_RUTA');
  });
  it('LJ-08/10 reports the journey original capture epoch, not a later recovery epoch', async () => {
    expect((await depart()).status).toBe(204);
    const before = await app.get(LogisticaJourneyService).context(id, actor);
    const newer = await db.getRepository(LogisticaJourneyCapture).save({
      id: randomUUID(),
      schemaVersion: 1,
      boundaryAt: new Date(Date.now() + 1000),
      baselineCommit: '0d7d0b274961bab273d3d57d750c06664af5eed3',
      legacyOpenCount: 0,
      coverageNote: 'Fixture interruption',
    });
    try {
      const after = await app.get(LogisticaJourneyService).context(id, actor);
      expect(after.historyCoverage.captureId).toBe(
        before.historyCoverage.captureId,
      );
      expect(after.historyCoverage.boundaryAt).toBe(
        before.historyCoverage.boundaryAt,
      );
      expect(after.historyCoverage.activeCaptureId).toBe(newer.id);
      expect(after.historyCoverage.preBoundaryHistory).toBe('UNASSESSED');
    } finally {
      await db.getRepository(LogisticaJourneyCapture).delete(newer.id);
    }
  });
  it('LJ-08 readiness reports missing capture/schema without inventing an epoch', async () => {
    const captures = await db.getRepository(LogisticaJourneyCapture).find();
    await db.query('DELETE FROM logistica_journey_capture');
    try {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer()).get('/health/ready').expect(503);
      expect(await db.getRepository(LogisticaJourneyCapture).count()).toBe(0);
    } finally {
      await db.getRepository(LogisticaJourneyCapture).save(captures);
    }
    await request(app.getHttpServer()).get('/health/ready').expect(200);
    await db.query(
      'ALTER TABLE logistica_journey_capture RENAME TO logistica_journey_capture_missing',
    );
    try {
      await request(app.getHttpServer()).get('/health/ready').expect(503);
    } finally {
      await db.query(
        'ALTER TABLE logistica_journey_capture_missing RENAME TO logistica_journey_capture',
      );
    }
  });
  it('LJ-05 committed replay never runs the optional alert projection', async () => {
    const h = await commandHeaders(db, id, actor.subject);
    expect((await post('salidas', h, { ambito: 'LOCAL' })).status).toBe(204);
    const projection = jest.spyOn(
      app.get(LogisticaService) as never,
      'evalCurrentUnidad' as never,
    );
    try {
      expect((await post('salidas', h, { ambito: 'LOCAL' })).status).toBe(204);
      expect(projection).not.toHaveBeenCalled();
    } finally {
      projection.mockRestore();
    }
  });
  it('LJ-07 rejects missing trusted identity, wrong role/scope and subject switch', async () => {
    const h = await commandHeaders(db, id, actor.subject);
    expect(
      (await post('salidas', h, { ambito: 'LOCAL' }, { 'X-Role': 'LOGISTICA' }))
        .status,
    ).toBe(401);
    expect(
      (
        await post(
          'salidas',
          h,
          { ambito: 'LOCAL' },
          { Authorization: 'Bearer foreign' },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await post(
          'salidas',
          h,
          { ambito: 'LOCAL' },
          { Authorization: 'Bearer mechanic' },
        )
      ).status,
    ).toBe(403);
    const mismatch = await post(
      'salidas',
      { ...h, 'X-Logistica-Expected-Subject': 'another' },
      { ambito: 'LOCAL' },
    );
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.code).toBe('LOGISTICA_COMMAND_SUBJECT_CHANGED');
    expect((await unit()).logisticaJourneyRevision).toBe('0');
    expect((await post('salidas', {}, { ambito: 'LOCAL' })).status).toBe(400);
  });
  it('LJ-11 status/catalog/assignment writers serialize without overwriting endpoints', async () => {
    const coordinator = app.get(UnitOperationCoordinator);
    const original = coordinator.lock.bind(coordinator);
    let entered!: () => void, release!: () => void;
    const enteredPromise = new Promise<void>((r) => (entered = r)),
      released = new Promise<void>((r) => (release = r));
    let pause = true;
    const spy = jest
      .spyOn(coordinator, 'lock')
      .mockImplementation(async (m, unitId) => {
        if (unitId === id && pause) {
          pause = false;
          entered();
          await released;
        }
        await original(m, unitId);
      });
    const edit = app
      .get(UnidadesService)
      .update(id, { marcaModelo: 'Concurrent edit' });
    await enteredPromise;
    expect((await depart()).status).toBe(204);
    const after = await unit();
    release();
    await edit;
    spy.mockRestore();
    const result = await unit();
    expect(result.marcaModelo).toBe('Concurrent edit');
    expect(result.activeLogisticaJourneyId).toBe(
      after.activeLogisticaJourneyId,
    );
    expect(result.logisticaJourneyRevision).toBe(
      after.logisticaJourneyRevision,
    );
    expect(result.salidaAt).toEqual(after.salidaAt);
    await app.get(LogisticaService).unassign(id);
    expect((await unit()).activeLogisticaJourneyId).toBe(
      after.activeLogisticaJourneyId,
    );
  });
  it('LJ-02/11 waits for fresh status/assignment, and timestamps start after lock release', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await app.get(UnitOperationCoordinator).lock(runner.manager, id);
    const before = Date.now();
    const pending = post(
      'salidas',
      await commandHeaders(db, id, actor.subject),
      { ambito: 'LOCAL' },
    );
    // Wait for a real database lock waiter instead of guessing a timing threshold.
    let waiting = false;
    for (let n = 0; n < 100; n++) {
      if (
        (
          await db.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'",
          )
        ).length
      ) {
        waiting = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(waiting).toBe(true);
    const [{ released }] = await runner.query(
      'SELECT clock_timestamp() AS released',
    );
    await runner.commitTransaction();
    await runner.release();
    expect((await pending).status).toBe(204);
    expect((await unit()).salidaAt!.getTime()).toBeGreaterThanOrEqual(
      new Date(released).getTime(),
    );
    expect((await unit()).salidaAt!.getTime()).toBeGreaterThanOrEqual(before);
    const driver = (
      await db.query(
        'SELECT id FROM choferes WHERE id NOT IN (SELECT chofer_id FROM unidades WHERE chofer_id IS NOT NULL) LIMIT 1',
      )
    )[0].id;
    const coordinator = app.get(UnitOperationCoordinator),
      original = coordinator.lock.bind(coordinator);
    let enter!: () => void,
      release!: () => void,
      paused = true;
    const entered = new Promise<void>((r) => (enter = r)),
      ready = new Promise<void>((r) => (release = r));
    const spy = jest
      .spyOn(coordinator, 'lock')
      .mockImplementation(async (m, u) => {
        if (u === id && paused) {
          paused = false;
          enter();
          await ready;
        }
        await original(m, u);
      });
    const assign = app.get(LogisticaService).assign(id, driver);
    await entered;
    expect((await post('regresos')).status).toBe(204);
    const returned = await unit();
    release();
    await assign;
    spy.mockRestore();
    const result = await unit();
    expect(result.choferId).toBe(driver);
    expect(result.logisticaJourneyRevision).toBe(
      returned.logisticaJourneyRevision,
    );
    expect(result.activeLogisticaJourneyId).toBeNull();
    expect(result.salidaAt).toBeNull();
  });
  it('LJ-12 startup seed preserves captured journey and returned state', async () => {
    const seedId = (
      await db.query("SELECT id FROM unidades WHERE placas='VU2632C'")
    )[0].id;
    await prepareDepartureFixture(db, seedId, 'journey-mex', actor.subject);
    const h = await commandHeaders(db, seedId, actor.subject);
    expect(
      (
        await request(app.getHttpServer())
          .post('/logistica/salidas/' + seedId)
          .set(authorization)
          .set(h)
          .send({ ambito: 'FORANEO', destino: 'Preserve me' })
      ).status,
    ).toBe(204);
    const state = await db
      .getRepository(Unidad)
      .findOneByOrFail({ id: seedId });
    await app.get(SeedService).onModuleInit();
    const next = await db.getRepository(Unidad).findOneByOrFail({ id: seedId });
    expect(next.activeLogisticaJourneyId).toBe(state.activeLogisticaJourneyId);
    expect(next.destino).toBe('Preserve me');
    expect(next.salidaAt).toEqual(state.salidaAt);
    expect(
      (
        await request(app.getHttpServer())
          .post('/logistica/regresos/' + seedId)
          .set(authorization)
          .set(await commandHeaders(db, seedId, actor.subject))
      ).status,
    ).toBe(204);
    await app.get(SeedService).onModuleInit();
    expect(
      (await db.getRepository(Unidad).findOneByOrFail({ id: seedId }))
        .opsEstado,
    ).toBe('DISPONIBLE');
  });
  it('LJ-12 protects captured placeholders and creates no naked EN_RUTA after capture', async () => {
    await app
      .get(UnidadesService)
      .update(id, { placas: LEGACY_UNIDADES_PLACAS[0] });
    expect((await depart()).status).toBe(204);
    const before = await unit();
    const seed = app.get(SeedService);
    await seed.onModuleInit();
    expect((await unit()).activeLogisticaJourneyId).toBe(
      before.activeLogisticaJourneyId,
    );
    expect(
      await db.getRepository(LogisticaJourney).countBy({ unidadId: id }),
    ).toBe(1);
    const item: UnidadDemoSeed = {
      ...UNIDADES_DEMO[0],
      nombre: 'POST-CAPTURE-' + randomUUID(),
      placas: 'POST-' + randomUUID().slice(0, 8),
      opsEstado: 'EN_RUTA',
    };
    const create = seed as unknown as {
      upsertUnidad(i: UnidadDemoSeed): Promise<Unidad>;
    };
    const newUnit = await create.upsertUnidad(item);
    expect(newUnit.opsEstado).toBe('DISPONIBLE');
    expect(newUnit.salidaAt).toBeNull();
    expect(newUnit.activeLogisticaJourneyId).toBeNull();
    expect(String(newUnit.logisticaJourneyRevision)).toBe('0');
  });
});
