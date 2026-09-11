import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoVehiculo } from './tipo-vehiculo.entity';
import { TiposVehiculoController } from './tipos-vehiculo.controller';
import { TiposVehiculoService } from './tipos-vehiculo.service';

@Module({
  imports: [TypeOrmModule.forFeature([TipoVehiculo])],
  controllers: [TiposVehiculoController],
  providers: [TiposVehiculoService],
  exports: [TypeOrmModule, TiposVehiculoService],
})
export class TiposVehiculoModule {}
