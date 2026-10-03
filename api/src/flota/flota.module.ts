import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AndonModule } from '../andon/andon.module';
import { ChoferesModule } from '../choferes/choferes.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { MovimientoEntity } from './entities/movimiento.entity';
import { MovimientoFirmaEntity } from './entities/movimiento-firma.entity';
import { SitioEntity } from './entities/sitio.entity';
import { UnidadOperativaEntity } from './entities/unidad-operativa.entity';
import { FlotaController } from './flota.controller';
import { FlotaService } from './flota.service';
import { TypeOrmFlotaStore } from './typeorm-flota-store';
import { PhysicalStateReadPort } from './physical-state-read.port';
import { TypeOrmPhysicalStateReadAdapter } from './physical-state.adapter';
import { PhysicalStateEventEntity } from './entities/physical-state-event.entity';
import { PhysicalStateTransitionService } from './physical-state-transition.service';
import { LogisticaModule } from '../logistica/logistica.module';

export const FLOTA_ENTITIES = [
  SitioEntity,
  MovimientoEntity,
  MovimientoFirmaEntity,
  UnidadOperativaEntity,
  PhysicalStateEventEntity,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(FLOTA_ENTITIES),
    UnidadesModule,
    ChoferesModule,
    AndonModule,
    forwardRef(() => LogisticaModule),
  ],
  controllers: [FlotaController],
  providers: [
    TypeOrmFlotaStore,
    FlotaService,
    PhysicalStateTransitionService,
    TypeOrmPhysicalStateReadAdapter,
    {
      provide: PhysicalStateReadPort,
      useExisting: TypeOrmPhysicalStateReadAdapter,
    },
  ],
  exports: [FlotaService, TypeOrmModule, PhysicalStateReadPort],
})
export class FlotaModule {}
