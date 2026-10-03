import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasService } from './alertas.service';
import { ReglaFlotaSinRegresoEntity } from './entities/regla-flota-sin-regreso.entity';
import { UmbralUnidadEntity } from './entities/umbral-unidad.entity';
import { TorreUrgencyConfigEntity } from './entities/torre-urgency-config.entity';

export const ALERTAS_ENTITIES = [
  ReglaFlotaSinRegresoEntity,
  UmbralUnidadEntity,
  TorreUrgencyConfigEntity,
];

@Module({
  imports: [TypeOrmModule.forFeature(ALERTAS_ENTITIES)],
  providers: [AlertasService],
  exports: [AlertasService, TypeOrmModule],
})
export class AlertasModule {}
