import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { TipoVehiculo } from '../tipos-vehiculo/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoVehiculo, Unidad, Chofer]),
    InventarioModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
