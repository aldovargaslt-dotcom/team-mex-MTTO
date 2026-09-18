import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { AndonModule } from '../andon/andon.module';
import { UnidadOperativaEntity } from '../flota/entities/unidad-operativa.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { TipoVehiculo } from '../unidades/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';
import { Visita } from '../visitas/visita.entity';
import { VisitasModule } from '../visitas/visitas.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoVehiculo,
      Unidad,
      Chofer,
      Visita,
      UnidadOperativaEntity,
    ]),
    InventarioModule,
    AndonModule,
    VisitasModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
