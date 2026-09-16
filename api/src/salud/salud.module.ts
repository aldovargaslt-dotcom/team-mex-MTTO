import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AndonModule } from '../andon/andon.module';
import { FlotaModule } from '../flota/flota.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SaludInboxAdapter } from '../notifications/salud-inbox.adapter';
import { UnidadesModule } from '../unidades/unidades.module';
import {
  AndonHealthInputAdapter,
  SaludUnidadCatalog,
} from './andon-health.adapter';
import { HealthAlertEntity } from './entities/health-alert.entity';
import { HealthConfigEntity } from './entities/health-config.entity';
import { HealthSnapshotEntity } from './entities/health-snapshot.entity';
import { FlotaOdometerAdapter } from './flota-odometer.adapter';
import {
  ANDON_HEALTH_INPUT_PORT,
  HEALTH_ALERT_PORT,
  ODOMETER_PORT,
} from './ports';
import { SaludController } from './salud.controller';
import { SaludService } from './salud.service';
import { TypeOrmSaludStore } from './typeorm-store';

export const SALUD_ENTITIES = [
  HealthConfigEntity,
  HealthSnapshotEntity,
  HealthAlertEntity,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(SALUD_ENTITIES),
    UnidadesModule,
    AndonModule,
    FlotaModule,
    NotificationsModule,
  ],
  controllers: [SaludController],
  providers: [
    TypeOrmSaludStore,
    SaludUnidadCatalog,
    AndonHealthInputAdapter,
    FlotaOdometerAdapter,
    {
      provide: ANDON_HEALTH_INPUT_PORT,
      useExisting: AndonHealthInputAdapter,
    },
    {
      provide: ODOMETER_PORT,
      useExisting: FlotaOdometerAdapter,
    },
    {
      provide: HEALTH_ALERT_PORT,
      useExisting: SaludInboxAdapter,
    },
    SaludService,
  ],
  exports: [SaludService, TypeOrmModule],
})
export class SaludModule {}
