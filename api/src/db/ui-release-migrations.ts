import { DataSource } from 'typeorm';
import { createAlertMigrationDataSource } from './alert-migration-data-source';
import { createOrdersMigrationDataSource } from './orders-migration-data-source';
import { PostgresConnectionOptions } from './postgres-options';

/** The two authorized additive release migrations, protected by ledgers and a lock. */
export async function migrateUiRelease(
  connection: PostgresConnectionOptions,
  flags: { synchronize?: string; dropSchema?: string },
) {
  if (flags.synchronize !== 'false' || flags.dropSchema !== 'false') {
    throw new Error('UI release requires DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false.');
  }
  const expected = connection.url
    ? decodeURIComponent(new URL(connection.url).pathname.slice(1))
    : connection.database;
  if (!expected) throw new Error('An explicit database name is required.');
  const lockDb = new DataSource({ ...connection, synchronize: false, dropSchema: false });
  await lockDb.initialize();
  const lock = lockDb.createQueryRunner();
  let locked = false;
  try {
    await lock.connect();
    const [{ name }] = await lock.query('SELECT current_database() AS name');
    if (name !== expected) throw new Error('Connected database does not match the API configuration.');
    await lock.query("SET lock_timeout = '60s'");
    await lock.query('SELECT pg_advisory_lock(1791676800, 1791763200)');
    locked = true;
    const applied: string[] = [];
    for (const db of [createAlertMigrationDataSource(connection), createOrdersMigrationDataSource(connection)]) {
      await db.initialize();
      try {
        applied.push(...(await db.runMigrations({ transaction: 'all' })).map((migration) => migration.name));
      } finally {
        await db.destroy();
      }
    }
    return applied;
  } finally {
    if (locked) await lock.query('SELECT pg_advisory_unlock(1791676800, 1791763200)');
    await lock.release();
    await lockDb.destroy();
  }
}
