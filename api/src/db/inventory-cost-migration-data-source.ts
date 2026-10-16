import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { InventoryCosts1792108800001 } from './migrations/1792108800001-InventoryCosts';

export function createInventoryCostMigrationDataSource(
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
    migrationsTableName: 'inventory_cost_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [InventoryCosts1792108800001],
  });
}
