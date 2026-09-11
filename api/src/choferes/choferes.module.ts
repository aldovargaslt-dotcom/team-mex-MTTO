import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visita } from '../visitas/visita.entity';
import { Chofer } from './chofer.entity';
import { ChoferesController } from './choferes.controller';
import { ChoferesService } from './choferes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chofer, Visita])],
  controllers: [ChoferesController],
  providers: [ChoferesService],
  exports: [TypeOrmModule, ChoferesService],
})
export class ChoferesModule {}
