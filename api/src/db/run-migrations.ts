import { createMigrationDataSource } from './migration-data-source';

async function run() {
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  )
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.EWO_DISPOSABLE_DB !== 'true'
  )
    throw new Error(
      'EWO-015 runner is restricted to explicitly disposable databases.',
    );
  const db = createMigrationDataSource();
  await db.initialize();
  try {
    const [{ name }] = await db.query('SELECT current_database() AS name');
    if (
      !name.endsWith('_test') ||
      process.env.MIGRATION_DISPOSABLE_DATABASE !== name
    )
      throw new Error(
        'Confirmed disposable database name does not match effective connection.',
      );
    if (process.argv[2] === 'down')
      await db.undoLastMigration({ transaction: 'all' });
    else if (process.argv[2] === 'up')
      console.log(
        (await db.runMigrations({ transaction: 'all' })).map((m) => m.name),
      );
    else throw new Error('Expected up or down');
  } finally {
    await db.destroy();
  }
}
void run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});
