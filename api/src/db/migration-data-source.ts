import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  PostgresConnectionOptions,
  postgresConnectionOptions,
} from './postgres-options';
import { ExpandVisita1790899200001 } from './migrations/1790899200001-ExpandVisita';
import { AuditBackfillVisita1790899200002 } from './migrations/1790899200002-AuditBackfillVisita';
import { InstallCheckConstraints1790899200003 } from './migrations/1790899200003-InstallCheckConstraints';
import { DrainLegacyWriters1790899200004 } from './migrations/1790899200004-DrainLegacyWriters';
import { RetireGlobalDraftIndex1790899200005 } from './migrations/1790899200005-RetireGlobalDraftIndex';
import { ValidateCheckFoundation1790899200006 } from './migrations/1790899200006-ValidateCheckFoundation';

export function createMigrationDataSource(
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
    migrationsTableName: 'chk_schema_migrations',
    migrationsTransactionMode: 'all',
    migrations: [
      ExpandVisita1790899200001,
      AuditBackfillVisita1790899200002,
      InstallCheckConstraints1790899200003,
      DrainLegacyWriters1790899200004,
      RetireGlobalDraftIndex1790899200005,
      ValidateCheckFoundation1790899200006,
    ],
  });
}
