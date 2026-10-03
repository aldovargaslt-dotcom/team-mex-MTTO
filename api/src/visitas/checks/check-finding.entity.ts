import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('check_findings')
@Index('check_finding_source_uidx', ['visitaId', 'sourceKey'], { unique: true })
export class CheckFinding {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column({ name: 'source_key', type: 'varchar', length: 128 }) sourceKey: string;
  @Column({ name: 'condition_revision', type: 'int' }) conditionRevision: number;
  @Column({ type: 'varchar', length: 32 }) severity: 'OBSERVATION' | 'HARD_BLOCKER';
  @Column({ type: 'jsonb' }) details: Record<string, unknown>;
  @Column({ type: 'varchar', length: 32, nullable: true }) classification:
    | 'OBSERVATION'
    | 'FIXED_DURING_CHECK'
    | 'REQUIRES_WORK'
    | null;
  @Column({ name: 'classification_note', type: 'text', nullable: true }) classificationNote: string | null;
  @Column({ name: 'classification_revision', type: 'int', nullable: true }) classificationRevision: number | null;
  @Column({ name: 'prepared_context', type: 'jsonb', nullable: true }) preparedContext: Record<string, unknown> | null;
}
