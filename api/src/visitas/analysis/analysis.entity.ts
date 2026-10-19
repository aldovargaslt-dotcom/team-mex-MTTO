import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { ExternalServiceData, ScheduleData } from './analysis-rules';

@Entity({ name: 'maintenance_external_services', synchronize: false })
@Index(['facilityId', 'unitId', 'performedOn'])
export class AnalysisExternalService {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unit_ref', type: 'uuid' }) unitId: string;
  @Column({ name: 'facility_ref', type: 'varchar' }) facilityId: string;
  @Column('int') version: number;
  @Column({ name: 'performed_on', type: 'date' }) performedOn: string;
  @Column({ name: 'provider_name', type: 'varchar' }) providerName: string;
  @Column({ name: 'maintenance_type', type: 'varchar' })
  maintenanceType: string;
  @Column('jsonb') data: ExternalServiceData;
  @Column({ name: 'registered_at', type: 'timestamptz' }) registeredAt: Date;
  @Column({ name: 'registered_by', type: 'varchar' }) registeredBy: string;
}
@Entity({ name: 'maintenance_service_revisions', synchronize: false })
export class AnalysisServiceRevision {
  @PrimaryColumn({ name: 'service_id', type: 'uuid' }) serviceId: string;
  @PrimaryColumn('int') version: number;
  @Column('jsonb') data: Record<string, unknown>;
  @Column() actor: string;
  @Column() reason: string;
  @Column({ name: 'registered_at', type: 'timestamptz' }) registeredAt: Date;
}
@Entity({ name: 'maintenance_service_cost_lines', synchronize: false })
export class AnalysisCostLine {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'service_id', type: 'uuid' }) serviceId: string;
  @Column('int') version: number;
  @Column({ type: 'varchar', nullable: true }) system: string | null;
  @Column({ name: 'net_cents', type: 'bigint', nullable: true }) netCents:
    string | null;
  @Column({ name: 'tax_cents', type: 'bigint', nullable: true }) taxCents:
    string | null;
  @Column({ name: 'gross_cents', type: 'bigint', nullable: true }) grossCents:
    string | null;
  @Column() state: string;
  @Column('jsonb') data: object;
}
@Entity({ name: 'maintenance_service_work', synchronize: false })
export class AnalysisWork {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'service_id', type: 'uuid' }) serviceId: string;
  @Column() system: string;
  @Column() kind: string;
  @Column({ name: 'intervention_id', type: 'uuid' }) interventionId: string;
  @Column({ name: 'conclusion_date', type: 'date' }) conclusionDate: string;
  @Column('jsonb') data: object;
}
@Entity({ name: 'maintenance_cost_claims', synchronize: false })
export class AnalysisCostClaim {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'service_id', type: 'uuid' }) serviceId: string;
  @Column({ name: 'service_line_id', type: 'uuid' }) serviceLineId: string;
  @Column({ name: 'unit_ref', type: 'uuid' }) unitId: string;
  @Column({ name: 'source_op_ref', type: 'uuid' }) sourceOpId: string;
  @Column({ name: 'source_version', type: 'int' }) sourceVersion: number;
  @Column({ name: 'qty_from', type: 'int' }) from: number;
  @Column({ name: 'qty_to', type: 'int' }) to: number;
}
@Entity({ name: 'maintenance_schedule_scopes', synchronize: false })
@Index(['facilityId', 'scope', 'scopeRef'], { unique: true })
export class AnalysisScheduleScope {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'facility_ref', type: 'varchar' }) facilityId: string;
  @Column() scope: string;
  @Column({ name: 'scope_ref', type: 'varchar' }) scopeRef: string;
  @Column('int') revision: number;
}
@Entity({ name: 'maintenance_schedule_versions', synchronize: false })
export class AnalysisSchedule {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'scope_id', type: 'uuid' }) scopeId: string;
  @Column({ name: 'facility_ref', type: 'varchar' }) facilityId: string;
  @Column() scope: string;
  @Column({ name: 'scope_ref', type: 'varchar' }) scopeRef: string;
  @Column('int') version: number;
  @Column({ name: 'valid_from', type: 'timestamptz' }) validFrom: Date;
  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo: Date | null;
  @Column('jsonb') data: ScheduleData;
  @Column() actor: string;
  @Column() reason: string;
}
@Entity({ name: 'maintenance_command_receipts', synchronize: false })
export class AnalysisReceipt {
  @PrimaryColumn({ name: 'actor_subject', type: 'varchar' }) subject: string;
  @PrimaryColumn({ name: 'command_id', type: 'uuid' }) commandId: string;
  @Column({ name: 'request_hash', type: 'varchar' }) requestHash: string;
  @Column({ name: 'facility_refs', type: 'jsonb' }) facilities: string[];
  @Column({ name: 'unit_refs', type: 'jsonb' }) unitIds: string[];
  @Column('jsonb') result: Record<string, unknown>;
  @Column({ name: 'registered_at', type: 'timestamptz' }) registeredAt: Date;
}
@Entity({ name: 'maintenance_report_snapshots', synchronize: false })
export class AnalysisSnapshot {
  @PrimaryColumn('uuid') id: string;
  @Column() subject: string;
  @Column({ name: 'facility_refs', type: 'jsonb' }) facilities: string[];
  @Column({ name: 'unit_mapping', type: 'jsonb' }) unitMapping: Record<
    string,
    string
  >;
  @Column({ name: 'query_hash', type: 'varchar' }) queryHash: string;
  @Column('jsonb') result: Record<string, unknown>;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
}
@Entity({ name: 'maintenance_cost_classifications', synchronize: false })
export class AnalysisClassification {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'source_op_ref', type: 'uuid' }) sourceOpId: string;
  @Column({ name: 'source_version', type: 'int' }) sourceVersion: number;
  @Column('int') revision: number;
  @Column({ name: 'unit_ref', type: 'uuid' }) unitId: string;
  @Column('jsonb') data: Record<string, unknown>;
  @Column() actor: string;
  @Column() reason: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
