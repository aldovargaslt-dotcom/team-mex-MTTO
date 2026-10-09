import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { UserAccessDirectory1791504000001 } from './migrations/1791504000001-UserAccessDirectory';

export function createAuthMigrationDataSource(
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
    migrationsTableName: 'auth_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [UserAccessDirectory1791504000001],
  });
}
