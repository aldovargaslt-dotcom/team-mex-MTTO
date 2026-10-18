import { forwardRef, Module } from '@nestjs/common';
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
import { AndonModule } from '../andon/andon.module';
import {
  ReadinessAudit,
  ReadinessGeneration,
  ReadinessSettings,
} from './checks/readiness-settings.entity';
import {
  ReadinessHold,
  RepairVerification,
} from './checks/readiness-hold.entity';
import { ReadinessSettingsService } from './checks/readiness-settings.service';
import { ReadinessHoldsService } from './checks/readiness-holds.service';
import { UnitReadinessService } from './checks/unit-readiness.service';
import { UnitReadinessController } from './checks/unit-readiness.controller';
import { Facility, VehicleFacility } from './checks/facility.entity';
import { CheckInspection } from './checks/check-inspection.entity';
import { CheckGenerationLedger } from './checks/check-generation.entity';
import { CheckAuditEvent } from './checks/check-audit.entity';
import { CheckDailyScheduler } from './checks/check-daily.scheduler';
import { CheckCondition } from './checks/check-condition.entity';
import { CheckFinding } from './checks/check-finding.entity';
import { CheckPsiPolicy } from './checks/check-psi-policy.entity';
import { CheckEvidence } from './checks/check-evidence.entity';
import { ObjectStoragePort } from './checks/object-storage.port';
import { PrivateFilesystemStorageAdapter } from './checks/private-filesystem-storage.adapter';
import { CorrectiveFromCheckFactory } from './checks/corrective-from-check.factory';
import { CheckSignature } from './checks/check-signature.entity';
import { CheckInvalidation } from './checks/check-invalidation.entity';
import { CanonicalOrdersService } from './checks/canonical-orders.service';
import { CanonicalOrdersController } from './checks/canonical-orders.controller';
import {
  ConfiguredFacilityCalendar,
  FacilityCalendarPort,
} from './checks/facility-calendar.port';
import { FlotaModule } from '../flota/flota.module';
import {
  ConfiguredFacilityResource,
  FacilityResourceReadPort,
} from './checks/facility-resource-read.port';
import {
  TypeOrmMaintenanceBlockReadAdapter,
  TypeOrmSignedCheckReadAdapter,
} from './checks/signed-check-read.adapter';
import {
  MaintenanceBlockReadPort,
  SignedCheckReadPort,
} from './checks/signed-check-read.port';

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
      CheckGenerationLedger,
      CheckAuditEvent,
      CheckCondition,
      CheckFinding,
      CheckPsiPolicy,
      CheckEvidence,
      CheckSignature,
      CheckInvalidation,
      ReadinessSettings,
      ReadinessGeneration,
      ReadinessAudit,
      ReadinessHold,
      RepairVerification,
    ]),
    UnidadesModule,
    ChoferesModule,
    AndonModule,
    forwardRef(() => FlotaModule),
  ],
  controllers: [
    VisitasController,
    CanonicalOrdersController,
    UnitReadinessController,
  ],
  providers: [
    VisitasService,
    VisitasInvariantService,
    CanonicalOrdersService,
    ReadinessSettingsService,
    ReadinessHoldsService,
    UnitReadinessService,
    CheckDailyScheduler,
    CorrectiveFromCheckFactory,
    PrivateFilesystemStorageAdapter,
    {
      provide: ObjectStoragePort,
      useExisting: PrivateFilesystemStorageAdapter,
    },
    { provide: FacilityCalendarPort, useClass: ConfiguredFacilityCalendar },
    { provide: FacilityResourceReadPort, useClass: ConfiguredFacilityResource },
    TypeOrmSignedCheckReadAdapter,
    TypeOrmMaintenanceBlockReadAdapter,
    {
      provide: SignedCheckReadPort,
      useExisting: TypeOrmSignedCheckReadAdapter,
    },
    {
      provide: MaintenanceBlockReadPort,
      useExisting: TypeOrmMaintenanceBlockReadAdapter,
    },
  ],
  exports: [
    TypeOrmModule,
    VisitasService,
    FacilityCalendarPort,
    FacilityResourceReadPort,
    SignedCheckReadPort,
    MaintenanceBlockReadPort,
  ],
})
export class VisitasModule {}
