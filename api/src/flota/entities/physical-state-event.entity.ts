import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { FLOTA_SCHEMA } from '../enums';

export const PHYSICAL_STATES = [
  'EN_PATIO',
  'EN_RUTA',
  'EN_TALLER',
  'INACTIVA',
] as const;
export type PhysicalState = (typeof PHYSICAL_STATES)[number];

@Entity({ name: 'physical_state_events', schema: FLOTA_SCHEMA })
@Index('physical_state_event_unit_version_uidx', ['unidadId', 'version'], {
  unique: true,
})
export class PhysicalStateEventEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ type: 'varchar', length: 24 }) state: PhysicalState;
  @Column({ type: 'varchar', length: 32, default: 'FLOTA_TRANSITION' })
  source: 'FLOTA_TRANSITION';
  @Column({ type: 'int' }) version: number;
  @Column({ type: 'text' }) reason: string;
  @Column({ name: 'actor_id', type: 'varchar', length: 128 }) actorId: string;
  @Column({ name: 'observed_at', type: 'timestamptz' }) observedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) this.id = randomUUID();
  }
}
