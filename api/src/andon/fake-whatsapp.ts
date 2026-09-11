/* eslint-disable @typescript-eslint/require-await */
import { WhatsAppMessage } from './andon-types';
import { WhatsAppPort } from './ports';

/** Puerto WhatsApp v0: no llama API real; registra salidas. */
export class FakeWhatsAppAdapter implements WhatsAppPort {
  readonly sent: WhatsAppMessage[] = [];

  async send(message: WhatsAppMessage) {
    this.sent.push({ ...message });
  }
}
