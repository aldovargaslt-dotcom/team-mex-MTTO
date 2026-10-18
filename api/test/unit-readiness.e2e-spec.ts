import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { deflateSync } from 'zlib';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MaintenanceAssigneesPort } from '../src/auth/actor-directory.port';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import { ReadinessSettings } from '../src/visitas/checks/readiness-settings.entity';
import { ReadinessHold } from '../src/visitas/checks/readiness-hold.entity';
import { UnitReadiness1792195200001 } from '../src/db/migrations/1792195200001-UnitReadiness';
import { PhysicalStateReadPort } from '../src/flota/physical-state-read.port';
import { CanonicalOrdersService } from '../src/visitas/checks/canonical-orders.service';
import { operationalDay } from '../src/visitas/checks/facility-calendar';

const actor: TrustedActor = {
  subject: 'readiness-admin',
  displayName: 'Mecánico test',
  roles: [Rol.ADMIN_DIRECTIVO],
  facilityScopes: ['mex'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const actors: Record<string, TrustedActor> = {
  admin: actor,
  supervisor: { ...actor, subject: 'supervisor', roles: [Rol.SUPERVISOR] },
  mechanic: { ...actor, subject: 'mechanic', roles: [Rol.MECANICO] },
  logistics: { ...actor, subject: 'logistics', roles: [Rol.LOGISTICA] },
  foreign: { ...actor, subject: 'foreign', facilityScopes: ['elsewhere'] },
};
function signaturePng() {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const b of body) {
      crc ^= b;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(640, 0);
  header.writeUInt32BE(180, 4);
  header[8] = 8;
  header[9] = 6;
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: 640 }, () => [36, 40, 77, 255]).flat()),
  ]);
  return (
    'data:image/png;base64,' +
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk(
        'IDAT',
        deflateSync(Buffer.concat(Array.from({ length: 180 }, () => row))),
      ),
      chunk('IEND', Buffer.alloc(0)),
    ]).toString('base64')
  );
}

