import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from './postgres-options';
import { MaintenanceAnalysis1792281600000 } from './migrations/1792281600000-MaintenanceAnalysis';

async function run() {
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  )
    throw new Error('Require DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false.');
  const db = new DataSource({
    ...postgresConnectionOptions({
      get: <T = string>(k: string, fallback?: T) =>
        (process.env[k] ?? fallback) as T | undefined,
    }),
    synchronize: false,
    dropSchema: false,
    migrationsTableName: 'maintenance_analysis_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [MaintenanceAnalysis1792281600000],
  });
  await db.initialize();
  try {
    const [{ current_database: target }] = await db.query(
      'SELECT current_database()',
    );
    const command = process.argv[2] ?? 'inspect';
    if (command === 'inspect') {
      console.log({ database: target, pending: await db.showMigrations() });
      return;
    }
    if (process.env.MAINTENANCE_MIGRATION_TARGET !== target)
      throw new Error(
        'MAINTENANCE_MIGRATION_TARGET must match the verified database name.',
      );
    await db.transaction(async (m) => {
      await m.query(
        "SELECT pg_advisory_xact_lock(hashtext('maintenance-analysis-migrations'))",
      );
      if (command === 'up')
        console.log((await db.runMigrations()).map((x) => x.name));
      else if (command === 'down') await db.undoLastMigration();
      else throw new Error('Use inspect, up or down.');
    });
  } finally {
    await db.destroy();
  }
}
void run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'Migration failed');
  process.exitCode = 1;
});
