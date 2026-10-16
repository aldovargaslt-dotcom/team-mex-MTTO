import 'reflect-metadata';
import { postgresConnectionOptions } from './postgres-options';
import { migrateUiRelease } from './ui-release-migrations';

void migrateUiRelease(
  postgresConnectionOptions({
    get: <T = string>(key: string, fallback?: T) =>
      (process.env[key] ?? fallback) as T | undefined,
  }),
  {
    synchronize: process.env.DB_SYNCHRONIZE ?? 'false',
    dropSchema: process.env.DB_DROP_SCHEMA ?? 'false',
    inventoryCostsEnabled: process.env.INVENTORY_COSTS_ENABLED,
  },
)
  .then((applied) => {
    console.log(
      'UI release migrations complete:',
      applied.length ? applied : 'already applied',
    );
  })
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'UI release migration failed',
    );
    process.exitCode = 1;
  });
