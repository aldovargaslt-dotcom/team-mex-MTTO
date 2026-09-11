import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppKind } from './enums';
import { createAndonNotifier } from './andon-notifier.factory';
import { StubWhatsAppAdapter } from './stub-whatsapp.adapter';
import {
  parseOpsPhones,
  TwilioWhatsAppAdapter,
  twilioConfigFromEnv,
} from './twilio-whatsapp.adapter';

const MSG = {
  avisoId: 'aviso-1',
  unidadId: 'unidad-1',
  kind: WhatsAppKind.AVISO,
};

function envComplete(
  over: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    TWILIO_AUTH_TOKEN: 'secret-token',
    TWILIO_WHATSAPP_FROM: '+14155238886',
    ANDON_OPS_PHONES: '+5215511111111,+5215522222222',
    ...over,
  };
}

describe('Twilio Andon notifier (ops phones, no grupo)', () => {
  it('parseOpsPhones solo acepta E.164 y parte por coma', () => {
    expect(parseOpsPhones('+5215511111111, no, +5215522222222 ')).toEqual([
      '+5215511111111',
      '+5215522222222',
    ]);
    expect(parseOpsPhones('')).toEqual([]);
  });

  it('sin env completo no arma config (stub por defecto)', () => {
    expect(twilioConfigFromEnv({})).toBeNull();
    expect(
      twilioConfigFromEnv({
        TWILIO_ACCOUNT_SID: 'AC1',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_WHATSAPP_FROM: '+14155238886',
      }),
    ).toBeNull();
  });

  it('fan-out POST por cada teléfono ops con Basic auth; no llama grupo', async () => {
    const calls: { url: string; body: string; auth: string }[] = [];
    const http = async (
      url: string,
      init: { method: string; headers: Record<string, string>; body: string },
    ) => {
      calls.push({
        url,
        body: init.body,
        auth: init.headers.Authorization,
      });
      return { ok: true, status: 201, text: '{"sid":"SM1"}' };
    };
    const cfg = twilioConfigFromEnv(envComplete())!;
    const adapter = new TwilioWhatsAppAdapter(cfg, http);
    await adapter.send(MSG);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain(
      '/Accounts/ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/Messages.json',
    );
    expect(calls[0].auth).toMatch(/^Basic /);
    const decoded = Buffer.from(calls[0].auth.slice(6), 'base64').toString();
    expect(decoded).toBe('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:secret-token');
    expect(calls.map((c) => new URLSearchParams(c.body).get('To'))).toEqual([
      'whatsapp:+5215511111111',
      'whatsapp:+5215522222222',
    ]);
    expect(new URLSearchParams(calls[0].body).get('From')).toBe(
      'whatsapp:+14155238886',
    );
    expect(calls[0].body).not.toMatch(/grupo/i);
    expect(new URLSearchParams(calls[0].body).get('Body')).toMatch(/ops/i);
  });

  it('HTTP 5xx no lanza (no bloquea apertura Andon)', async () => {
    const adapter = new TwilioWhatsAppAdapter(
      twilioConfigFromEnv(envComplete())!,
      async () => ({ ok: false, status: 500, text: 'fail' }),
    );
    await expect(adapter.send(MSG)).resolves.toBeUndefined();
  });

  it('factory usa stub si falta env; no pega HTTP', async () => {
    const http = jest.fn();
    const stub = {
      send: jest.fn(async () => undefined),
    } as unknown as StubWhatsAppAdapter;
    const notifier = createAndonNotifier({}, stub, http);
    await notifier.send(MSG);
    expect(stub.send).toHaveBeenCalledWith(MSG);
    expect(http).not.toHaveBeenCalled();
  });

  it('env Twilio completo sin ANDON_NOTIFY_PROVIDER=twilio sigue en noop', async () => {
    const http = jest.fn();
    const stub = {
      send: jest.fn(async () => undefined),
    } as unknown as StubWhatsAppAdapter;
    const notifier = createAndonNotifier(envComplete(), stub, http);
    await notifier.send(MSG);
    expect(stub.send).toHaveBeenCalledWith(MSG);
    expect(http).not.toHaveBeenCalled();
  });

  it('factory con PROVIDER=twilio y env completo persiste y fanea a ops', async () => {
    const http = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: '{}',
    }));
    const stub = {
      send: jest.fn(async () => undefined),
    } as unknown as StubWhatsAppAdapter;
    const notifier = createAndonNotifier(
      envComplete({ ANDON_NOTIFY_PROVIDER: 'twilio' }),
      stub,
      http,
    );
    await notifier.send(MSG);
    expect(stub.send).toHaveBeenCalledWith(MSG);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('opcional: StatusCallback y plantilla de aviso', async () => {
    const calls: string[] = [];
    const cfg = twilioConfigFromEnv(
      envComplete({
        TWILIO_STATUS_CALLBACK_URL: 'https://ops.example/twilio/status',
        ANDON_WA_TEMPLATE_AVISO: 'Ops aviso {avisoId} unidad {unidadId}',
      }),
    )!;
    const adapter = new TwilioWhatsAppAdapter(cfg, async (_url, init) => {
      calls.push(init.body);
      return { ok: true, status: 201, text: '{}' };
    });
    await adapter.send(MSG);
    const params = new URLSearchParams(calls[0]);
    expect(params.get('StatusCallback')).toBe(
      'https://ops.example/twilio/status',
    );
    expect(params.get('Body')).toBe('Ops aviso aviso-1 unidad unidad-1');
  });

  it('sin ruta inbound: el controller Andon no expone webhook WA', () => {
    const src = readFileSync(join(__dirname, 'andon.controller.ts'), 'utf8');
    expect(src).not.toMatch(/webhook/i);
    expect(src).not.toMatch(/inbound/i);
    expect(src).toMatch(/enterado/);
  });

  it('el adaptador no importa el SDK de Twilio (HTTP plano)', () => {
    const src = readFileSync(
      join(__dirname, 'twilio-whatsapp.adapter.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/from ['"]twilio['"]/);
    expect(src).not.toMatch(/grupo/i);
  });
});
