import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { AlertAttentionPriority1791676800001 } from './migrations/1791676800001-AlertAttentionPriority';

export function createAlertMigrationDataSource(
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
    migrationsTableName: 'alert_attention_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [AlertAttentionPriority1791676800001],
  });
}
