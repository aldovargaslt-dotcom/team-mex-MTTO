import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Visita } from '../visita.entity';
@Entity('check_daily_generation')
export class CheckDailyGeneration {
  @PrimaryColumn({
    name: 'unidad_id',
    type: 'uuid',
    primaryKeyConstraintName: 'check_daily_generation_pkey',
  })
  unidadId: string;
  @PrimaryColumn({
    name: 'operational_date',
    type: 'date',
    primaryKeyConstraintName: 'check_daily_generation_pkey',
  })
  operationalDate: string;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @ManyToOne(() => Visita, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'check_id' })
  check: Visita;
  @Column({ name: 'command_id', type: 'varchar' }) commandId: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
@Entity('check_audit')
export class CheckAudit {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId: string;
  @Column({ name: 'event_type', type: 'varchar' }) eventType: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @ManyToOne(() => Visita, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'check_id' })
  check: Visita;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @Column({ name: 'actor_subject', type: 'varchar' }) actorSubject: string;
  @Column({ name: 'actor_name', type: 'varchar' }) actorName: string;
  @Column({ name: 'attribution_level', type: 'varchar' })
  attributionLevel: string;
  @Column({ type: 'varchar' }) source: string;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt: Date;
}
