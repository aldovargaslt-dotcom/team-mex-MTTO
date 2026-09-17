import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { InboxAlertSeverity, SALUD_SCHEMA } from '../enums';
import { DimensionWeight } from '../salud-types';

@Entity({ name: 'health_config', schema: SALUD_SCHEMA })
export class HealthConfigEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  dimensions: DimensionWeight[];

  @Column({ name: 'alert_enabled', type: 'boolean' })
  alertEnabled: boolean;

  @Column({ name: 'alert_threshold', type: 'int' })
  alertThreshold: number;

  @Column({ name: 'recovery_threshold', type: 'int' })
  recoveryThreshold: number;

  @Column({ name: 'alert_severity', type: 'varchar' })
  alertSeverity: InboxAlertSeverity;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;
}
