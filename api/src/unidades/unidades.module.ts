import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposVehiculoModule } from '../tipos-vehiculo/tipos-vehiculo.module';
import { Unidad } from './unidad.entity';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unidad]), TiposVehiculoModule],
  controllers: [UnidadesController],
  providers: [UnidadesService],
  exports: [TypeOrmModule, UnidadesService],
})
export class UnidadesModule {}
