import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Rol } from '../../auth/roles.enum';
import { FLOTA_SCHEMA, TipoMovimientoFlota } from '../enums';
import { MovimientoFirmaEntity } from './movimiento-firma.entity';

@Entity({ name: 'movimientos', schema: FLOTA_SCHEMA })
export class MovimientoEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  tipo: TipoMovimientoFlota;

  @Column({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ name: 'chofer_id', type: 'uuid' })
  choferId: string;

  @Column({ name: 'sitio_id', type: 'uuid' })
  sitioId: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'int' })
  km: number;

  @Column({ type: 'varchar', length: 240, nullable: true })
  notas: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 80, nullable: true })
  createdBy: string | null;

  @Column({ name: 'aval_rol', type: 'varchar', length: 32 })
  avalRol: Rol;

  @OneToMany(() => MovimientoFirmaEntity, (f) => f.movimiento, {
    cascade: true,
    eager: true,
  })
  firmas: MovimientoFirmaEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
