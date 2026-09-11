import { WhatsAppMessage } from '../andon-types';

/** Puerto de notificación outbound (noop | Evolution). Independiente del dominio Andon. */
export interface NotifyPort {
  send(message: WhatsAppMessage): Promise<void>;
}

export const NOTIFY_PORT = Symbol('NotifyPort');
