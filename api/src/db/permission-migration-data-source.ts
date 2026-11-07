import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { RolePermissionMatrix1792368000001 } from './migrations/1792368000001-RolePermissionMatrix';

/** Ledger propio (como alertas/inventario): no altera el historial de `auth_schema_migrations`. */
export function createPermissionMigrationDataSource(
  connection?: PostgresConnectionOptions,
) {
  return new DataSource({
    ...(connection ??
      postgresConnectionOptions({
        get: <T = string>(key: string, fallback?: T) =>
          (process.env[key] ?? fallback) as T | undefined,
      })),
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    migrationsTableName: 'auth_permission_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [RolePermissionMatrix1792368000001],
  });
}
