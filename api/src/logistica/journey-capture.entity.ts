import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity('logistica_journey_capture')
export class LogisticaJourneyCapture {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'schema_version', type: 'int' }) schemaVersion: number;
  @Column({ name: 'boundary_at', type: 'timestamptz' }) boundaryAt: Date;
  @Column({ name: 'baseline_commit', type: 'varchar' }) baselineCommit: string;
  @Column({ name: 'legacy_open_count', type: 'int' }) legacyOpenCount: number;
  @Column({ name: 'coverage_note', type: 'varchar' }) coverageNote: string;
}
