import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import {
  NOTIFICATIONS_SCHEMA,
  Severity,
  SourceEvent,
  SourceModule,
  SubjectType,
} from '../enums';
import { InboxReadEntity } from './inbox-read.entity';

@Entity({ name: 'inbox_item', schema: NOTIFICATIONS_SCHEMA })
export class InboxItemEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'source_module', type: 'varchar' })
  sourceModule: SourceModule;

  @Column({ name: 'source_event', type: 'varchar' })
  sourceEvent: SourceEvent;

  /** ID opaco del origen. Sin FK cruzada (ADR-000 / ADR-006). */
  @Column({ name: 'source_ref', type: 'varchar' })
  sourceRef: string;

  @Column({ name: 'subject_type', type: 'varchar' })
  subjectType: SubjectType;

  @Column({ name: 'subject_ref', type: 'varchar', nullable: true })
  subjectRef: string | null;

  @Column({ type: 'varchar' })
  severity: Severity;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'dedupe_key', unique: true })
  dedupeKey: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @OneToMany(() => InboxReadEntity, (read) => read.item)
  reads: InboxReadEntity[];

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
