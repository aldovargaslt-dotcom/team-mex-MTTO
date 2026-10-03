import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('check_audit_events')
@Index('check_audit_check_created_idx', ['checkId', 'createdAt'])
export class CheckAuditEvent {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ type: 'varchar', length: 64 }) event: string;
  @Column({ name: 'actor_id', type: 'varchar', length: 128 }) actorId: string;
  @Column({ name: 'actor_name', type: 'varchar', length: 160 })
  actorName: string;
  @Column({ type: 'jsonb', default: {} }) details: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
