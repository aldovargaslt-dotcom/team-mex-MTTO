import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { LogisticaDepartureAudit } from './departure-audit.entity';
@Entity('logistica_journeys')
@Check('logistica_journey_revision_check', 'revision IN (1,2)')
@Check(
  'logistica_journey_origin_check',
  "origin IN ('CAPTURED','LEGACY_OPEN','LEGACY_RECOVERED')",
)
@Check(
  'logistica_journey_endpoint_check',
  '(num_nonnulls(return_command_id,returned_effective_at,returned_registered_at,return_actor_id,return_auth_mode,return_attribution_level,return_facility_id,return_mapping_version,return_facility_version)=0 AND revision=1) OR (num_nonnulls(return_command_id,returned_effective_at,returned_registered_at,return_actor_id,return_auth_mode,return_attribution_level,return_facility_id,return_mapping_version,return_facility_version)=9 AND revision=2)',
)
@Check(
  'logistica_journey_order_check',
  'returned_effective_at IS NULL OR departed_effective_at IS NULL OR returned_effective_at >= departed_effective_at',
)
@Check(
  'logistica_journey_captured_check',
  "origin <> 'CAPTURED' OR (departed_effective_at IS NOT NULL AND departed_registered_at IS NOT NULL AND departure_actor_id IS NOT NULL AND departure_auth_mode IS NOT NULL AND departure_attribution_level IS NOT NULL AND departure_facility_id IS NOT NULL AND departure_mapping_version IS NOT NULL AND departure_facility_version IS NOT NULL AND departure_audit_id IS NOT NULL AND context_provenance='DEPARTURE_SNAPSHOT')",
)
@Index('logistica_journey_open_unit_idx', ['unidadId'], {
  unique: true,
  where: 'returned_effective_at IS NULL',
})
@Index('logistica_journey_audit_idx', ['departureAuditId'], {
  unique: true,
  where: 'departure_audit_id IS NOT NULL',
})
@Index('logistica_journey_unit_start_idx', [
  'unidadId',
  'departedEffectiveAt',
  'id',
])
@Index('logistica_journey_return_idx', ['unidadId', 'returnedEffectiveAt'], {
  where: 'returned_effective_at IS NOT NULL',
})
export class LogisticaJourney {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid', nullable: false })
  unidadId: string;
  @Column({ name: 'capture_id', type: 'uuid', nullable: false })
  captureId: string;
  @Column({ name: 'origin', type: 'varchar', nullable: false }) origin: string;
  @Column({ name: 'revision', type: 'bigint', nullable: false })
  revision: string;
  @Column({ name: 'departure_audit_id', type: 'uuid', nullable: true })
  departureAuditId: string | null;
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId:
    string | null;
  @Column({ name: 'driver_provenance', type: 'varchar', nullable: false })
  driverProvenance: string;
  @Column({ name: 'ambito', type: 'varchar', nullable: true }) ambito:
    string | null;
  @Column({ name: 'destino', type: 'varchar', nullable: true }) destino:
    string | null;
  @Column({ name: 'context_provenance', type: 'varchar', nullable: false })
  contextProvenance: string;
  @Column({ name: 'legacy_observed_context', type: 'jsonb', nullable: true })
  legacyObservedContext: Record<string, unknown> | null;
  @Column({ name: 'history_gaps', type: 'jsonb', nullable: false })
  historyGaps: string[];
  @Column({ name: 'return_command_id', type: 'uuid', nullable: true })
  returnCommandId: string | null;
  @Column({
    name: 'departed_effective_at',
    type: 'timestamptz',
    nullable: true,
  })
  departedEffectiveAt: Date | null;
  @Column({
    name: 'departed_registered_at',
    type: 'timestamptz',
    nullable: true,
  })
  departedRegisteredAt: Date | null;
  @Column({ name: 'departure_actor_id', type: 'varchar', nullable: true })
  departureActorId: string | null;
  @Column({ name: 'departure_auth_mode', type: 'varchar', nullable: true })
  departureAuthMode: string | null;
  @Column({
    name: 'departure_attribution_level',
    type: 'varchar',
    nullable: true,
  })
  departureAttributionLevel: string | null;
  @Column({ name: 'departure_facility_id', type: 'varchar', nullable: true })
  departureFacilityId: string | null;
  @Column({ name: 'departure_mapping_version', type: 'int', nullable: true })
  departureMappingVersion: number | null;
  @Column({ name: 'departure_facility_version', type: 'int', nullable: true })
  departureFacilityVersion: number | null;
  @Column({
    name: 'returned_effective_at',
    type: 'timestamptz',
    nullable: true,
  })
  returnedEffectiveAt: Date | null;
  @Column({
    name: 'returned_registered_at',
    type: 'timestamptz',
    nullable: true,
  })
  returnedRegisteredAt: Date | null;
  @Column({ name: 'return_actor_id', type: 'varchar', nullable: true })
  returnActorId: string | null;
  @Column({ name: 'return_auth_mode', type: 'varchar', nullable: true })
  returnAuthMode: string | null;
  @Column({ name: 'return_attribution_level', type: 'varchar', nullable: true })
  returnAttributionLevel: string | null;
  @Column({ name: 'return_facility_id', type: 'varchar', nullable: true })
  returnFacilityId: string | null;
  @Column({ name: 'return_mapping_version', type: 'int', nullable: true })
  returnMappingVersion: number | null;
  @Column({ name: 'return_facility_version', type: 'int', nullable: true })
  returnFacilityVersion: number | null;
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;
  @ManyToOne(() => LogisticaDepartureAudit, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'departure_audit_id' })
  departureAudit?: LogisticaDepartureAudit;
}
