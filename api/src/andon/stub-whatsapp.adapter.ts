import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppMessage } from './andon-types';
import { WhatsappSalidaEntity } from './entities/whatsapp-salida.entity';
import { WhatsAppPort } from './ports';

/** Adaptador stub: no llama WhatsApp real; persiste en schema andon. */
@Injectable()
export class StubWhatsAppAdapter implements WhatsAppPort {
  private readonly logger = new Logger(StubWhatsAppAdapter.name);

  constructor(
    @InjectRepository(WhatsappSalidaEntity)
    private readonly repo: Repository<WhatsappSalidaEntity>,
  ) {}

  async send(message: WhatsAppMessage) {
    await this.repo.save(
      this.repo.create({
        avisoId: message.avisoId,
        unidadId: message.unidadId,
        kind: message.kind,
      }),
    );
    this.logger.log(
      `[stub WA] ${message.kind} aviso=${message.avisoId} unidad=${message.unidadId}`,
    );
  }
}
