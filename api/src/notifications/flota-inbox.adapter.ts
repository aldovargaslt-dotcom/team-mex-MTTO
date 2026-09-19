import { Injectable } from '@nestjs/common';
import {
  flotaSinRegresoCommand,
  flotaSinRegresoDedupeKey,
} from './inbox-rules';
import { NotificationsService } from './notifications.service';
import {
  FlotaSinRegresoAbierto,
  FlotaSinRegresoPort,
} from '../logistica/logistica-types';

@Injectable()
export class FlotaInboxAdapter implements FlotaSinRegresoPort {
  constructor(private readonly notifications: NotificationsService) {}

  async onAbierto(event: FlotaSinRegresoAbierto) {
    await this.notifications.ingest(flotaSinRegresoCommand(event));
  }

  async onCerrado(unidadId: string) {
    await this.notifications.expireDedupe(flotaSinRegresoDedupeKey(unidadId));
  }
}
