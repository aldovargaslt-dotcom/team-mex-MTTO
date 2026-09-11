import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposVehiculoModule } from '../tipos-vehiculo/tipos-vehiculo.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { AndonController } from './andon.controller';
import { AndonService } from './andon.service';
import { AvisoEntity } from './entities/aviso.entity';
import { EventoProcesadoEntity } from './entities/evento-procesado.entity';
import { UltimaVisitaEntity } from './entities/ultima-visita.entity';
import { UmbralEntity } from './entities/umbral.entity';
import { WhatsappSalidaEntity } from './entities/whatsapp-salida.entity';
import { NestUnidadCatalog } from './nest-unidad-catalog';
import { andonNotifyProviders } from './notify/notify.providers';
import { StubWhatsAppAdapter } from './stub-whatsapp.adapter';
import { TypeOrmAndonStore } from './typeorm-store';

export const ANDON_ENTITIES = [
  AvisoEntity,
  UmbralEntity,
  UltimaVisitaEntity,
  EventoProcesadoEntity,
  WhatsappSalidaEntity,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(ANDON_ENTITIES),
    UnidadesModule,
    TiposVehiculoModule,
  ],
  controllers: [AndonController],
  providers: [
    TypeOrmAndonStore,
    StubWhatsAppAdapter,
    NestUnidadCatalog,
    ...andonNotifyProviders,
    AndonService,
  ],
  exports: [AndonService, TypeOrmModule],
})
export class AndonModule {}
