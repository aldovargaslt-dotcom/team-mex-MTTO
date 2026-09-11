import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { TiposVehiculoModule } from '../tipos-vehiculo/tipos-vehiculo.module';
import { Visita } from '../visitas/visita.entity';
import { Unidad } from './unidad.entity';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Unidad, Visita, Chofer]),
    TiposVehiculoModule,
  ],
  controllers: [UnidadesController],
  providers: [UnidadesService],
  exports: [TypeOrmModule, UnidadesService],
})
export class UnidadesModule {}
