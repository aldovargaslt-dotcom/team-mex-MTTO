import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TiposVehiculoModule } from '../tipos-vehiculo/tipos-vehiculo.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { AndonController } from './andon.controller';
import { createAndonNotifier } from './andon-notifier.factory';
import { AndonService } from './andon.service';
import { AvisoEntity } from './entities/aviso.entity';
import { EventoProcesadoEntity } from './entities/evento-procesado.entity';
import { UltimaVisitaEntity } from './entities/ultima-visita.entity';
import { UmbralEntity } from './entities/umbral.entity';
import { WhatsappSalidaEntity } from './entities/whatsapp-salida.entity';
import { NestUnidadCatalog } from './nest-unidad-catalog';
import { NOTIFY_PORT } from './ports';
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
    {
      provide: NOTIFY_PORT,
      inject: [ConfigService, StubWhatsAppAdapter],
      useFactory: (config: ConfigService, stub: StubWhatsAppAdapter) =>
        createAndonNotifier(
          {
            ANDON_NOTIFY_PROVIDER: config.get('ANDON_NOTIFY_PROVIDER'),
            TWILIO_ACCOUNT_SID: config.get('TWILIO_ACCOUNT_SID'),
            TWILIO_AUTH_TOKEN: config.get('TWILIO_AUTH_TOKEN'),
            TWILIO_WHATSAPP_FROM: config.get('TWILIO_WHATSAPP_FROM'),
            ANDON_OPS_PHONES: config.get('ANDON_OPS_PHONES'),
            TWILIO_STATUS_CALLBACK_URL: config.get('TWILIO_STATUS_CALLBACK_URL'),
            ANDON_WA_TEMPLATE_AVISO: config.get('ANDON_WA_TEMPLATE_AVISO'),
            ANDON_WA_TEMPLATE_REMIND: config.get('ANDON_WA_TEMPLATE_REMIND'),
          },
          stub,
        ),
    },
    AndonService,
  ],
  exports: [AndonService, TypeOrmModule],
})
export class AndonModule {}
