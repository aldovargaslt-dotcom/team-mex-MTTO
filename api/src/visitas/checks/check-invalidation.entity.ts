import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export const CHECK_INVALIDATION_TYPES = [
  'INCIDENT_DAMAGE',
  'NEW_SAFETY_ANOMALY',
  'AUTHORIZED_INVALIDATION',
  'MAINTENANCE_REINSPECTION_REQUIRED',
] as const;
export type CheckInvalidationType = (typeof CHECK_INVALIDATION_TYPES)[number];

@Entity('check_invalidations')
@Index('check_invalidation_source_uidx', ['sourceEventId'], { unique: true })
@Index('check_invalidation_check_created_idx', ['checkId', 'createdAt'])
export class CheckInvalidation {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ type: 'varchar', length: 64 }) type: CheckInvalidationType;
  @Column({ type: 'text' }) reason: string;
  @Column({ name: 'source_event_id', type: 'varchar', length: 160 })
  sourceEventId: string;
  @Column({ name: 'actor_id', type: 'varchar', length: 128 }) actorId: string;
  @Column({ name: 'actor_name', type: 'varchar', length: 160 })
  actorName: string;
  @Column({ name: 'source_work_order_id', type: 'uuid', nullable: true })
  sourceWorkOrderId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
