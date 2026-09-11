import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ANDON_SCHEMA } from '../enums';

@Entity({ name: 'umbrales', schema: ANDON_SCHEMA })
export class UmbralEntity {
  /** ID opaco de TipoVehiculo. Sin FK cruzada. */
  @PrimaryColumn({ name: 'tipo_vehiculo_id', type: 'uuid' })
  tipoVehiculoId: string;

  @Column({ name: 't_km', type: 'int' })
  tKm: number;

  @Column({ name: 't_dias', type: 'int' })
  tDias: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
