import { createCostMigrationDataSource } from './cost-migration-data-source';

async function main() {
  if (process.env.DB_SYNCHRONIZE !== 'false' || process.env.DB_DROP_SCHEMA !== 'false')
    throw new Error('Cost migration requires DB_SYNCHRONIZE=false and DB_DROP_SCHEMA=false.');
  const db = createCostMigrationDataSource();
  await db.initialize();
  try { console.log((await db.runMigrations({ transaction: 'all' })).map(m => m.name)); }
  finally { await db.destroy(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration failed'); process.exitCode = 1; });
