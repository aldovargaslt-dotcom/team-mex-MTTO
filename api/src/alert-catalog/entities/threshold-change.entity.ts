import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'alert_catalog', name: 'threshold_change' })
export class ThresholdChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ name: 'actor_id', type: 'varchar', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_role', type: 'varchar' })
  actorRole: string;

  @Column({ type: 'jsonb' })
  before: unknown;

  @Column({ type: 'jsonb' })
  after: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
