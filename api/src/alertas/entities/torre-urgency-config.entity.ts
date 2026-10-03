import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ALERTAS_SCHEMA } from '../enums';

@Entity({ name: 'torre_urgency_config', schema: ALERTAS_SCHEMA })
export class TorreUrgencyConfigEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'attention_window_seconds', type: 'int', default: 7200 })
  attentionWindowSeconds: number;
  @Column({ type: 'int', default: 1 }) version: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) this.id = randomUUID();
  }
}
