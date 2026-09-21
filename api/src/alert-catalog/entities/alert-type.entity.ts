import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  ALERT_CATALOG_SCHEMA,
  AlertFamily,
  AlertOwningModule,
  ThresholdMode,
} from '../alert-catalog.types';

@Entity({ name: 'tipo', schema: ALERT_CATALOG_SCHEMA })
export class AlertTypeEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 16 })
  family: AlertFamily;

  @Column({ name: 'owning_module', type: 'varchar', length: 24 })
  owningModule: AlertOwningModule;

  @Column({ name: 'threshold_mode', type: 'varchar', length: 16 })
  thresholdMode: ThresholdMode;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: false })
  seeded: boolean;
}
