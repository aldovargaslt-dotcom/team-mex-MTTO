import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('check_evidence')
@Index('check_evidence_key_uidx', ['objectKey'], { unique: true })
export class CheckEvidence {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column({ name: 'object_key', type: 'varchar', length: 512 })
  objectKey: string;
  @Column({
    name: 'object_version_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  objectVersionId: string | null;
  @Column({ type: 'varchar', length: 16 }) status: 'TEMPORARY' | 'READY';
  @Column({ type: 'jsonb', default: [] }) tags: string[];
  @Column({ name: 'mime_type', type: 'varchar', length: 64, nullable: true })
  mimeType: string | null;
  @Column({ type: 'int', nullable: true }) bytes: number | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) sha256:
    string | null;
  @Column({ name: 'actor_id', type: 'varchar', length: 128 }) actorId: string;
  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
