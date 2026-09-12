import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { FLOTA_SCHEMA } from '../enums';

@Entity({ name: 'unidad_operativa', schema: FLOTA_SCHEMA })
export class UnidadOperativaEntity {
  @PrimaryColumn({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ name: 'sitio_id', type: 'uuid', nullable: true })
  sitioId: string | null;

  @Column({ name: 'chofer_actual_id', type: 'uuid', nullable: true })
  choferActualId: string | null;

  @Column({ name: 'chofer_ultimo_id', type: 'uuid', nullable: true })
  choferUltimoId: string | null;

  @Column({ name: 'salida_abierta_id', type: 'uuid', nullable: true })
  salidaAbiertaId: string | null;

  @Column({ name: 'ultimo_movimiento_at', type: 'timestamptz', nullable: true })
  ultimoMovimientoAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
