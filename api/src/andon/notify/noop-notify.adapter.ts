/* eslint-disable @typescript-eslint/require-await */
import { Logger } from '@nestjs/common';
import { WhatsAppMessage } from '../andon-types';
import { NotifyPort } from './notify.port';

/** Default: no llama API real ni persiste. */
export class NoopNotifyAdapter implements NotifyPort {
  private readonly logger = new Logger(NoopNotifyAdapter.name);

  async send(message: WhatsAppMessage): Promise<void> {
    this.logger.log(
      `[noop notify] ${message.kind} aviso=${message.avisoId} unidad=${message.unidadId}`,
    );
  }
}
