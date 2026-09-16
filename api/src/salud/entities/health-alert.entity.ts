import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  EstadoHealthAlert,
  HealthAlertType,
  SALUD_SCHEMA,
} from '../enums';

@Entity({ name: 'health_alert', schema: SALUD_SCHEMA })
export class HealthAlertEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ type: 'varchar' })
  type: HealthAlertType;

  @Column({ type: 'varchar' })
  estado: EstadoHealthAlert;

  @Column({ name: 'score_at_open', type: 'int' })
  scoreAtOpen: number;

  @Column({ name: 'threshold_at_open', type: 'int' })
  thresholdAtOpen: number;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_reason', type: 'varchar', nullable: true })
  resolvedReason: string | null;
}
