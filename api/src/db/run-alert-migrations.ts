import { createAlertMigrationDataSource } from './alert-migration-data-source';

async function run() {
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  ) {
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  }
  const db = createAlertMigrationDataSource();
  await db.initialize();
  try {
    const [{ name }] = await db.query('SELECT current_database() AS name');
    if (!name || process.env.ALERT_MIGRATION_DATABASE !== name) {
      throw new Error(
        'ALERT_MIGRATION_DATABASE must match the effective database.',
      );
    }
    console.log(
      (await db.runMigrations({ transaction: 'all' })).map(
        (migration) => migration.name,
      ),
    );
  } finally {
    await db.destroy();
  }
}
void run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Alert migration failed',
  );
  process.exitCode = 1;
});
