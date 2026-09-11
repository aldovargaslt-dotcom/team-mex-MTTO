import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChoferesModule } from '../choferes/choferes.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { Visita } from './visita.entity';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visita,
      VisitaTrabajo,
      VisitaFoto,
      VisitaFirma,
      VisitaPieza,
    ]),
    UnidadesModule,
    ChoferesModule,
  ],
  controllers: [VisitasController],
  providers: [VisitasService],
  exports: [TypeOrmModule, VisitasService],
})
export class VisitasModule {}
