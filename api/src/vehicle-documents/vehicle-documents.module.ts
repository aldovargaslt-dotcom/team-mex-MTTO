import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadesModule } from '../unidades/unidades.module';
import { VisitasModule } from '../visitas/visitas.module';
import {
  KernelUnitReferenceAdapter,
  UnitReferencePort,
} from './unit-reference.port';
import { VehicleDocumentVersion } from './vehicle-document.entity';
import { VehicleDocumentsController } from './vehicle-documents.controller';
import { VehicleDocumentsService } from './vehicle-documents.service';
import { VehicleInsurancePolicyPort } from './vehicle-insurance.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleDocumentVersion]),
    UnidadesModule,
    forwardRef(() => VisitasModule),
  ],
  controllers: [VehicleDocumentsController],
  providers: [
    VehicleDocumentsService,
    KernelUnitReferenceAdapter,
    { provide: UnitReferencePort, useExisting: KernelUnitReferenceAdapter },
    {
      provide: VehicleInsurancePolicyPort,
      useExisting: VehicleDocumentsService,
    },
  ],
  exports: [VehicleInsurancePolicyPort, VehicleDocumentsService, TypeOrmModule],
})
export class VehicleDocumentsModule {}
