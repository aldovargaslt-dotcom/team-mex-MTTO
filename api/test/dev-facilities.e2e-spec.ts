import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { seedDevFacilities } from '../src/seed/dev-facilities';

// EWO-069 AC-2 / AC-4: the dev seed is idempotent and never runs outside development.
describe('EWO-069 sucursales de desarrollo', () => {
  let app: INestApplication, db: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  const count = async (table: string) =>
    Number((await db.query(`SELECT count(*) c FROM ${table}`))[0].c);

  it('AC-4: arrancar con NODE_ENV distinto de development no crea sucursales ni vínculos', async () => {
    expect(process.env.NODE_ENV).not.toBe('development');
    expect(await count('facilities')).toBe(0);
    expect(await count('vehicle_facilities')).toBe(0);
    expect(await count('unidades')).toBeGreaterThan(0);
  });

  it('AC-2: siembra 10 sucursales y liga las unidades de demostración a monterrey', async () => {
    await seedDevFacilities(db.manager);
    expect(await count('facilities')).toBe(10);
    const mapped = await db.query(
      `SELECT count(*) c, count(DISTINCT facility_id) f FROM vehicle_facilities`,
    );
    expect(Number(mapped[0].c)).toBe(await count('unidades'));
    expect(Number(mapped[0].f)).toBe(1);
    expect(
      (await db.query('SELECT DISTINCT facility_id FROM vehicle_facilities'))[0]
        .facility_id,
    ).toBe('monterrey');
  });

  it('es idempotente y no pisa un vínculo existente; liga solo las unidades sin sucursal', async () => {
    const [first] = await db.query(
      'SELECT id FROM unidades ORDER BY id LIMIT 1',
    );
    await db.query(
      `UPDATE vehicle_facilities SET facility_id='tampico', version=3 WHERE unidad_id=$1`,
      [first.id],
    );
    const [type] = await db.query('SELECT id FROM tipos_vehiculo LIMIT 1');
    const [extra] = await db.query(
      `INSERT INTO unidades(id, numero_interno, placas, estado, tipo_id)
       VALUES (gen_random_uuid(),'DEV-EXTRA','DEV-EXTRA','ACTIVA',$1) RETURNING id`,
      [type.id],
    );
    const snapshot = () =>
      db.query(
        'SELECT unidad_id, facility_id, version FROM vehicle_facilities ORDER BY unidad_id',
      );
    await seedDevFacilities(db.manager);
    const after = await snapshot();
    expect(
      after.find((r: { unidad_id: string }) => r.unidad_id === first.id),
    ).toMatchObject({
      facility_id: 'tampico',
      version: 3,
    });
    expect(
      after.find((r: { unidad_id: string }) => r.unidad_id === extra.id),
    ).toMatchObject({
      facility_id: 'monterrey',
      version: 1,
    });
    await seedDevFacilities(db.manager);
    expect(await snapshot()).toEqual(after);
    expect(await count('facilities')).toBe(10);
  });
});
