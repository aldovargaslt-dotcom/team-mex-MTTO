import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { Visita } from '../visitas/visita.entity';
import { TipoVehiculo } from './tipo-vehiculo.entity';
import { TiposVehiculoController } from './tipos-vehiculo.controller';
import { TiposVehiculoService } from './tipos-vehiculo.service';
import { Unidad } from './unidad.entity';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unidad, TipoVehiculo, Visita, Chofer])],
  controllers: [TiposVehiculoController, UnidadesController],
  providers: [UnidadesService, TiposVehiculoService],
  exports: [TypeOrmModule, UnidadesService, TiposVehiculoService],
})
export class UnidadesModule {}
