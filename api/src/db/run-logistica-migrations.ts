import { controlledLogisticaMigration } from './controlled-logistica-migration';
import { createLogisticaMigrationDataSource } from './logistica-migration-data-source';
async function run() {
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  )
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  const db = createLogisticaMigrationDataSource();
  await db.initialize();
  try {
    console.log(await controlledLogisticaMigration(db, process.argv[2]));
  } finally {
    await db.destroy();
  }
}
void run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Logistics migration failed',
  );
  process.exitCode = 1;
});
