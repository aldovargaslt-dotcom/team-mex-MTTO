import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ALERTAS_SCHEMA } from '../enums';

/** Opaque unidad_id — no FK cross-schema (ADR-010). */
@Entity({ name: 'umbral_unidad', schema: ALERTAS_SCHEMA })
export class UmbralUnidadEntity {
  @PrimaryColumn({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ type: 'int' })
  horas: number;
}
