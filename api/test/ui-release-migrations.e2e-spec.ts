import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { prepareUiRelease } from '../src/db/prepare-ui-release';
import { migrateUiRelease } from '../src/db/ui-release-migrations';
import { postgresConnectionOptions } from '../src/db/postgres-options';

describe('UI production release pre-deploy', () => {
  let app: INestApplication;
  let db: DataSource;
  const connection = postgresConnectionOptions({
    get: <T = string>(key: string, fallback?: T) => (process.env[key] ?? fallback) as T | undefined,
  });
  const flags = { synchronize: 'false', dropSchema: 'false' };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DataSource);
  });
  afterAll(async () => { if (app) await app.close(); });

  it('rejects synchronize/drop before touching the database', async () => {
    await expect(migrateUiRelease(connection, { ...flags, synchronize: 'true' })).rejects.toThrow('requires');
    await expect(migrateUiRelease(connection, { ...flags, dropSchema: 'true' })).rejects.toThrow('requires');
    await expect(migrateUiRelease(connection, {})).rejects.toThrow('requires');
  });

  it('skips the release guard outside production and rejects unsafe production flags', async () => {
    await expect(prepareUiRelease({ NODE_ENV: 'development' })).resolves.toEqual([]);
    await expect(prepareUiRelease({ NODE_ENV: 'production', DB_SYNCHRONIZE: 'true' })).rejects.toThrow('requires');
  });

  it('preserves existing data and serializes concurrent deploys without reapplying migrations', async () => {
    const beforeStock = await db.query('SELECT item_id, qty, min_qty FROM inventario.stock ORDER BY item_id');
    const beforeThresholds = await db.query('SELECT tipo_vehiculo_id, t_km, t_dias FROM andon.umbrales ORDER BY tipo_vehiculo_id');
    const beforeVisits = await db.query('SELECT id, estado, work_order_status FROM visitas ORDER BY id');
    await db.query('ALTER TABLE andon.umbrales DROP COLUMN critical_overdue_km, DROP COLUMN critical_overdue_days');
    await db.query('ALTER TABLE inventario.stock DROP COLUMN critical_qty');
    await db.query('DROP TABLE alert_catalog.threshold_change');
    await db.query('ALTER TABLE visitas DROP COLUMN opened_at, DROP COLUMN opened_by, DROP COLUMN opened_actor_name');
    await db.query('DROP TABLE IF EXISTS public.alert_attention_schema_migrations');
    await db.query('DROP TABLE IF EXISTS public.orders_opening_schema_migrations');
    await expect(db.query('SELECT critical_overdue_km FROM andon.umbrales LIMIT 1')).rejects.toMatchObject({ code: '42703' });
    const productionEnv = { ...process.env, NODE_ENV: 'production', DB_SYNCHRONIZE: 'false', DB_DROP_SCHEMA: 'false' };
    const results = await Promise.all([prepareUiRelease(productionEnv), migrateUiRelease(connection, flags)]);
    expect(results.map((result) => result.length).sort()).toEqual([0, 2]);
    expect(await migrateUiRelease(connection, flags)).toEqual([]);
    expect(await db.query('SELECT item_id, qty, min_qty FROM inventario.stock ORDER BY item_id')).toEqual(beforeStock);
    expect(await db.query('SELECT tipo_vehiculo_id, t_km, t_dias FROM andon.umbrales ORDER BY tipo_vehiculo_id')).toEqual(beforeThresholds);
    expect(await db.query('SELECT id, estado, work_order_status FROM visitas ORDER BY id')).toEqual(beforeVisits);
    const [{ count }] = await db.query('SELECT count(*) FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name IN ($3,$4,$5)', ['public', 'visitas', 'opened_at', 'opened_by', 'opened_actor_name']);
    expect(Number(count)).toBe(3);
    await app.close();
    const previous = { sync: process.env.DB_SYNCHRONIZE, drop: process.env.DB_DROP_SCHEMA };
    process.env.DB_SYNCHRONIZE = 'false';
    process.env.DB_DROP_SCHEMA = 'false';
    try {
      await prepareUiRelease(productionEnv);
      const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = module.createNestApplication();
      await app.init();
      await expect(app.get(DataSource).query('SELECT critical_overdue_km FROM andon.umbrales LIMIT 1')).resolves.toBeDefined();
    } finally {
      process.env.DB_SYNCHRONIZE = previous.sync;
      process.env.DB_DROP_SCHEMA = previous.drop;
    }
  });
});
