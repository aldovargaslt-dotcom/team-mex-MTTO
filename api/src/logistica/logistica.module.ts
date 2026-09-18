import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChoferesModule } from '../choferes/choferes.module';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesModule } from '../unidades/unidades.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { UNIDAD_CHOFER_ASSIGNMENT_PORT } from './logistica-types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unidad]),
    UnidadesModule,
    ChoferesModule,
  ],
  controllers: [LogisticaController],
  providers: [
    LogisticaService,
    {
      provide: UNIDAD_CHOFER_ASSIGNMENT_PORT,
      useExisting: LogisticaService,
    },
  ],
  exports: [LogisticaService, UNIDAD_CHOFER_ASSIGNMENT_PORT],
})
export class LogisticaModule {}
