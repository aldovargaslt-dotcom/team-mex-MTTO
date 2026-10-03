import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('logistica_departure_audits')
export class LogisticaDepartureAudit {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'actor_id', type: 'varchar', length: 128 }) actorId: string;
  @Column({ name: 'source_check_id', type: 'uuid' }) sourceCheckId: string;
  @Column({ name: 'snapshot_hash', type: 'varchar', length: 64 })
  snapshotHash: string;
  @Column({ name: 'check_version', type: 'int' }) checkVersion: number;
  @Column({ name: 'validation_refs', type: 'jsonb' }) validationRefs: Record<
    string,
    unknown
  >;
  @Column({ name: 'evaluated_at', type: 'timestamptz' }) evaluatedAt: Date;
  @Column({ name: 'operational_date', type: 'date' }) operationalDate: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) this.id = randomUUID();
  }
}
