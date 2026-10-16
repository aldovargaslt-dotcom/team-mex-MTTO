import { DataSource, MigrationExecutor, QueryRunner } from 'typeorm';
import { LOGISTICA_TABLES, verifyLogisticaSchema } from './logistica-schema';

async function inspect(db: DataSource, q: QueryRunner) {
  const [{ exists }] = await q.query(
    "SELECT to_regclass('public.logistica_schema_migrations') IS NOT NULL AS exists",
  );
  const applied: { name: string }[] = exists
    ? await q.query(
        'SELECT name FROM public.logistica_schema_migrations ORDER BY timestamp,id',
      )
    : [];
  const expected = db.migrations.map((m) => m.name || m.constructor.name);
  if (
    applied.length &&
    (applied.length !== expected.length ||
      applied.some((m, i) => m.name !== expected[i]))
  )
    throw new Error('LOGISTICA_MIGRATION_HISTORY_PARTIAL_OR_UNKNOWN');
  if (applied.length) {
    await verifyLogisticaSchema(q);
    return true;
  }
  const tables = await q.query(
    'SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename=ANY($2)',
    ['public', LOGISTICA_TABLES],
  );
  const columns =
    await q.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public'
    AND table_name='unidades' AND column_name IN ('active_logistica_journey_id','logistica_journey_revision')`);
  if (tables.length || columns.length)
    throw new Error('LOGISTICA_SCHEMA_DRIFT_WITHOUT_HISTORY');
  return false;
}
async function legacySnapshot(q: QueryRunner) {
  const [units] = await q.query(`SELECT count(*)::text AS count,
    md5(COALESCE(string_agg(md5((to_jsonb(u)-'active_logistica_journey_id'-'logistica_journey_revision')::text),',' ORDER BY id),'')) AS checksum FROM public.unidades u`);
  const [audits] = await q.query(`SELECT count(*)::text AS count,
    md5(COALESCE(string_agg(md5(to_jsonb(a)::text),',' ORDER BY id),'')) AS checksum FROM public.logistica_departure_audits a`);
  return JSON.stringify({ units, audits });
}
/** One connection owns locks, DDL, backfill, journal and postflight validation. */
export async function controlledLogisticaMigration(
  db: DataSource,
  action: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!['up', 'down', 'inspect'].includes(action))
    throw new Error('Use up, down or inspect explicitly.');
  if (env.DB_SYNCHRONIZE !== 'false' || env.DB_DROP_SCHEMA !== 'false')
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  if (action !== 'inspect' && env.LOGISTICA_WRITERS_DRAINED !== 'true')
    throw new Error('LOGISTICA_WRITERS_DRAINED_REQUIRED');
  const q = db.createQueryRunner();
  await q.connect();
  try {
    await q.startTransaction('REPEATABLE READ');
    if (action === 'inspect') await q.query('SET TRANSACTION READ ONLY');
    await q.query("SET LOCAL lock_timeout='5s'");
    await q.query("SET LOCAL statement_timeout='120s'");
    const [{ name }] = await q.query('SELECT current_database() AS name');
    if (!name || env.LOGISTICA_MIGRATION_DATABASE !== name)
      throw new Error(
        'LOGISTICA_MIGRATION_DATABASE must match the effective database.',
      );
    if (action !== 'inspect') {
      await q.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('logistica-schema-migrations',0))",
      );
      await q.query(
        'LOCK TABLE public.unidades,public.logistica_departure_audits IN ACCESS EXCLUSIVE MODE',
      );
    }
    const complete = await inspect(db, q);
    if (action === 'inspect') {
      await q.rollbackTransaction();
      return { state: complete ? 'COMPLETE' : 'LEGACY', applied: [] };
    }
    const before = await legacySnapshot(q);
    const executor = new MigrationExecutor(db, q);
    executor.transaction = 'all';
    let applied: string[] = [];
    if (action === 'down') {
      if (complete) await executor.undoLastMigration();
    } else {
      applied = (await executor.executePendingMigrations()).map((m) => m.name);
      await verifyLogisticaSchema(q);
    }
    if ((await legacySnapshot(q)) !== before)
      throw new Error('LOGISTICA_LEGACY_PRESERVATION_FAILED');
    await q.query('SET CONSTRAINTS ALL IMMEDIATE');
    await q.commitTransaction();
    return { state: action === 'up' ? 'COMPLETE' : 'LEGACY', applied };
  } catch (error) {
    if (q.isTransactionActive) await q.rollbackTransaction();
    throw error;
  } finally {
    await q.release();
  }
}
