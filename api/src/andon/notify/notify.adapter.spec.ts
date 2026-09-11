import { WhatsAppKind } from '../enums';
import { StubWhatsAppAdapter } from '../stub-whatsapp.adapter';
import {
  EvolutionHttp,
  EvolutionNotifyAdapter,
  evolutionConfigFromEnv,
} from './evolution-notify.adapter';
import { NoopNotifyAdapter } from './noop-notify.adapter';
import {
  createAndonNotify,
  createNotifyPort,
  normalizeNotifyProvider,
} from './notify.factory';

const MSG = {
  avisoId: 'aviso-1',
  unidadId: 'unidad-1',
  kind: WhatsAppKind.AVISO,
};

const GROUP = '120363025536974933@g.us';

function envEvolution(
  over: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    ANDON_NOTIFY_PROVIDER: 'evolution',
    EVOLUTION_BASE_URL: 'https://evo.example.com/',
    EVOLUTION_API_KEY: 'evo-secret',
    EVOLUTION_INSTANCE: 'andon-lab',
    ANDON_WA_GROUP_JID: GROUP,
    ...over,
  };
}

function fakeStub() {
  const send = jest.fn(() => Promise.resolve());
  return {
    send,
    stub: { send } as unknown as StubWhatsAppAdapter,
  };
}

describe('NotifyPort noop + Evolution', () => {
  it('normalizeNotifyProvider default es noop', () => {
    expect(normalizeNotifyProvider(undefined)).toBe('noop');
    expect(normalizeNotifyProvider('')).toBe('noop');
    expect(normalizeNotifyProvider('NOOP')).toBe('noop');
    expect(normalizeNotifyProvider('evolution')).toBe('evolution');
    expect(normalizeNotifyProvider(' Evolution ')).toBe('evolution');
  });

  it('NoopNotifyAdapter no llama fetch', async () => {
    const http = jest.fn();
    const adapter = new NoopNotifyAdapter();
    await expect(adapter.send(MSG)).resolves.toBeUndefined();
    expect(http).not.toHaveBeenCalled();
  });

  it('createNotifyPort default es NoopNotifyAdapter y no pega HTTP', async () => {
    const http = jest.fn();
    const port = createNotifyPort({}, http);
    expect(port).toBeInstanceOf(NoopNotifyAdapter);
    await port.send(MSG);
    expect(http).not.toHaveBeenCalled();
  });

  it('evolutionConfigFromEnv exige URL, key, instance y JID @g.us', () => {
    expect(evolutionConfigFromEnv({})).toBeNull();
    expect(
      evolutionConfigFromEnv(
        envEvolution({ ANDON_WA_GROUP_JID: '5215511111111' }),
      ),
    ).toBeNull();
    expect(evolutionConfigFromEnv(envEvolution())).toEqual({
      baseUrl: 'https://evo.example.com',
      apiKey: 'evo-secret',
      instance: 'andon-lab',
      groupJid: GROUP,
    });
  });

  it('Evolution POST /message/sendText/{instance} con number = group JID', async () => {
    const calls: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
    }[] = [];
    const http: EvolutionHttp = (url, init) => {
      calls.push({ url, ...init });
      return Promise.resolve({
        ok: true,
        status: 201,
        text: '{"key":{"id":"1"}}',
      });
    };
    const cfg = evolutionConfigFromEnv(envEvolution())!;
    const adapter = new EvolutionNotifyAdapter(cfg, http);
    await adapter.send(MSG);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://evo.example.com/message/sendText/andon-lab',
    );
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers.apikey).toBe('evo-secret');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    const payload = JSON.parse(calls[0].body) as {
      number: string;
      text: string;
    };
    expect(payload.number).toBe(GROUP);
    expect(payload.number.endsWith('@g.us')).toBe(true);
    expect(payload.text).toMatch(/unidad-1/);
    expect(payload.text).toMatch(/aviso/i);
  });

  it('HTTP 5xx no lanza (no bloquea apertura Andon)', async () => {
    const adapter = new EvolutionNotifyAdapter(
      evolutionConfigFromEnv(envEvolution())!,
      () => Promise.resolve({ ok: false, status: 500, text: 'fail' }),
    );
    await expect(adapter.send(MSG)).resolves.toBeUndefined();
  });

  it('createNotifyPort evolution con env incompleto cae a noop', async () => {
    const http = jest.fn();
    const port = createNotifyPort({ ANDON_NOTIFY_PROVIDER: 'evolution' }, http);
    expect(port).toBeInstanceOf(NoopNotifyAdapter);
    await port.send(MSG);
    expect(http).not.toHaveBeenCalled();
  });

  it('createNotifyPort evolution con env completo usa EvolutionNotifyAdapter', () => {
    const port = createNotifyPort(envEvolution(), jest.fn());
    expect(port).toBeInstanceOf(EvolutionNotifyAdapter);
  });

  it('createAndonNotify evolution persiste stub y POST Evolution; no Twilio', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const http: EvolutionHttp = (url, init) => {
      calls.push({ url, headers: init.headers });
      return Promise.resolve({ ok: true, status: 201, text: '{}' });
    };
    const { send, stub } = fakeStub();
    const notifier = createAndonNotify(envEvolution(), stub, http);
    await notifier.send(MSG);
    expect(send).toHaveBeenCalledWith(MSG);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/message/sendText/andon-lab');
    expect(calls[0].url).not.toMatch(/twilio/i);
    expect(calls[0].headers.apikey).toBe('evo-secret');
  });

  it('createAndonNotify noop no llama Evolution HTTP', async () => {
    const http = jest.fn();
    const { send, stub } = fakeStub();
    const notifier = createAndonNotify(
      { ANDON_NOTIFY_PROVIDER: 'noop' },
      stub,
      http,
    );
    await notifier.send(MSG);
    expect(send).toHaveBeenCalledWith(MSG);
    expect(http).not.toHaveBeenCalled();
  });
});
