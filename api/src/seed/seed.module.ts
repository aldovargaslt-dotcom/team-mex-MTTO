import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoVehiculo } from '../tipos-vehiculo/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([TipoVehiculo, Unidad])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
