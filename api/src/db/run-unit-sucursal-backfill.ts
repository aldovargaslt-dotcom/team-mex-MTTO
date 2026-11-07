import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from './postgres-options';
import {
  backfillUnitSucursal,
  parseBackfillArgs,
} from './unit-sucursal-backfill';

/**
 * EWO-068. Dry run by default; `--apply` writes. Same guards as the other
 * controlled runners: explicit synchronize/drop flags and the exact database
 * name. Usage (after build):
 *   UNIT_SUCURSAL_BACKFILL_DATABASE=<db> DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false \
 *     node dist/db/run-unit-sucursal-backfill.js --facility=monterrey [--apply]
 */
async function run() {
  const { facilityId, apply } = parseBackfillArgs(process.argv.slice(2));
  if (
    process.env.DB_SYNCHRONIZE !== 'false' ||
    process.env.DB_DROP_SCHEMA !== 'false'
  )
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  const db = new DataSource({
    ...postgresConnectionOptions({
      get: <T = string>(key: string, fallback?: T) =>
        (process.env[key] ?? fallback) as T | undefined,
    }),
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
  });
  await db.initialize();
  try {
    const [{ name }] = await db.query('SELECT current_database() AS name');
    if (!name || process.env.UNIT_SUCURSAL_BACKFILL_DATABASE !== name)
      throw new Error(
        'UNIT_SUCURSAL_BACKFILL_DATABASE must match the effective database.',
      );
    const report = await backfillUnitSucursal(db, facilityId, apply);
    console.log(JSON.stringify({ database: name, ...report }, null, 2));
    if (!apply)
      console.log('DRY RUN: nada se escribió. Use --apply para aplicar.');
  } finally {
    await db.destroy();
  }
}
void run().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Sucursal backfill failed',
  );
  process.exitCode = 1;
});
