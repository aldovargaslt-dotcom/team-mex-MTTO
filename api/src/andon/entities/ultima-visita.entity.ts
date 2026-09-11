import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ANDON_SCHEMA } from '../enums';

@Entity({ name: 'ultima_visita_cerrada', schema: ANDON_SCHEMA })
export class UltimaVisitaEntity {
  /** ID opaco de Unidad. Sin FK cruzada. */
  @PrimaryColumn({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  /** ID opaco de Visita. Sin FK cruzada. */
  @Column({ name: 'visita_id', type: 'uuid' })
  visitaId: string;

  @Column({ name: 'tipo_vehiculo_id', type: 'uuid' })
  tipoVehiculoId: string;

  @Column({ type: 'int' })
  km: number;

  @Column({ name: 'cerrado_at', type: 'timestamptz' })
  cerradoAt: Date;
}
