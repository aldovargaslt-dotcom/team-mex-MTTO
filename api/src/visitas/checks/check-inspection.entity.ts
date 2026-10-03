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
  @Column({ type: 'varchar', length: 32, nullable: true }) result:
    | 'FIT'
    | 'FIT_WITH_OBSERVATION'
    | 'UNFIT'
    | null;
  @Column({ name: 'reviewed_version', type: 'int', nullable: true })
  reviewedVersion: number | null;
  @Column({ name: 'review_hash', type: 'varchar', length: 64, nullable: true })
  reviewHash: string | null;
  @Column({ name: 'review_snapshot', type: 'jsonb', nullable: true })
  reviewSnapshot: Record<string, unknown> | null;
  @Column({ name: 'snapshot_hash', type: 'varchar', length: 64, nullable: true })
  snapshotHash: string | null;
  @Column({ name: 'signed_snapshot', type: 'jsonb', nullable: true })
  signedSnapshot: Record<string, unknown> | null;
  @Column({ name: 'completion_key', type: 'varchar', length: 128, nullable: true })
  completionKey: string | null;
  @Column({ name: 'completion_hash', type: 'varchar', length: 64, nullable: true })
  completionHash: string | null;
}
