import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('check_psi_policies')
@Index(
  'check_psi_policy_unit_type_version_uidx',
  ['unidadId', 'tipoVehiculoId', 'version'],
  { unique: true },
)
export class CheckPsiPolicy {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'tipo_vehiculo_id', type: 'uuid' }) tipoVehiculoId: string;
  @Column({ type: 'int' }) version: number;
  @Column({ type: 'jsonb' }) positions: string[];
  @Column({ name: 'normal_min', type: 'numeric' }) normalMin: number;
  @Column({ name: 'normal_max', type: 'numeric' }) normalMax: number;
  @Column({ name: 'critical_min', type: 'numeric' }) criticalMin: number;
  @Column({ name: 'critical_max', type: 'numeric' }) criticalMax: number;
}
