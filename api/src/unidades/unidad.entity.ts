import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { TipoVehiculo } from '../tipos-vehiculo/tipo-vehiculo.entity';

@Entity('unidades')
export class Unidad {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'numero_interno', unique: true })
  numeroInterno: string;

  @Column({ unique: true })
  placas: string;

  @ManyToOne(() => TipoVehiculo, (tipo) => tipo.unidades, { eager: true })
  @JoinColumn({ name: 'tipo_id' })
  tipo: TipoVehiculo;

  @Column({ type: 'enum', enum: EstadoUnidad, default: EstadoUnidad.ACTIVA })
  estado: EstadoUnidad;

  @Column({ type: 'varchar', nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', nullable: true })
  modelo: string | null;

  @Column({ type: 'int', nullable: true })
  anio: number | null;

  @Column({ type: 'int', nullable: true })
  kilometraje: number | null;

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
