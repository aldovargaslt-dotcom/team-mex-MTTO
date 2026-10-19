import { PrivateFilesystemStorageAdapter } from '../checks/private-filesystem-storage.adapter';
import { ObjectStoragePort } from '../checks/object-storage.port';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../../inventario/inventario.module';
import { LogisticaModule } from '../../logistica/logistica.module';
import { FlotaModule } from '../../flota/flota.module';
import { AndonModule } from '../../andon/andon.module';
import { VisitasModule } from '../visitas.module';
import { ANALYSIS_ENTITIES } from './analysis.entity';
import { MaintenanceAnalysisService } from './analysis.service';
import { MaintenanceAnalysisReportService } from './analysis-report.service';
import { MaintenanceAnalysisController } from './analysis.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature(ANALYSIS_ENTITIES),
    VisitasModule,
    InventarioModule,
    LogisticaModule,
    FlotaModule,
    AndonModule,
  ],
  providers: [
    { provide: ObjectStoragePort, useClass: PrivateFilesystemStorageAdapter },
    MaintenanceAnalysisService,
    MaintenanceAnalysisReportService,
  ],
  controllers: [MaintenanceAnalysisController],
  exports: [MaintenanceAnalysisService],
})
export class MaintenanceAnalysisModule {}