describe('EWO056 readiness scope, settings, gates and signed repair verification', () => {
  let app: INestApplication,
    db: DataSource,
    unit: string,
    driver: string,
    category: string;
  const call = (
    method: 'get' | 'put' | 'post',
    path: string,
    token = 'supervisor',
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) =>
          actors[req.headers.authorization?.replace('Bearer ', '')] ?? null,
      })
      .overrideProvider(MaintenanceAssigneesPort)
      .useValue({
        resolve: async () => null,
        maintenanceAssignees: async () => [
          { subject: 'mechanic', displayName: 'Mecánico test' },
        ],
      })
      .overrideProvider(PhysicalStateReadPort)
      .useValue({
        read: async () => ({
          physicalKnowledge: 'KNOWN',
          physicalState: 'EN_PATIO',
          operationalInconsistency: false,
        }),
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await db.query(
      'DROP TABLE public.unit_safety_holds, public.unit_repair_verifications, public.check_readiness_audit, public.check_readiness_settings',
    );
    await db.query(
      'ALTER TABLE public.check_inspections DROP COLUMN validity_policy',
    );
    const runner = db.createQueryRunner();
    await runner.startTransaction();
    try {
      await new UnitReadiness1792195200001().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    await db.getRepository(Facility).save({
      id: 'mex',
      name: 'Test',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    category = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0].id;
    driver = (await db.query('SELECT id FROM choferes LIMIT 1'))[0].id;
    unit = (
      await request(app.getHttpServer())
        .post('/unidades')
        .set('X-Role', 'ADMIN_DIRECTIVO')
        .send({
          numeroInterno: 'READINESS-001',
          placas: 'READINESS-001',
          tipoId: category,
        })
        .expect(201)
    ).body.id;
    await db
      .getRepository(VehicleFacility)
      .save({ unidadId: unit, facilityId: 'mex', version: 1 });
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('treats all units as daily and denies unscoped details/configuration', async () => {
    const response = await call('get', '/unit-readiness?usage=ALL').expect(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        id: unit,
        usage: 'DAILY',
        technicalReady: false,
        checkState: 'MISSING',
      }),
    ]);
    await call('get', `/unit-readiness/${unit}`, 'foreign').expect(404);
    await call('get', '/unit-readiness', 'mechanic').expect(403);
    await call('put', '/unit-readiness/settings')
      .send({
        facilityId: 'mex',
        scope: 'FLEET',
        targetId: '*',
        expectedVersion: 0,
        interval: { mode: 'WEEKLY' },
        usage: 'DAILY',
      })
      .expect(403);
  });
  it('ignores historical Stock/weekly settings and rejects further configuration', async () => {
    await db
      .getRepository(ReadinessSettings)
      .save({
        facilityId: 'mex',
        scope: 'FLEET',
        targetId: '*',
        interval: { mode: 'WEEKLY' },
        usage: 'STOCK',
        version: 1,
        updatedBy: 'historic',
        updatedAt: new Date(),
      });
    await call('put', '/unit-readiness/settings', 'admin')
      .send({
        facilityId: 'mex',
        scope: 'FLEET',
        targetId: '*',
        expectedVersion: 1,
        interval: { mode: 'DAILY' },
        usage: 'DAILY',
      })
      .expect(410);
    for (const usage of ['STOCK', 'DAILY', 'UNCLASSIFIED', 'ALL']) {
      const rows = (
        await call('get', `/unit-readiness?usage=${usage}`).expect(200)
      ).body.items;
      expect(rows).toEqual([
        expect.objectContaining({
          id: unit,
          usage: 'DAILY',
          policy: expect.objectContaining({ interval: { mode: 'DAILY' } }),
        }),
      ]);
    }
    expect((await db.getRepository(ReadinessSettings).find())[0].usage).toBe(
      'STOCK',
    );
  });
  it('reports all existing orders, preserves other holds and replays signed verification exactly once', async () => {
    const create = () =>
      call('post', `/unidades/${unit}/mantenimiento-ordenes`)
        .send({
          type: 'CORRECTIVE',
          choferId: driver,
          km: 100,
          blocksOperation: false,
          idempotencyKey: crypto.randomUUID(),
        })
        .expect(201);
    const first = (await create()).body.id,
      second = (await create()).body.id;
    const hold = {
      orderId: first,
      reason: 'Fuga peligrosa verificada',
      idempotencyKey: crypto.randomUUID(),
    };
    await call('post', `/unit-readiness/${unit}/holds`).send(hold).expect(403);
    const created = (
      await call('post', `/unit-readiness/${unit}/holds`, 'logistics')
        .send(hold)
        .expect(201)
    ).body;
    expect(
      (
        await call('post', `/unit-readiness/${unit}/holds`, 'logistics')
          .send(hold)
          .expect(201)
      ).body.id,
    ).toBe(created.id);
    await call('post', `/unit-readiness/${unit}/holds`, 'mechanic')
      .send({
        ...hold,
        orderId: second,
        reason: 'Otro bloqueo',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(201);
    const row = (await call('get', `/unit-readiness/${unit}`).expect(200)).body
      .items[0];
    expect(row.orders).toHaveLength(2);
    const activeOrder = row.orders.find((o: { id: string }) => o.id === first);
    await call('post', `/unit-readiness/${unit}/orders/${first}/assign`)
      .send({
        assignedActorId: 'mechanic',
        expectedVersion: activeOrder.version,
      })
      .expect(201);
    await call('post', `/unit-readiness/${unit}/orders/${first}/assign`)
      .send({
        assignedActorId: 'mechanic',
        expectedVersion: activeOrder.version,
      })
      .expect(409);
    expect(row.holds).toHaveLength(2);
    expect(row.attention).toBe('CRITICAL');
    const verification = {
      orderId: first,
      holdIds: [created.id],
      observation: 'Verifiqué personalmente la reparación de la fuga.',
      signatureDataUrl: signaturePng(),
      idempotencyKey: crypto.randomUUID(),
    };
    await call('post', `/unit-readiness/${unit}/verifications`, 'mechanic')
      .send(verification)
      .expect(409);
    await db.query(
      "UPDATE visitas SET estado='CERRADO', work_order_status='COMPLETED', completed_at=now(), cerrado_at=now(), legacy_compat_draft=false WHERE id=$1",
      [first],
    );
    await call('post', `/unit-readiness/${unit}/verifications`, 'logistics')
      .send(verification)
      .expect(403);
    const verified = (
      await call('post', `/unit-readiness/${unit}/verifications`, 'mechanic')
        .send(verification)
        .expect(201)
    ).body;
    expect(
      (
        await call('post', `/unit-readiness/${unit}/verifications`, 'mechanic')
          .send(verification)
          .expect(201)
      ).body.id,
    ).toBe(verified.id);
    const after = (await call('get', `/unit-readiness/${unit}`).expect(200))
      .body.items[0];
    expect(after.holds).toHaveLength(1);
    expect(after.holds[0].orderId).toBe(second);
    expect(after.technicalReady).toBe(false);
    expect(
      (
        await db
          .getRepository(ReadinessHold)
          .findOneByOrFail({ id: created.id })
      ).verificationId,
    ).toBe(verified.id);
    await call('post', `/unit-readiness/${unit}/verifications`, 'mechanic')
      .send({ ...verification, observation: 'Contenido cambiado' })
      .expect(409);
  });
  it('generates once per daily period, reuses pending checks and creates the next day despite legacy validity', async () => {
    const service = app.get(CanonicalOrdersService);
    const system: TrustedActor = {
      ...actor,
      subject: 'system:schedule',
      roles: ['SYSTEM'],
    };
    let day = operationalDay(new Date()).operationalDate;
    const run = () =>
      service.generateDailyVehicleChecks(
        'mex',
        day,
        crypto.randomUUID(),
        system,
      );
    const results = await Promise.all([run(), run()]);
    const created = results
      .flatMap((r) => r.items)
      .filter((r) => r.outcome === 'CREATED');
    expect(created).toHaveLength(1);
    const id = created[0].checkId as string;
    // Explicit database fixture: completion/expiry are input facts for scheduling;
    // this does not stand in for the separate signature/evidence pipeline tests.
    await db.transaction(async (m) => {
      await m.query(
        "UPDATE visitas SET work_order_status='COMPLETED', completed_at=now() WHERE id=$1",
        [id],
      );
      await m.query(
        "UPDATE check_inspections SET result='FIT', snapshot_hash=$2, day_end_instant=now()+interval '1 hour' WHERE visita_id=$1",
        [id, 'a'.repeat(64)],
      );
    });
    expect((await run()).items[0].outcome).toBe('SKIPPED_VALID');
    await db.query(
      "UPDATE check_inspections SET day_end_instant=now()-interval '1 second' WHERE visita_id=$1",
      [id],
    );
    const due = await Promise.all([run(), run()]);
    expect(
      due.flatMap((r) => r.items).filter((r) => r.outcome === 'CREATED'),
    ).toHaveLength(0);
    // The signed record stays intact while the current operational day advances.
    const clock = jest.spyOn(Date, 'now');
    const OriginalDate = global.Date;
    const tomorrow = new OriginalDate(
      operationalDay(new OriginalDate()).dayEndInstant.getTime() + 60_000,
    );
    try {
      jest.useFakeTimers({
        now: tomorrow,
        doNotFake: [
          'nextTick',
          'setImmediate',
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'performance',
          'hrtime',
        ],
      });
      day = operationalDay(new Date()).operationalDate;
      await db.query(
        'UPDATE check_inspections SET day_end_instant=$2 WHERE visita_id=$1',
        [id, new OriginalDate(tomorrow.getTime() + 7 * 86400000)],
      );
      const next = await Promise.all([run(), run()]);
      expect(
        next.flatMap((r) => r.items).filter((r) => r.outcome === 'CREATED'),
      ).toHaveLength(1);
      expect((await run()).items[0].outcome).toBe('SKIPPED_ACTIVE');
    } finally {
      jest.useRealTimers();
      clock.mockRestore();
    }
    expect(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM check_readiness_generations',
        )
      )[0].n,
    ).toBe(2);
  });
  it('refuses destructive rollback once readiness evidence/config exists', async () => {
    const runner = db.createQueryRunner();
    try {
      await expect(
        new UnitReadiness1792195200001().down(runner),
      ).rejects.toThrow('FORWARD_RECOVERY_REQUIRED');
    } finally {
      await runner.release();
    }
  });
});
