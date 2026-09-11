import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppMessage } from '../andon-types';
import { createAndonNotifier } from '../andon-notifier.factory';
import { AndonNotifier } from '../ports';
import { StubWhatsAppAdapter } from '../stub-whatsapp.adapter';
import {
  EvolutionHttp,
  EvolutionNotifyAdapter,
  evolutionConfigFromEnv,
} from './evolution-notify.adapter';
import { NoopNotifyAdapter } from './noop-notify.adapter';
import { NotifyPort } from './notify.port';

const log = new Logger('AndonNotify');

const ENV_KEYS = [
  'ANDON_NOTIFY_PROVIDER',
  'EVOLUTION_BASE_URL',
  'EVOLUTION_API_KEY',
  'EVOLUTION_INSTANCE',
  'ANDON_WA_GROUP_JID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'ANDON_OPS_PHONES',
  'TWILIO_STATUS_CALLBACK_URL',
  'ANDON_WA_TEMPLATE_AVISO',
  'ANDON_WA_TEMPLATE_REMIND',
] as const;

export type NotifyProviderName = 'noop' | 'evolution';

/** Persistencia local (stub) + NotifyPort (Evolution o noop). */
class PersistAndNotify implements AndonNotifier {
  constructor(
    private readonly persist: AndonNotifier,
    private readonly notify: NotifyPort,
  ) {}

  async send(message: WhatsAppMessage): Promise<void> {
    await this.persist.send(message);
    await this.notify.send(message);
  }
}

export function normalizeNotifyProvider(
  raw: string | undefined,
): NotifyProviderName {
  return raw?.trim().toLowerCase() === 'evolution' ? 'evolution' : 'noop';
}

export function envFromConfig(
  config: ConfigService,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    const value = config.get<string>(key);
    env[key] = typeof value === 'string' ? value : undefined;
  }
  return env;
}

/** Selección noop (default) | evolution. No toca el motor Andon. */
export function createNotifyPort(
  env: Record<string, string | undefined>,
  http?: EvolutionHttp,
): NotifyPort {
  const provider = normalizeNotifyProvider(env.ANDON_NOTIFY_PROVIDER);
  if (provider === 'evolution') {
    const cfg = evolutionConfigFromEnv(env);
    if (cfg) {
      log.log(
        `Andon notify: Evolution instance=${cfg.instance} group=${cfg.groupJid}`,
      );
      return new EvolutionNotifyAdapter(cfg, http);
    }
    log.log(
      'Andon notify: evolution seleccionado pero env incompleto (base URL, api key, instance, JID @g.us). Usando noop.',
    );
  } else {
    log.log('Andon notify: noop (ANDON_NOTIFY_PROVIDER≠evolution).');
  }
  return new NoopNotifyAdapter();
}

/**
 * Cableado al token NOTIFY_PORT:
 * - evolution → stub persist + Evolution HTTP
 * - noop (default) → createAndonNotifier (#5: stub; twilio solo si PROVIDER=twilio)
 */
export function createAndonNotify(
  env: Record<string, string | undefined>,
  stub: StubWhatsAppAdapter,
  http?: EvolutionHttp,
): AndonNotifier {
  if (normalizeNotifyProvider(env.ANDON_NOTIFY_PROVIDER) === 'evolution') {
    return new PersistAndNotify(stub, createNotifyPort(env, http));
  }
  return createAndonNotifier(env, stub);
}
