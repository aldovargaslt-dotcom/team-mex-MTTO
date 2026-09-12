import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { FLOTA_SCHEMA, TipoFirmaFlota } from '../enums';
import { MovimientoEntity } from './movimiento.entity';

@Entity({ name: 'movimiento_firmas', schema: FLOTA_SCHEMA })
@Unique(['movimiento', 'tipo'])
export class MovimientoFirmaEntity {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => MovimientoEntity, (m) => m.firmas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movimiento_id' })
  movimiento: MovimientoEntity;

  @Column({ type: 'varchar', length: 16 })
  tipo: TipoFirmaFlota;

  @Column({ name: 'data_url', type: 'text' })
  dataUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
