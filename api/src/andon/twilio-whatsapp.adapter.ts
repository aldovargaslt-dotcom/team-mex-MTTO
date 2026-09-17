import { Logger } from '@nestjs/common';
import { WhatsAppMessage } from './andon-types';
import { WhatsAppKind } from './enums';
import { AndonNotifier } from './ports';

const E164 = /^\+[1-9]\d{7,14}$/;
const TWILIO_API = 'https://api.twilio.com/2010-04-01/Accounts';

export type TwilioHttp = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{ ok: boolean; status: number; text: string }>;

export type TwilioAndonConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  opsPhones: string[];
  statusCallbackUrl?: string;
  templateAviso?: string;
  templateRemind?: string;
};

export function parseOpsPhones(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => E164.test(p));
}

export function twilioConfigFromEnv(
  env: Record<string, string | undefined>,
): TwilioAndonConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const from = env.TWILIO_WHATSAPP_FROM?.trim();
  const opsPhones = parseOpsPhones(env.ANDON_OPS_PHONES);
  if (!accountSid || !authToken || !from || opsPhones.length === 0) {
    return null;
  }
  return {
    accountSid,
    authToken,
    from,
    opsPhones,
    statusCallbackUrl: env.TWILIO_STATUS_CALLBACK_URL?.trim() || undefined,
    templateAviso: env.ANDON_WA_TEMPLATE_AVISO?.trim() || undefined,
    templateRemind: env.ANDON_WA_TEMPLATE_REMIND?.trim() || undefined,
  };
}

function whatsappAddress(value: string): string {
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;
}

const defaultFetch: TwilioHttp = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, text: await res.text() };
};

/**
 * Adaptador Twilio: fan-out a ANDON_OPS_PHONES (E.164). Sin SDK.
 * El dominio Andon no importa este archivo.
 */
export class TwilioWhatsAppAdapter implements AndonNotifier {
  private readonly logger = new Logger(TwilioWhatsAppAdapter.name);

  constructor(
    private readonly cfg: TwilioAndonConfig,
    private readonly http: TwilioHttp = defaultFetch,
  ) {}

  async send(message: WhatsAppMessage): Promise<void> {
    const body = this.bodyFor(message);
    const url = `${TWILIO_API}/${this.cfg.accountSid}/Messages.json`;
    const auth = Buffer.from(
      `${this.cfg.accountSid}:${this.cfg.authToken}`,
    ).toString('base64');

    for (const phone of this.cfg.opsPhones) {
      const params = new URLSearchParams();
      params.set('To', whatsappAddress(phone));
      params.set('From', whatsappAddress(this.cfg.from));
      params.set('Body', body);
      if (this.cfg.statusCallbackUrl) {
        params.set('StatusCallback', this.cfg.statusCallbackUrl);
      }
      try {
        const res = await this.http(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        if (!res.ok) {
          this.logger.warn(
            `Twilio ${res.status} ops=${phone} aviso=${message.avisoId}: ${res.text.slice(0, 180)}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Twilio error ops=${phone} aviso=${message.avisoId}: ${
            err instanceof Error ? err.message : 'fallo'
          }`,
        );
      }
    }
  }

  private bodyFor(message: WhatsAppMessage): string {
    const tpl =
      message.kind === WhatsAppKind.AVISO
        ? this.cfg.templateAviso
        : this.cfg.templateRemind;
    if (tpl) {
      return tpl
        .replaceAll('{unidadId}', message.unidadId)
        .replaceAll('{avisoId}', message.avisoId);
    }
    if (message.kind === WhatsAppKind.AVISO) {
      return `Alerta: mantenimiento vencido para teléfonos ops. unidad=${message.unidadId}`;
    }
    return `Alerta: recordatorio a teléfonos ops. unidad=${message.unidadId}`;
  }
}
