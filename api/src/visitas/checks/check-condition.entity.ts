import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('check_conditions')
export class CheckCondition {
  @PrimaryColumn({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column({ type: 'int', default: 0 }) revision: number;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ name: 'progress', type: 'varchar', length: 32 }) progress:
    'INCOMPLETE' | 'COMPLETE';
  @Column({
    name: 'derived_result',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  derivedResult: 'FIT' | 'FIT_WITH_OBSERVATION' | 'UNFIT' | null;
}
