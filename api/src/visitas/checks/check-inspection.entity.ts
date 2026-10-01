import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Visita } from '../visita.entity';
import { CheckSource } from '../work-order';
import { Facility } from './facility.entity';

@Entity('check_inspections')
@Check(
  'check_inspections_source_check',
  "source IN ('DAILY_AUTOMATIC','LOGISTICS_MANUAL','CHECK_OUT','CHECK_IN','REINSPECTION')",
)
@Check('check_inspections_timezone_check', "timezone='America/Mexico_City'")
@Check('check_inspections_calendar_version_check', 'calendar_version>0')
@Check('check_inspections_mapping_version_check', 'mapping_version>0')
export class CheckInspection {
  @PrimaryColumn({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @OneToOne(() => Visita, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visita_id' })
  visita: Visita;
  @Column('varchar') source: CheckSource;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;
  @Column({ name: 'operational_date', type: 'date' }) operationalDate: string;
  @Column('varchar') timezone: string;
  @Column({ name: 'calendar_version', type: 'int' }) calendarVersion: number;
  @Column({ name: 'mapping_version', type: 'int' }) mappingVersion: number;
  @Column({ name: 'day_end_instant', type: 'timestamptz' }) dayEndInstant: Date;
}
