import { controlledLogisticaMigration } from '../src/db/controlled-logistica-migration';
import { DataSource } from 'typeorm';
import { createLogisticaMigrationDataSource } from '../src/db/logistica-migration-data-source';
import { postgresConnectionOptions } from '../src/db/postgres-options';
import { LogisticaJourneyHistory1792022400001 } from '../src/db/migrations/1792022400001-LogisticaJourneyHistory';

describe('LJ-08 isolated Logistics migration (synchronize=false)', () => {
  let db: DataSource;
  const id = '11111111-1111-4111-8111-111111111111';
  const closed = '22222222-2222-4222-8222-222222222222';
  const database = 'logistica_journey_migration_test';
  const control = (action: string) =>
    controlledLogisticaMigration(db, action, {
      ...process.env,
      DB_SYNCHRONIZE: 'false',
      DB_DROP_SCHEMA: 'false',
      LOGISTICA_MIGRATION_DATABASE: database,
    });
  const up = async () => (await control('up')).applied;
  beforeAll(async () => {
    if (process.env.EWO_DISPOSABLE_DB !== 'true' || process.env.DATABASE_URL)
      throw new Error('Disposable target required');
    const options = postgresConnectionOptions({
      get: <T = string>(k: string, d?: T) => (process.env[k] ?? d) as T,
    });
    const control = new DataSource({
      ...options,
      synchronize: false,
      dropSchema: false,
    });
    await control.initialize();
    const [{ name }] = await control.query('SELECT current_database() AS name');
    if (name !== 'team_mex_mtto_test')
      throw new Error('Unexpected test database');
    if (
      !(
        await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [
          database,
        ])
      ).length
    )
      await control.query('CREATE DATABASE ' + database);
    await control.destroy();
    db = createLogisticaMigrationDataSource({ ...options, database });
    await db.initialize();
    process.env.LOGISTICA_WRITERS_DRAINED = 'true';
    process.env.LOGISTICA_CAPTURE_COMMIT =
      '0d7d0b274961bab273d3d57d750c06664af5eed3';
  });
  afterAll(async () => {
    delete process.env.LOGISTICA_WRITERS_DRAINED;
    delete process.env.LOGISTICA_CAPTURE_COMMIT;
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await db.query('DROP SCHEMA public CASCADE');
    await db.query('CREATE SCHEMA public');
    await db.query(`CREATE TABLE unidades(id uuid PRIMARY KEY,ops_estado varchar NOT NULL,
      salida_at timestamptz,ambito varchar,destino varchar)`);
    await db.query(
      'CREATE TABLE logistica_departure_audits(id uuid PRIMARY KEY,unidad_id uuid NOT NULL)',
    );
    await db.query(
      "INSERT INTO unidades VALUES ($1,'EN_RUTA',NULL,'LOCAL','Observed only'),($2,'DISPONIBLE',NULL,'LOCAL',NULL)",
      [id, closed],
    );
  });
  it('additive up retains gaps and original audits; journal retry is no-op; pre-capture disposable down', async () => {
    expect(db.options.synchronize).toBe(false);
    expect(db.options.dropSchema).toBe(false);
    const audit = '33333333-3333-4333-8333-333333333333';
    await db.query('INSERT INTO logistica_departure_audits VALUES ($1,$2)', [
      audit,
      id,
    ]);
    expect((await up()).length).toBe(1);
    const rows = await db.query('SELECT * FROM logistica_journeys');
    expect(rows).toHaveLength(1);
    expect(rows[0].unidad_id).toBe(id);
    expect(rows[0].origin).toBe('LEGACY_OPEN');
    expect(rows[0].departed_effective_at).toBeNull();
    expect(rows[0].departure_actor_id).toBeNull();
    expect(rows[0].departure_audit_id).toBeNull();
    expect(rows[0].driver_id).toBeNull();
    expect(rows[0].legacy_observed_context.destino).toBe('Observed only');
    expect(
      (await db.query('SELECT * FROM logistica_departure_audits'))[0],
    ).toEqual({ id: audit, unidad_id: id });
    const epoch = (
      await db.query('SELECT * FROM logistica_journey_capture')
    )[0];
    expect(epoch.legacy_open_count).toBe(1);
    expect(epoch.boundary_at).toBeInstanceOf(Date);
    expect(await up()).toHaveLength(0);
    await control('down');
    expect(
      (await db.query("SELECT to_regclass('logistica_journeys') AS name"))[0]
        .name,
    ).toBeNull();
    expect(
      (await db.query('SELECT ops_estado FROM unidades WHERE id=$1', [id]))[0]
        .ops_estado,
    ).toBe('EN_RUTA');
  });
  it('failure rolls back DDL/data/journal then permits a clean retry', async () => {
    const q = db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    const original = q.query.bind(q);
    const spy = jest
      .spyOn(q, 'query')
      .mockImplementation(
        async (sql: string, params?: unknown[], structured?: boolean) => {
          if (sql.includes('INSERT INTO public.logistica_journeys'))
            throw new Error('injected migration failure');
          return original(sql, params, structured as true);
        },
      );
    await expect(
      new LogisticaJourneyHistory1792022400001().up(q),
    ).rejects.toThrow('injected');
    await q.rollbackTransaction();
    spy.mockRestore();
    await q.release();
    expect(
      (await db.query("SELECT to_regclass('logistica_journeys') AS name"))[0]
        .name,
    ).toBeNull();
    expect((await up()).length).toBe(1);
  });
  it('populated capture refuses destructive down and retains facts', async () => {
    await up();
    await db.query(
      'UPDATE unidades SET logistica_journey_revision=1 WHERE id=$1',
      [id],
    );
    await expect(control('down')).rejects.toThrow('FORWARD_RECOVERY');
    expect(await db.query('SELECT id FROM logistica_journeys')).toHaveLength(1);
  });
  it.each(['index', 'table', 'capture', 'journal', 'receipt-primary-key'])(
    'controlled retry refuses %s inconsistency instead of a false successful no-op',
    async (damaged) => {
      await up();
      if (damaged === 'index')
        await db.query('DROP INDEX logistica_journey_open_unit_idx');
      if (damaged === 'table')
        await db.query('DROP TABLE logistica_journey_commands');
      if (damaged === 'capture')
        await db.query('DELETE FROM logistica_journey_capture');
      if (damaged === 'receipt-primary-key')
        await db.query(
          'ALTER TABLE logistica_journey_commands DROP CONSTRAINT logistica_journey_commands_pkey',
        );
      if (damaged === 'journal')
        await db.query(
          "INSERT INTO logistica_schema_migrations(timestamp,name) VALUES (1792022400002,'UnknownMigration1792022400002')",
        );
      await expect(up()).rejects.toThrow(
        /LOGISTICA_(SCHEMA|CAPTURE|MIGRATION)/,
      );
    },
  );
  it('refuses schema drift without the dedicated journal', async () => {
    const q = db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      await new LogisticaJourneyHistory1792022400001().up(q);
      await q.commitTransaction();
    } finally {
      if (q.isTransactionActive) await q.rollbackTransaction();
      await q.release();
    }
    await expect(up()).rejects.toThrow(
      'LOGISTICA_SCHEMA_DRIFT_WITHOUT_HISTORY',
    );
  });
});
