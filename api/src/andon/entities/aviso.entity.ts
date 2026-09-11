import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ANDON_SCHEMA, EstadoAviso } from '../enums';

@Entity({ name: 'avisos', schema: ANDON_SCHEMA })
export class AvisoEntity {
  @PrimaryColumn('uuid')
  id: string;

  /** ID opaco de Unidad. Sin FK cruzada (ADR-000). */
  @Column({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  /** ID opaco de TipoVehiculo. Sin FK cruzada. */
  @Column({ name: 'tipo_vehiculo_id', type: 'uuid' })
  tipoVehiculoId: string;

  @Column({ type: 'enum', enum: EstadoAviso, enumName: 'andon_estado_aviso' })
  estado: EstadoAviso;

  @Column({ name: 'abierta_at', type: 'timestamptz' })
  abiertaAt: Date;

  @Column({ name: 'enterado_at', type: 'timestamptz', nullable: true })
  enteradoAt: Date | null;

  @Column({ name: 'enterado_by', type: 'varchar', nullable: true })
  enteradoBy: string | null;

  @Column({ name: 'resuelto_at', type: 'timestamptz', nullable: true })
  resueltoAt: Date | null;

  /** ID opaco de la visita que resolvió. Sin FK cruzada. */
  @Column({ name: 'visita_resolutoria_id', type: 'uuid', nullable: true })
  visitaResolutoriaId: string | null;

  @Column({ name: 'km_al_abrir', type: 'int' })
  kmAlAbrir: number;

  @Column({ name: 'dias_al_abrir', type: 'int' })
  diasAlAbrir: number;

  @Column({ name: 'umbral_km', type: 'int' })
  umbralKm: number;

  @Column({ name: 'umbral_dias', type: 'int' })
  umbralDias: number;

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
