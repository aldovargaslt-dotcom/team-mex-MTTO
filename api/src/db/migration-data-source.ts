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
import { CheckGenerationAudit1790899200007 } from './migrations/1790899200007-CheckGenerationAudit';
import { CheckConditionClaim1790899200008 } from './migrations/1790899200008-CheckConditionClaim';
import { CheckEvidence1790899200009 } from './migrations/1790899200009-CheckEvidence';
import { CheckFindingClassification1790899200010 } from './migrations/1790899200010-CheckFindingClassification';
import { CheckCompletion1790899200011 } from './migrations/1790899200011-CheckCompletion';
import { ControlTowerReadiness1790899200012 } from './migrations/1790899200012-ControlTowerReadiness';
import { DepartureAuthorization1790899200013 } from './migrations/1790899200013-DepartureAuthorization';

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
      CheckGenerationAudit1790899200007,
      CheckConditionClaim1790899200008,
      CheckEvidence1790899200009,
      CheckFindingClassification1790899200010,
      CheckCompletion1790899200011,
      ControlTowerReadiness1790899200012,
      DepartureAuthorization1790899200013,
    ],
  });
}
