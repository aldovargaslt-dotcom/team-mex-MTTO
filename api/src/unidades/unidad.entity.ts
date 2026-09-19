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
import { MotivoInactivacion } from '../common/motivo-inactivacion.enum';
import { TipoVehiculo } from './tipo-vehiculo.entity';
import { AmbitoUnidad } from './ambito-unidad.enum';
import { OpsEstadoUnidad } from './ops-estado-unidad.enum';

@Entity('unidades')
export class Unidad {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'numero_interno', unique: true })
  numeroInterno: string;

  @Column({ unique: true })
  placas: string;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  vin: string | null;

  @ManyToOne(() => TipoVehiculo, (tipo) => tipo.unidades, { eager: true })
  @JoinColumn({ name: 'tipo_id' })
  tipo: TipoVehiculo;

  @Column({ type: 'enum', enum: EstadoUnidad, default: EstadoUnidad.ACTIVA })
  estado: EstadoUnidad;

  @Column({
    name: 'motivo_inactivacion',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  motivoInactivacion: MotivoInactivacion | null;

  /** Standing assignment (ADR-008 logistica). Opaque chofer id; unique if set. Parked UI. */
  @Column({ name: 'chofer_id', type: 'uuid', nullable: true, unique: true })
  choferId: string | null;

  /** Logística Flota visual (ADR-011). Foráneo | Local — not tipo STOCK|RUTAS. */
  @Column({
    type: 'varchar',
    length: 16,
    default: AmbitoUnidad.LOCAL,
  })
  ambito: AmbitoUnidad;

  @Column({ type: 'varchar', length: 160, nullable: true })
  destino: string | null;

  @Column({
    name: 'ops_estado',
    type: 'varchar',
    length: 16,
    default: OpsEstadoUnidad.DISPONIBLE,
  })
  opsEstado: OpsEstadoUnidad;

  @Column({ name: 'marca_modelo', type: 'varchar', nullable: true })
  marcaModelo: string | null;

  @Column({ type: 'int', nullable: true })
  anio: number | null;

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
