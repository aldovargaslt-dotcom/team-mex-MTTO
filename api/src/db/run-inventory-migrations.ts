import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from './postgres-options';
import { InventoryCosts1792108800001 } from './migrations/1792108800001-InventoryCosts';
async function run() {
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  )
    throw new Error('Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false.');
  const db = new DataSource({
    ...postgresConnectionOptions({
      get: <T = string>(key: string, fallback?: T) =>
        (process.env[key] ?? fallback) as T,
    }),
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    migrationsTableName: 'inventory_cost_schema_migrations',
    migrations: [InventoryCosts1792108800001],
  });
  await db.initialize();
  const lock = db.createQueryRunner();
  await lock.connect();
  try {
    const [{ name }] = await db.query('SELECT current_database() AS name');
    if (process.env.INVENTORY_MIGRATION_DATABASE !== name)
      throw new Error(
        'INVENTORY_MIGRATION_DATABASE must match the verified database.',
      );
    await lock.query(
      "SELECT pg_advisory_lock(hashtext('inventory-cost-migration'))",
    );
    try {
      console.log(
        (await db.runMigrations({ transaction: 'all' })).map((x) => x.name),
      );
    } finally {
      await lock.query(
        "SELECT pg_advisory_unlock(hashtext('inventory-cost-migration'))",
      );
    }
  } finally {
    await lock.release();
    await db.destroy();
  }
}
void run().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Migration failed');
  process.exitCode = 1;
});
