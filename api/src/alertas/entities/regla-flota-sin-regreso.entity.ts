import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ALERTAS_SCHEMA,
  DEFAULT_UMBRAL_FORANEO_H,
  DEFAULT_UMBRAL_LOCAL_H,
} from '../enums';

@Entity({ name: 'regla_flota_sin_regreso', schema: ALERTAS_SCHEMA })
export class ReglaFlotaSinRegresoEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    name: 'ambito_default_local_h',
    type: 'int',
    default: DEFAULT_UMBRAL_LOCAL_H,
  })
  ambitoDefaultLocalH: number;

  @Column({
    name: 'ambito_default_foraneo_h',
    type: 'int',
    default: DEFAULT_UMBRAL_FORANEO_H,
  })
  ambitoDefaultForaneoH: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
