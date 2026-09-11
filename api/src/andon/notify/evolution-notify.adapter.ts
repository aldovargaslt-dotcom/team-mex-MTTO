import { Logger } from '@nestjs/common';
import { WhatsAppMessage } from '../andon-types';
import { WhatsAppKind } from '../enums';
import { NotifyPort } from './notify.port';

export type EvolutionHttp = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{ ok: boolean; status: number; text: string }>;

export type EvolutionNotifyConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  groupJid: string;
};

const defaultFetch: EvolutionHttp = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, text: await res.text() };
};

export function evolutionConfigFromEnv(
  env: Record<string, string | undefined>,
): EvolutionNotifyConfig | null {
  const baseUrl = env.EVOLUTION_BASE_URL?.trim().replace(/\/+$/, '');
  const apiKey = env.EVOLUTION_API_KEY?.trim();
  const instance = env.EVOLUTION_INSTANCE?.trim();
  const groupJid = env.ANDON_WA_GROUP_JID?.trim();
  if (!baseUrl || !apiKey || !instance || !groupJid) {
    return null;
  }
  if (!groupJid.endsWith('@g.us')) {
    return null;
  }
  return { baseUrl, apiKey, instance, groupJid };
}

/**
 * Adaptador Evolution API v2: POST /message/sendText/{instance}
 * `number` = ANDON_WA_GROUP_JID (@g.us). Demo/lab; no producción.
 */
export class EvolutionNotifyAdapter implements NotifyPort {
  private readonly logger = new Logger(EvolutionNotifyAdapter.name);

  constructor(
    private readonly cfg: EvolutionNotifyConfig,
    private readonly http: EvolutionHttp = defaultFetch,
  ) {}

  async send(message: WhatsAppMessage): Promise<void> {
    const url = `${this.cfg.baseUrl}/message/sendText/${encodeURIComponent(this.cfg.instance)}`;
    const payload = {
      number: this.cfg.groupJid,
      text: this.textFor(message),
    };
    try {
      const res = await this.http(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.cfg.apiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(
          `Evolution ${res.status} aviso=${message.avisoId}: ${res.text.slice(0, 180)}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Evolution error aviso=${message.avisoId}: ${
          err instanceof Error ? err.message : 'fallo'
        }`,
      );
    }
  }

  private textFor(message: WhatsAppMessage): string {
    if (message.kind === WhatsAppKind.AVISO) {
      return `Andon: aviso de mantenimiento vencido. unidad=${message.unidadId}`;
    }
    return `Andon: recordatorio. unidad=${message.unidadId}`;
  }
}
