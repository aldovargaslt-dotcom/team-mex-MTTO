import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('check_generation_ledger')
@Index('check_generation_unit_day_uidx', ['unidadId', 'operationalDate'], {
  unique: true,
})
export class CheckGenerationLedger {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @Column({ name: 'operational_date', type: 'date' }) operationalDate: string;
  @Column({ name: 'check_id', type: 'uuid', nullable: true }) checkId:
    string | null;
  @Column({ name: 'command_id', type: 'varchar', length: 128 })
  commandId: string;
  @Column({ name: 'outcome', type: 'varchar', length: 32 }) outcome:
    'CREATED' | 'SKIPPED_ACTIVE' | 'SKIPPED_COMPLETED' | 'CONFLICT';
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
