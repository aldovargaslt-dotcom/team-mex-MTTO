import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
@Entity('logistica_journey_commands')
@Index('logistica_command_unit_idx', ['unidadId', 'registeredAt'])
export class LogisticaJourneyReceipt {
  @PrimaryColumn({
    name: 'actor_id',
    type: 'varchar',
    length: 128,
    primaryKeyConstraintName: 'logistica_journey_commands_pkey',
  })
  actorId: string;
  @PrimaryColumn({
    name: 'command_id',
    type: 'uuid',
    primaryKeyConstraintName: 'logistica_journey_commands_pkey',
  })
  commandId: string;
  @Column({ name: 'unidad_id', type: 'uuid', nullable: false })
  unidadId: string;
  @Column({ name: 'kind', type: 'varchar', nullable: false }) kind: string;
  @Column({ name: 'request_hash', type: 'varchar', nullable: false })
  requestHash: string;
  @Column({ name: 'expected_unit_revision', type: 'bigint', nullable: false })
  expectedUnitRevision: string;
  @Column({ name: 'expected_history_state', type: 'varchar', nullable: false })
  expectedHistoryState: string;
  @Column({ name: 'expected_journey_ref', type: 'text', nullable: true })
  expectedJourneyRef: string | null;
  @Column({ name: 'expected_journey_revision', type: 'bigint', nullable: true })
  expectedJourneyRevision: string | null;
  @Column({ name: 'result_journey_id', type: 'uuid', nullable: false })
  resultJourneyId: string;
  @Column({ name: 'result_unit_revision', type: 'bigint', nullable: false })
  resultUnitRevision: string;
  @Column({ name: 'result_journey_revision', type: 'bigint', nullable: false })
  resultJourneyRevision: string;
  @Column({ name: 'response_status', type: 'int', nullable: false })
  responseStatus: number;
  @CreateDateColumn({
    name: 'registered_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  registeredAt: Date;
}
