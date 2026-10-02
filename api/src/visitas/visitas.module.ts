import {
  CheckDailyGeneration,
  CheckAudit,
} from './checks/check-generation.entity';
import {
  CheckEventsService,
  CheckDeliveryRunner,
} from './checks/check-events.service';
import { CheckDeliveryPort } from './checks/check-delivery.port';
import {
  DailyChecksService,
  DailyCheckScheduler,
} from './checks/daily-checks.service';
import { PhysicalStateReadPort } from '../flota/physical-state-read.port';
import { NotificationsModule } from '../notifications/notifications.module';
import { CheckInboxAdapter } from '../notifications/check-inbox.adapter';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChoferesModule } from '../choferes/choferes.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { Visita } from './visita.entity';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { VisitasInvariantService } from './visitas-invariant.service';
import { Facility, VehicleFacility } from './checks/facility.entity';
import { CheckInspection } from './checks/check-inspection.entity';
import { CanonicalOrdersService } from './checks/canonical-orders.service';
import { CanonicalOrdersController } from './checks/canonical-orders.controller';
import {
  ConfiguredFacilityCalendar,
  FacilityCalendarPort,
} from './checks/facility-calendar.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visita,
      VisitaTrabajo,
      VisitaFoto,
      VisitaFirma,
      VisitaPieza,
      Facility,
      VehicleFacility,
      CheckInspection,
      CheckDailyGeneration,
      CheckAudit,
    ]),
    UnidadesModule,
    ChoferesModule,
    NotificationsModule,
  ],
  controllers: [VisitasController, CanonicalOrdersController],
  providers: [
    VisitasService,
    VisitasInvariantService,
    CanonicalOrdersService,
    CheckEventsService,
    CheckDeliveryRunner,
    DailyChecksService,
    DailyCheckScheduler,
    { provide: CheckDeliveryPort, useExisting: CheckInboxAdapter },
    {
      provide: PhysicalStateReadPort,
      useValue: {
        read: async () => ({
          physicalKnowledge: 'UNAVAILABLE',
          physicalState: null,
        }),
      },
    },
    { provide: FacilityCalendarPort, useClass: ConfiguredFacilityCalendar },
  ],
  exports: [TypeOrmModule, VisitasService],
})
export class VisitasModule {}
