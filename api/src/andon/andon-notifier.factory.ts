import { Logger } from '@nestjs/common';
import { WhatsAppMessage } from './andon-types';
import { AndonNotifier } from './ports';
import { StubWhatsAppAdapter } from './stub-whatsapp.adapter';
import {
  TwilioHttp,
  TwilioWhatsAppAdapter,
  twilioConfigFromEnv,
} from './twilio-whatsapp.adapter';

const log = new Logger('AndonNotifier');

/** Persistencia local + Twilio HTTP. El stub solo persiste. */
class PersistAndTwilio implements AndonNotifier {
  constructor(
    private readonly persist: AndonNotifier,
    private readonly twilio: AndonNotifier,
  ) {}

  async send(message: WhatsAppMessage): Promise<void> {
    await this.persist.send(message);
    await this.twilio.send(message);
  }
}

export function createAndonNotifier(
  env: Record<string, string | undefined>,
  stub: StubWhatsAppAdapter,
  http?: TwilioHttp,
): AndonNotifier {
  const provider = (env.ANDON_NOTIFY_PROVIDER ?? 'noop').trim().toLowerCase();
  if (provider === 'evolution') {
    log.warn(
      'ANDON_NOTIFY_PROVIDER=evolution: adapter no cableado en este PR (lab Baileys/ToS; otro agente). noop/log.',
    );
    return stub;
  }
  if (provider === 'twilio') {
    const cfg = twilioConfigFromEnv(env);
    if (cfg) {
      log.log(
        `Andon notifier: Twilio opcional, fan-out a ${cfg.opsPhones.length} teléfono(s) ops.`,
      );
      return new PersistAndTwilio(stub, new TwilioWhatsAppAdapter(cfg, http));
    }
    log.warn(
      'ANDON_NOTIFY_PROVIDER=twilio pero env incompleto; se usa noop/log.',
    );
  }
  log.log('Andon notifier: noop/log (default). Enterado es in-app.');
  // evolution / otros: otro agente; providers desconocidos → noop.
  return stub;
}
