import { DataSource, MigrationExecutor, QueryRunner } from 'typeorm';
import { auditLegacy, verifyFoundation } from './check-foundation';

const tables = [
  'tipos_vehiculo',
  'choferes',
  'unidades',
  'visitas',
  'visita_trabajos',
  'visita_fotos',
  'visita_firmas',
  'visita_piezas',
  'outbox_events',
];
const quote = (name: string) => '"' + name.replace(/"/g, '""') + '"';

async function inspect(q: QueryRunner, db: DataSource) {
  const [{ name }] = await q.query('SELECT current_database() AS name');
  for (const table of tables) {
    const [{ exists }] = await q.query(
      'SELECT to_regclass($1) IS NOT NULL AS exists',
      [`public.${table}`],
    );
    if (!exists) throw new Error(`LEGACY_TABLE_MISSING: ${table}`);
  }
  const [{ exists }] = await q.query(
    "SELECT to_regclass('public.chk_schema_migrations') IS NOT NULL AS exists",
  );
  const applied: { name: string }[] = exists
    ? await q.query(
        'SELECT name FROM public.chk_schema_migrations ORDER BY timestamp,id',
      )
    : [];
  const expected = db.migrations.map((m) => m.name || m.constructor.name);
  const complete =
    applied.length === expected.length &&
    applied.every((m, i) => m.name === expected[i]);
  if (applied.length && !complete)
    throw new Error('MIGRATION_HISTORY_PARTIAL_OR_UNKNOWN');
  if (complete) await verifyFoundation(q);
  else {
    const drift =
      await q.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='visitas'
      AND column_name IN ('work_order_type','work_order_status','legacy_compat_draft')`);
    const [{ facility }] = await q.query(
      "SELECT to_regclass('public.facilities') IS NOT NULL AS facility",
    );
    if (drift.length || facility)
      throw new Error('SCHEMA_DRIFT_WITHOUT_MIGRATION_HISTORY');
    await auditLegacy(q);
  }
  return {
    database: name as string,
    state: complete ? 'COMPLETE' : 'LEGACY',
    pending: complete ? [] : expected,
  };
}

type Snapshot = {
  table: string;
  columns: string[];
  count: string;
  checksum: string;
};
async function snapshot(
  q: QueryRunner,
  prior?: Snapshot[],
): Promise<Snapshot[]> {
  const result: Snapshot[] = [];
  for (const table of tables) {
    const columns =
      prior?.find((s) => s.table === table)?.columns ??
      (
        await q.query(
          `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
          [table],
        )
      ).map((c: { column_name: string }) => c.column_name);
    const [data] = await q.query(`SELECT count(*)::text AS count,
      md5(COALESCE(string_agg(md5(to_jsonb(original)::text), ',' ORDER BY id::text), '')) AS checksum
      FROM (SELECT ${columns.map(quote).join(',')} FROM public.${quote(table)}) original`);
    result.push({ table, columns, count: data.count, checksum: data.checksum });
  }
  return result;
}

export async function controlledCheckMigration(
  db: DataSource,
  action: string,
  env: NodeJS.ProcessEnv,
) {
  if (!['inspect', 'apply'].includes(action))
    throw new Error('Expected inspect or apply; down is unsupported.');
  if (env.DB_SYNCHRONIZE !== 'false' || env.DB_DROP_SCHEMA !== 'false')
    throw new Error(
      'Set DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false explicitly.',
    );
  if (
    action === 'apply' &&
    (env.CHK_LEGACY_WRITERS_DRAINED !== 'true' ||
      env.CHECK_MIGRATION_WITHOUT_BACKUP !== 'ACKNOWLEDGED')
  )
    throw new Error(
      'Apply requires drained writers and CHECK_MIGRATION_WITHOUT_BACKUP=ACKNOWLEDGED.',
    );
  const q = db.createQueryRunner();
  await q.connect();
  try {
    await q.startTransaction('REPEATABLE READ');
    if (action === 'inspect') await q.query('SET TRANSACTION READ ONLY');
    await q.query("SET LOCAL lock_timeout = '5s'");
    await q.query("SET LOCAL statement_timeout = '120s'");
    const [{ name }] = await q.query('SELECT current_database() AS name');
    if (!name || env.CHECK_MIGRATION_DATABASE !== name)
      throw new Error(
        'CHECK_MIGRATION_DATABASE must match the effective database.',
      );
    if (action === 'apply') {
      const [{ locked }] = await q.query(
        'SELECT pg_try_advisory_xact_lock(825027) AS locked',
      );
      if (!locked) throw new Error('MIGRATION_ALREADY_RUNNING');
      await q.query(
        `LOCK TABLE ${tables.map((t) => `public.${quote(t)}`).join(',')} IN ACCESS EXCLUSIVE MODE`,
      );
    }
    const report = await inspect(q, db);
    const before = await snapshot(q);
    if (action === 'inspect') {
      await q.rollbackTransaction();
      return {
        ...report,
        preserved: before.map(({ table, count }) => ({ table, count })),
        applied: [],
      };
    }
    // Same connection and transaction keep locks, DDL, backfill and history atomic.
    const executor = new MigrationExecutor(db, q);
    executor.transaction = 'all';
    const applied = await executor.executePendingMigrations();
    await verifyFoundation(q);
    const after = await snapshot(q, before);
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error('LEGACY_PRESERVATION_FAILED');
    await q.query('SET CONSTRAINTS ALL IMMEDIATE');
    await q.commitTransaction();
    return {
      ...report,
      state: 'COMPLETE',
      pending: [],
      preserved: after.map(({ table, count }) => ({ table, count })),
      applied: applied.map((m) => m.name),
    };
  } catch (error) {
    if (q.isTransactionActive) await q.rollbackTransaction();
    throw error;
  } finally {
    await q.release();
  }
}
