import { createMigrationDataSource } from './migration-data-source';
import { controlledCheckMigration } from './controlled-check-migration';

async function run() {
  const db = createMigrationDataSource();
  try {
    await db.initialize();
    console.log(
      JSON.stringify(
        await controlledCheckMigration(db, process.argv[2], process.env),
        null,
        2,
      ),
    );
  } catch (error) {
    // Connection errors may contain credentials; never print driver objects or SQL/data.
    const message = error instanceof Error ? error.message : '';
    console.error(
      /^(Expected |Set DB_|Apply requires |CHECK_MIGRATION_DATABASE |MIGRATION_|SCHEMA_DRIFT|LEGACY_TABLE_MISSING|LEGACY_PRESERVATION_FAILED)/.test(
        message,
      )
        ? message
        : 'CHECK_MIGRATION_ABORTED: database audit, constraints or connection failed; no automatic repair.',
    );
    process.exitCode = 1;
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
void run();