@Entity({ name: 'maintenance_work_catalog', synchronize: false })
export class AnalysisCatalogVersion {
  @PrimaryColumn() code: string;
  @PrimaryColumn('int') version: number;
  @Column('boolean') active: boolean;
  @Column() actor: string;
  @Column() reason: string;
}
@Entity({ name: 'maintenance_document_groups', synchronize: false })
export class AnalysisDocumentGroup {
  @PrimaryColumn('uuid') id: string;
  @Column('int') version: number;
  @Column({ name: 'facility_refs', type: 'jsonb' }) facilities: string[];
  @Column({ name: 'unit_refs', type: 'jsonb' }) unitIds: string[];
  @Column('jsonb') data: Record<string, unknown>;
}
@Entity({ name: 'maintenance_document_allocations', synchronize: false })
export class AnalysisDocumentAllocation {
  @PrimaryColumn({ name: 'line_id', type: 'uuid' }) lineId: string;
  @Column({ name: 'group_id', type: 'uuid' }) groupId: string;
  @Column({ name: 'line_version', type: 'int' }) lineVersion: number;
}
@Entity({ name: 'maintenance_document_group_revisions', synchronize: false })
export class AnalysisDocumentRevision {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' }) groupId: string;
  @PrimaryColumn('int') version: number;
  @Column('jsonb') data: object;
  @Column() actor: string;
  @Column() reason: string;
}
@Entity({ name: 'maintenance_projection_invalidations', synchronize: false })
export class AnalysisInvalidation {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unit_ref', type: 'uuid', nullable: true }) unitId:
    string | null;
  @Column({ name: 'facility_ref', type: 'varchar' }) facilityId: string;
  @Column({ name: 'source_ref', type: 'varchar' }) sourceRef: string;
  @Column('int') version: number;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
@Entity({ name: 'maintenance_projection_captures', synchronize: false })
export class AnalysisCapture {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'source_vector', type: 'jsonb' }) sourceVector: Record<
    string,
    unknown
  >;
  @Column() status: string;
  @Column({ name: 'completed_at', type: 'timestamptz' }) completedAt: Date;
}
@Entity({ name: 'maintenance_projection_facts', synchronize: false })
export class AnalysisProjectionFact {
  @PrimaryColumn() owner: string;
  @PrimaryColumn({ name: 'source_ref', type: 'varchar' }) sourceRef: string;
  @PrimaryColumn({ name: 'source_version', type: 'varchar' })
  sourceVersion: string;
  @Column({ name: 'unit_ref', type: 'uuid' }) unitId: string;
  @Column({ name: 'facility_ref', type: 'varchar' }) facilityId: string;
  @Column({ name: 'integrity_hash', type: 'varchar' }) integrityHash: string;
  @Column('jsonb') data: object;
}
export const ANALYSIS_ENTITIES = [
  AnalysisExternalService,
  AnalysisServiceRevision,
  AnalysisCostLine,
  AnalysisWork,
  AnalysisCostClaim,
  AnalysisScheduleScope,
  AnalysisSchedule,
  AnalysisReceipt,
  AnalysisSnapshot,
  AnalysisClassification,
  AnalysisCatalogVersion,
  AnalysisDocumentGroup,
  AnalysisDocumentAllocation,
  AnalysisDocumentRevision,
  AnalysisInvalidation,
  AnalysisCapture,
  AnalysisProjectionFact,
];
