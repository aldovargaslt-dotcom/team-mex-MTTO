import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadesModule } from '../unidades/unidades.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AndonInboxAdapter } from '../notifications/andon-inbox.adapter';
import { AndonController } from './andon.controller';
import { AndonService } from './andon.service';
import { AvisoEntity } from './entities/aviso.entity';
import { EventoProcesadoEntity } from './entities/evento-procesado.entity';
import { UltimaVisitaEntity } from './entities/ultima-visita.entity';
import { UmbralEntity } from './entities/umbral.entity';
import { WhatsappSalidaEntity } from './entities/whatsapp-salida.entity';
import { NestUnidadCatalog } from './nest-unidad-catalog';
import { andonNotifyProviders } from './notify/notify.providers';
import { ANDON_ABIERTO_PORT, AVISO_INBOX_PORT } from './ports';
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
    NotificationsModule,
  ],
  controllers: [AndonController],
  providers: [
    TypeOrmAndonStore,
    StubWhatsAppAdapter,
    NestUnidadCatalog,
    ...andonNotifyProviders,
    {
      provide: AVISO_INBOX_PORT,
      useExisting: AndonInboxAdapter,
    },
    AndonService,
    {
      provide: ANDON_ABIERTO_PORT,
      useExisting: AndonService,
    },
  ],
  exports: [AndonService, ANDON_ABIERTO_PORT, TypeOrmModule],
})
export class AndonModule {}
