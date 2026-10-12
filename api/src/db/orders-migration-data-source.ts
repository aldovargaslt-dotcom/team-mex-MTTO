import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { MaintenanceOrderOpening1791763200001 } from './migrations/1791763200001-MaintenanceOrderOpening';

export function createOrdersMigrationDataSource(
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
    migrationsTableName: 'orders_opening_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [MaintenanceOrderOpening1791763200001],
  });
}
