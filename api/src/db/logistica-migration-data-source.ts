import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { LogisticaJourneyHistory1792022400001 } from './migrations/1792022400001-LogisticaJourneyHistory';
export function createLogisticaMigrationDataSource(
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
    migrationsTableName: 'logistica_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [LogisticaJourneyHistory1792022400001],
  });
}
