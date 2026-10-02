import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Unidad } from '../../unidades/unidad.entity';
import { FACILITY_TIMEZONE } from './facility-calendar';

@Entity('facilities')
@Check('facilities_timezone_check', "timezone='America/Mexico_City'")
@Check('facilities_version_check', 'version>0')
export class Facility {
  @PrimaryColumn('varchar') id: string;
  @Column('varchar') name: string;
  @Column({ type: 'varchar', default: FACILITY_TIMEZONE }) timezone: string;
  @Column({ type: 'int', default: 1 }) version: number;
}
@Entity('vehicle_facilities')
@Check('vehicle_facilities_version_check', 'version>0')
export class VehicleFacility {
  @PrimaryColumn({ type: 'uuid', name: 'unidad_id' }) unidadId: string;
  @ManyToOne(() => Unidad, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;
  @Column({ type: 'int', default: 1 }) version: number;
}
