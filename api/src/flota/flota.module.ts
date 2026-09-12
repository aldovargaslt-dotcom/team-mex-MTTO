import { Module } from '@nestjs/common';
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

export const FLOTA_ENTITIES = [
  SitioEntity,
  MovimientoEntity,
  MovimientoFirmaEntity,
  UnidadOperativaEntity,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(FLOTA_ENTITIES),
    UnidadesModule,
    ChoferesModule,
    AndonModule,
  ],
  controllers: [FlotaController],
  providers: [TypeOrmFlotaStore, FlotaService],
  exports: [FlotaService, TypeOrmModule],
})
export class FlotaModule {}
