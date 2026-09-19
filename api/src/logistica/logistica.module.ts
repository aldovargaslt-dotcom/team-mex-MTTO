import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasModule } from '../alertas/alertas.module';
import { ChoferesModule } from '../choferes/choferes.module';
import { FlotaInboxAdapter } from '../notifications/flota-inbox.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesModule } from '../unidades/unidades.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import {
  FLOTA_SIN_REGRESO_PORT,
  UNIDAD_CHOFER_ASSIGNMENT_PORT,
} from './logistica-types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unidad]),
    UnidadesModule,
    ChoferesModule,
    AlertasModule,
    NotificationsModule,
  ],
  controllers: [LogisticaController],
  providers: [
    LogisticaService,
    {
      provide: UNIDAD_CHOFER_ASSIGNMENT_PORT,
      useExisting: LogisticaService,
    },
    {
      provide: FLOTA_SIN_REGRESO_PORT,
      useExisting: FlotaInboxAdapter,
    },
  ],
  exports: [LogisticaService, UNIDAD_CHOFER_ASSIGNMENT_PORT],
})
export class LogisticaModule {}
