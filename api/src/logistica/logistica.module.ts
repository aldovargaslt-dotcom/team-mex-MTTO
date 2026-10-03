import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasModule } from '../alertas/alertas.module';
import { ChoferesModule } from '../choferes/choferes.module';
import { FlotaInboxAdapter } from '../notifications/flota-inbox.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesModule } from '../unidades/unidades.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { ControlTowerService } from './control-tower.service';
import { FlotaModule } from '../flota/flota.module';
import { VisitasModule } from '../visitas/visitas.module';
import { VehicleDocumentsModule } from '../vehicle-documents/vehicle-documents.module';
import { DeparturePolicyPort } from './departure-policy.port';
import { DeparturePolicyService } from './departure-policy.service';
import { LogisticaDepartureAudit } from './departure-audit.entity';
import {
  FLOTA_SIN_REGRESO_PORT,
  UNIDAD_CHOFER_ASSIGNMENT_PORT,
} from './logistica-types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unidad, LogisticaDepartureAudit]),
    UnidadesModule,
    ChoferesModule,
    AlertasModule,
    NotificationsModule,
    forwardRef(() => FlotaModule),
    forwardRef(() => VisitasModule),
    forwardRef(() => VehicleDocumentsModule),
  ],
  controllers: [LogisticaController],
  providers: [
    LogisticaService,
    ControlTowerService,
    DeparturePolicyService,
    { provide: DeparturePolicyPort, useExisting: DeparturePolicyService },
    {
      provide: UNIDAD_CHOFER_ASSIGNMENT_PORT,
      useExisting: LogisticaService,
    },
    {
      provide: FLOTA_SIN_REGRESO_PORT,
      useExisting: FlotaInboxAdapter,
    },
  ],
  exports: [
    LogisticaService,
    UNIDAD_CHOFER_ASSIGNMENT_PORT,
    DeparturePolicyPort,
    TypeOrmModule,
  ],
})
export class LogisticaModule {}
