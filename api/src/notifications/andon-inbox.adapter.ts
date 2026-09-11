import { Injectable } from '@nestjs/common';
import { Aviso, UnidadVista } from '../andon/andon-types';
import { AvisoInboxPort } from '../andon/ports';
import { avisoAbiertoCommand, avisoAbiertoDedupeKey } from './inbox-rules';
import { NotificationsService } from './notifications.service';

@Injectable()
export class AndonInboxAdapter implements AvisoInboxPort {
  constructor(private readonly notifications: NotificationsService) {}

  async onAbierto(aviso: Aviso, unidad: UnidadVista | null) {
    await this.notifications.ingest(
      avisoAbiertoCommand({
        avisoId: aviso.id,
        unidadId: aviso.unidadId,
        numeroInterno: unidad?.numeroInterno ?? null,
        kmAlAbrir: aviso.kmAlAbrir,
        diasAlAbrir: aviso.diasAlAbrir,
        abiertaAt: aviso.abiertaAt,
      }),
    );
  }

  async onResuelto(aviso: Aviso) {
    await this.notifications.expireDedupe(avisoAbiertoDedupeKey(aviso.unidadId));
  }
}
