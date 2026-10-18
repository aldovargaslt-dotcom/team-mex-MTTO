import { Column, Entity, PrimaryColumn } from 'typeorm';

export type CheckInterval = {
  mode: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  hours?: number;
};
export type UnitUsage = 'DAILY' | 'STOCK';
export type SettingsScope = 'FLEET' | 'CATEGORY' | 'UNIT';

@Entity('check_readiness_settings')
export class ReadinessSettings {
  @PrimaryColumn({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @PrimaryColumn('varchar') scope: SettingsScope;
  @PrimaryColumn({ name: 'target_id', type: 'varchar' }) targetId: string;
  @Column({ type: 'jsonb', nullable: true }) interval: CheckInterval | null;
  @Column({ type: 'varchar', nullable: true }) usage: UnitUsage | null;
  @Column({ type: 'int' }) version: number;
  @Column({ name: 'updated_by', type: 'varchar' }) updatedBy: string;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

export type ValidityPolicy = {
  interval: CheckInterval;
  fingerprint: string;
  origin: SettingsScope | 'LEGACY';
  reviewedAt: string;
  dueAt: string;
};

@Entity('check_readiness_audit')
export class ReadinessAudit {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @Column({ name: 'actor_id', type: 'varchar' }) actorId: string;
  @Column({ type: 'varchar' }) event: string;
  @Column({ type: 'jsonb' }) details: Record<string, unknown>;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('check_readiness_generations')
export class ReadinessGeneration {
  @PrimaryColumn({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @PrimaryColumn({ name: 'period_key', type: 'varchar' }) periodKey: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @Column({ name: 'command_id', type: 'varchar' }) commandId: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
