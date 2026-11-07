import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import { backfillUnitSucursal } from '../src/db/unit-sucursal-backfill';

const supervisor: TrustedActor = {
  subject: 'trusted|supervisor',
  displayName: 'Supervisor',
  roles: [Rol.SUPERVISOR],
  facilityScopes: ['monterrey'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};

// EWO-068: backfill of units that exist without a sucursal.
describe('EWO-068 backfill de sucursal', () => {
  let app: INestApplication, db: DataSource, driver: string;
  const count = async (sql: string) => Number((await db.query(sql))[0].c);
  const snapshot = () =>
    db.query(
      'SELECT unidad_id, facility_id, version FROM vehicle_facilities ORDER BY unidad_id',
    );
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({ kind: 'TRUSTED', authenticate: async () => supervisor })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    for (const [id, name] of [
      ['monterrey', 'Monterrey'],
      ['saltillo', 'Saltillo'],
    ])
      await db.query(
        `INSERT INTO facilities(id,name,timezone,version) VALUES ($1,$2,'America/Mexico_City',1)`,
        [id, name],
      );
    driver = (await db.query('SELECT id FROM choferes LIMIT 1'))[0].id;
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('AC-1: el ensayo no escribe y reporta unidades, ya ligadas y si existe la sucursal', async () => {
    const units = await count('SELECT count(*) c FROM unidades');
    expect(units).toBeGreaterThan(1);
    const report = await backfillUnitSucursal(db, 'monterrey', false);
    expect(report).toMatchObject({
      mode: 'DRY_RUN',
      facilityId: 'monterrey',
      facilityExists: true,
      totalUnits: units,
      alreadyMapped: 0,
      applied: 0,
    });
    expect(report.toMap).toHaveLength(units);
    expect(await count('SELECT count(*) c FROM vehicle_facilities')).toBe(0);
    const missing = await backfillUnitSucursal(db, 'no-existe', false);
    expect(missing.facilityExists).toBe(false);
  });

  it('AC-5: una sucursal desconocida aborta antes de escribir', async () => {
    await expect(backfillUnitSucursal(db, 'no-existe', true)).rejects.toThrow(
      'SUCURSAL_NOT_FOUND',
    );
    expect(await count('SELECT count(*) c FROM vehicle_facilities')).toBe(0);
  });

  it('AC-2/AC-4: liga solo las unidades sin sucursal y respeta las ya ligadas', async () => {
    const [first] = await db.query(
      'SELECT id FROM unidades ORDER BY id LIMIT 1',
    );
    await db.query(
      `INSERT INTO vehicle_facilities(unidad_id,facility_id,version) VALUES ($1,'saltillo',4)`,
      [first.id],
    );
    const units = await count('SELECT count(*) c FROM unidades');
    const report = await backfillUnitSucursal(db, 'monterrey', true);
    expect(report).toMatchObject({
      mode: 'APPLY',
      alreadyMapped: 1,
      applied: units - 1,
    });
    expect(await count('SELECT count(*) c FROM vehicle_facilities')).toBe(
      units,
    );
    const rows = await snapshot();
    expect(
      rows.find((r: { unidad_id: string }) => r.unidad_id === first.id),
    ).toMatchObject({
      facility_id: 'saltillo',
      version: 4,
    });
    expect(
      rows.filter(
        (r: { facility_id: string }) => r.facility_id === 'monterrey',
      ),
    ).toHaveLength(units - 1);
  });

  it('AC-3: repetirlo no cambia nada', async () => {
    const before = await snapshot();
    const report = await backfillUnitSucursal(db, 'monterrey', true);
    expect(report).toMatchObject({ applied: 0, toMap: [] });
    expect(await snapshot()).toEqual(before);
  });

  it('AC-6: tras el backfill el supervisor de la sucursal crea una orden y la preparación responde 200', async () => {
    const [unit] = await db.query(
      `SELECT unidad_id AS id FROM vehicle_facilities WHERE facility_id='monterrey' LIMIT 1`,
    );
    const auth = { Authorization: 'Bearer x' };
    await request(app.getHttpServer())
      .get(`/unit-readiness/${unit.id}`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/unidades/${unit.id}/mantenimiento-ordenes`)
      .set(auth)
      .send({
        type: 'PREVENTIVE',
        choferId: driver,
        km: 5000,
        blocksOperation: false,
      })
      .expect(201);
  });
});
