import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unidad } from './unidad.entity';
import { IconoTipoVehiculo } from './icono-tipo-vehiculo.enum';

@Entity('tipos_vehiculo')
export class TipoVehiculo {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  icono: IconoTipoVehiculo | null;

  @OneToMany(() => Unidad, (unidad) => unidad.tipo)
  unidades: Unidad[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
