import { Column, Entity, PrimaryColumn } from 'typeorm';
import { HealthStatus, SALUD_SCHEMA } from '../enums';

@Entity({ name: 'health_snapshot', schema: SALUD_SCHEMA })
export class HealthSnapshotEntity {
  @PrimaryColumn({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'raw_score', type: 'float', nullable: true })
  rawScore: number | null;

  @Column({ type: 'varchar', nullable: true })
  status: HealthStatus | null;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt: Date;

  @Column({ name: 'config_version', type: 'int' })
  configVersion: number;
}
