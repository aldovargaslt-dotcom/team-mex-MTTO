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
    ]),
    UnidadesModule,
    ChoferesModule,
  ],
  controllers: [VisitasController, CanonicalOrdersController],
  providers: [
    VisitasService,
    VisitasInvariantService,
    CanonicalOrdersService,
    { provide: FacilityCalendarPort, useClass: ConfiguredFacilityCalendar },
  ],
  exports: [TypeOrmModule, VisitasService],
})
export class VisitasModule {}
