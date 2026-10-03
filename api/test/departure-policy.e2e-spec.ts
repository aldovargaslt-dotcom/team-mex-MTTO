import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/auth/roles.enum';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { configureApp } from '../src/configure-app';
import { operationalDay } from '../src/visitas/checks/facility-calendar';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';

const LOGISTICS = { Authorization: 'Bearer logistics' };
const LEGACY_ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'admin' };
const LEGACY_LOGISTICS = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'logistics' };
const actor: TrustedActor = {
  subject: 'trusted|departure',
  displayName: 'Departure fixture',
  roles: [Rol.LOGISTICA],
  facilityScopes: ['departure-mex'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const signature = 'data:image/png;base64,aQ==';

describe('EWO-022 shared departure policy (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let typeId: string;
  let sitioId: string;
  const operationalDate = operationalDay(new Date()).operationalDate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) =>
          req.headers.authorization === 'Bearer logistics' ? actor : null,
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await db.getRepository(Facility).save({
      id: 'departure-mex',
      name: 'Departure test facility',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    typeId = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0].id;
    sitioId = (
      await db.query("SELECT id FROM flota.sitios WHERE nombre='Patio' LIMIT 1")
    )[0].id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function createUnit(ready = true) {
    const suffix = randomUUID().slice(0, 8);
    const response = await request(app.getHttpServer())
      .post('/unidades')
      .set(LEGACY_ADMIN)
      .send({
        numeroInterno: `DEP-${suffix}`,
        placas: `D-${suffix}`,
        tipoId: typeId,
      })
      .expect(201);
    const unidadId = response.body.id as string;
    await db.getRepository(VehicleFacility).save({
      unidadId,
      facilityId: 'departure-mex',
      version: 1,
    });
    if (ready) {
      await request(app.getHttpServer())
        .post(`/flota/unidades/${unidadId}/estado-fisico`)
        .set(LEGACY_LOGISTICS)
        .send({ state: 'EN_PATIO', reason: 'Fixture lista en patio' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/unidades/${unidadId}/documentos/poliza-seguro/versions`)
        .set(LOGISTICS)
        .send({ expirationDate: shiftDate(operationalDate, 1) })
        .expect(403);
      await db.query(
        `INSERT INTO vehicle_documents.document_versions
          (id,unidad_id,document_type,expiration_date,version,"current",created_by)
         VALUES ($1,$2,'POLIZA_SEGURO',$3,1,true,$4)`,
        [randomUUID(), unidadId, shiftDate(operationalDate, 1), actor.subject],
      );
      await signCheck(unidadId);
    }
    return unidadId;
  }

  async function signCheck(unidadId: string) {
    const checkId = randomUUID();
    const day = operationalDay(new Date());
    await db.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO visitas
        (id,unidad_id,estado,tipo,work_order_type,work_order_status,version,legacy_compat_draft,
         migration_backfilled,blocks_operation,requires_reinspection,attribution_level,
         created_by,completed_at)
       VALUES ($1,$2,NULL,NULL,'CHECK','COMPLETED',3,false,false,false,false,
         'SERVER_VERIFIED',$3,now())`,
        [checkId, unidadId, actor.subject],
      );
      await manager.query(
        `INSERT INTO check_inspections
        (visita_id,source,facility_id,operational_date,timezone,calendar_version,
         mapping_version,day_end_instant,result,snapshot_hash)
       VALUES ($1,'CHECK_OUT','departure-mex',$2,'America/Mexico_City',1,1,$3,
         'FIT',$4)`,
        [checkId, day.operationalDate, day.dayEndInstant, 'a'.repeat(64)],
      );
    });
    return checkId;
  }

  async function createDriver() {
    const id = randomUUID();
    await db.query(
      `INSERT INTO choferes(id,nombre,estado) VALUES ($1,$2,'ACTIVO')`,
      [id, `Chofer ${id.slice(0, 8)}`],
    );
    return id;
  }

  it('blocks both gateways with the same missing prerequisites', async () => {
    const unidadId = await createUnit(false);
    const driverId = await createDriver();
    const logistics = await request(app.getHttpServer())
      .post(`/logistica/salidas/${unidadId}`)
      .set(LOGISTICS)
      .send({ ambito: 'LOCAL' })
      .expect(409);
    expect(logistics.body).toMatchObject({ code: 'DEPARTURE_BLOCKED' });
    expect(logistics.body.details.reasons).toEqual(
      expect.arrayContaining([
        'PHYSICAL_STATE_REQUIRED',
        'INSURANCE_REQUIRED',
        'CHECK_REQUIRED',
      ]),
    );

    const fleet = await request(app.getHttpServer())
      .post('/flota/movimientos')
      .set(LOGISTICS)
      .send(movement('SALIDA', unidadId, driverId))
      .expect(409);
    expect(fleet.body.code).toBe('DEPARTURE_BLOCKED');
  });

  it('authorizes Logística atomically and records signed validation refs', async () => {
    const unidadId = await createUnit();
    await request(app.getHttpServer())
      .post(`/logistica/salidas/${unidadId}`)
      .set(LOGISTICS)
      .send({ ambito: 'LOCAL', destino: 'Ruta norte' })
      .expect(204);
    const [unit] = await db.query(
      'SELECT ops_estado,salida_at FROM unidades WHERE id=$1',
      [unidadId],
    );
    expect(unit.ops_estado).toBe('EN_RUTA');
    const [audit] = await db.query(
      `SELECT source_check_id,snapshot_hash,validation_refs
       FROM logistica_departure_audits WHERE unidad_id=$1`,
      [unidadId],
    );
    expect(audit.source_check_id).toBeTruthy();
    expect(audit.snapshot_hash).toBe('a'.repeat(64));
    expect(audit.validation_refs.operationalDate).toBe(operationalDate);

    const duplicate = await request(app.getHttpServer())
      .post(`/logistica/salidas/${unidadId}`)
      .set(LOGISTICS)
      .send({ ambito: 'LOCAL', destino: 'Segundo viaje' })
      .expect(409);
    expect(duplicate.body.details.reasons).toContain(
      'JOURNEY_ALREADY_IN_ROUTE',
    );
  });

  it('keeps Flota CHOFER/AVAL and allows ENTRADA after CHECK/doc expiry', async () => {
    const unidadId = await createUnit();
    const driverId = await createDriver();
    const salida = await request(app.getHttpServer())
      .post('/flota/movimientos')
      .set(LOGISTICS)
      .send(movement('SALIDA', unidadId, driverId))
      .expect(201);
    expect(salida.body.movimiento).toMatchObject({
      sourceCheckId: expect.any(String),
      snapshotHash: 'a'.repeat(64),
    });
    await db.query(
      `UPDATE vehicle_documents.document_versions
       SET expiration_date=$2 WHERE unidad_id=$1 AND "current"=true`,
      [unidadId, operationalDate],
    );
    await db.query(
      `INSERT INTO check_invalidations
        (id,check_id,unidad_id,type,reason,source_event_id,actor_id,actor_name)
       SELECT $1,id,$2,'INCIDENT_DAMAGE','Fixture invalidation',$3,$4,$5
       FROM visitas WHERE unidad_id=$2 AND work_order_type='CHECK'`,
      [randomUUID(), unidadId, randomUUID(), actor.subject, actor.displayName],
    );
    await request(app.getHttpServer())
      .post('/flota/movimientos')
      .set(LOGISTICS)
      .send(movement('ENTRADA', unidadId, driverId))
      .expect(201);
  });

  it('serializes invalidation against dispatch and revalidates after the lock', async () => {
    const unidadId = await createUnit();
    const [check] = await db.query(
      "SELECT id FROM visitas WHERE unidad_id=$1 AND work_order_type='CHECK'",
      [unidadId],
    );
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`unit-operation:${unidadId}`],
    );
    await runner.query(
      `INSERT INTO check_invalidations
        (id,check_id,unidad_id,type,reason,source_event_id,actor_id,actor_name)
       VALUES ($1,$2,$3,'INCIDENT_DAMAGE','Concurrent invalidation',$4,$5,$6)`,
      [
        randomUUID(),
        check.id,
        unidadId,
        randomUUID(),
        actor.subject,
        actor.displayName,
      ],
    );
    const pending = request(app.getHttpServer())
      .post(`/logistica/salidas/${unidadId}`)
      .set(LOGISTICS)
      .send({ ambito: 'LOCAL' })
      .then((response) => response);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await runner.commitTransaction();
    await runner.release();
    const response = await pending;
    expect(response.status).toBe(409);
    expect(response.body.details.reasons).toContain('CHECK_INVALIDATED');
    expect(
      (
        await db.query('SELECT ops_estado FROM unidades WHERE id=$1', [
          unidadId,
        ])
      )[0].ops_estado,
    ).toBe('DISPONIBLE');
  });

  it('allows a Logística return even when authorization sources became invalid', async () => {
    const unidadId = await createUnit();
    await request(app.getHttpServer())
      .post(`/logistica/salidas/${unidadId}`)
      .set(LOGISTICS)
      .send({ ambito: 'FORANEO', destino: 'Retorno seguro' })
      .expect(204);
    await db.query(
      `UPDATE vehicle_documents.document_versions
       SET expiration_date=$2 WHERE unidad_id=$1 AND "current"=true`,
      [unidadId, operationalDate],
    );
    await request(app.getHttpServer())
      .post(`/logistica/regresos/${unidadId}`)
      .set(LEGACY_LOGISTICS)
      .expect(204);
  });

  function movement(
    tipo: 'SALIDA' | 'ENTRADA',
    unidadId: string,
    choferId: string,
  ) {
    return {
      tipo,
      unidadId,
      choferId,
      sitioId,
      occurredAt: new Date().toISOString(),
      km: tipo === 'SALIDA' ? 100 : 110,
      firmas: [
        { tipo: 'CHOFER', dataUrl: signature },
        { tipo: 'AVAL', dataUrl: signature },
      ],
    };
  }
});

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
