import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import {
  trustedTestActor,
  prepareDepartureFixture,
} from './departure-test-fixture';
import {
  initializeJourneyFixture,
  commandHeaders,
} from './journey-test-fixture';
import { LogisticaJourneyService } from '../src/logistica/journey.service';
import type { JourneyBinding } from '../../web/src/lib/journey-commands';

// Existing TypeScript compiler + Node Fetch, no browser framework. Execute the
// actual BFF and browser helper code; only session-cookie decoding is a fixture.
function evaluate(
  file: string,
  dependencies: Record<string, unknown>,
  globals: Record<string, unknown> = {},
) {
  const code = transpileModule(
    readFileSync(join(__dirname, '../../web/src', file), 'utf8'),
    {
      compilerOptions: {
        target: ScriptTarget.ES2021,
        module: ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const names = Object.keys(globals);
  new Function('require', 'exports', ...names, code)(
    (name: string) => {
      if (!(name in dependencies)) throw new Error('Unexpected import ' + name);
      return dependencies[name];
    },
    exports,
    ...Object.values(globals),
  );
  return exports;
}

describe('LJ-07/09 browser storage -> actual BFF -> HTTP API -> PostgreSQL', () => {
  let app: INestApplication, db: DataSource, id: string, url: string;
  let proxy: ReturnType<typeof evaluate>,
    helper: ReturnType<typeof evaluate>,
    binding: JourneyBinding;
  let cookie: string, drop: 'before' | 'after' | null, calls: number;
  const a = trustedTestActor('proxy|A', Rol.LOGISTICA, 'proxy-mex');
  const b = { ...a, subject: 'proxy|B' };
  const storage = new Map<string, string>();
  const sessionStorage = {
    get length() {
      return storage.size;
    },
    key: (i: number) => [...storage.keys()][i] ?? null,
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  };
  // Resolve Next from the web package, whose installed version owns this route.
  const next = require('../../web/node_modules/next/server'); // eslint-disable-line @typescript-eslint/no-require-imports
  const window = { dispatchEvent: jest.fn() };
  const nativeFetch = global.fetch;
  function reloadHelper() {
    const browserFetch = async (path: string, options: RequestInit = {}) => {
      calls++;
      if (drop === 'before') {
        drop = null;
        throw new TypeError('request lost before dispatch');
      }
      const headers = new Headers(options.headers);
      headers.set('cookie', 'team-mex-session=' + cookie);
      headers.set('origin', 'http://browser.test');
      const req = new next.NextRequest('http://browser.test' + path, {
        ...options,
        headers,
      });
      const response = await proxy.POST(req, {
        params: Promise.resolve({
          path: path.replace(/^\/backend\//, '').split('/'),
        }),
      });
      if (drop === 'after') {
        drop = null;
        throw new TypeError('response lost after commit');
      }
      return response;
    };
    const api = evaluate('lib/api.ts', {}, { fetch: browserFetch, window });
    helper = evaluate(
      'lib/journey-commands.ts',
      { './api': api },
      { sessionStorage, crypto: global.crypto, window, Event, CustomEvent },
    );
  }
  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) =>
          req.headers.authorization === 'Bearer A'
            ? a
            : req.headers.authorization === 'Bearer B'
              ? b
              : null,
      })
      .compile();
    app = m.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = app.get(DataSource);
    await initializeJourneyFixture(db);
    url = await app.getUrl();
    proxy = evaluate(
      'app/backend/[...path]/route.ts',
      {
        'next/server': next,
        '@/lib/server/auth': {
          legacyDevelopment: () => false,
          authConfig: () => ({ apiUrl: url }),
          sameOrigin: (req: Request) =>
            req.headers.get('origin') === 'http://browser.test',
          sessionToken: async (value: string) =>
            value === 'cookie-A' ? 'A' : value === 'cookie-B' ? 'B' : null,
          SESSION_COOKIE: 'team-mex-session',
          cookieOptions: { path: '/' },
          noStore: { 'Cache-Control': 'private, no-store' },
        },
      },
      { fetch: nativeFetch },
    );
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  beforeEach(async () => {
    storage.clear();
    cookie = 'cookie-A';
    drop = null;
    calls = 0;
    const type = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0]
      .id;
    const suffix = randomUUID().slice(0, 8);
    const r = await request(app.getHttpServer())
      .post('/unidades')
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .send({
        numeroInterno: 'WEB-' + suffix,
        placas: 'WEB-' + suffix,
        tipoId: type,
      })
      .expect(201);
    id = r.body.id;
    await prepareDepartureFixture(db, id, 'proxy-mex', a.subject);
    binding = (await app
      .get(LogisticaJourneyService)
      .context(id, a)) as JourneyBinding;
    reloadHelper();
  });
  const state = async () =>
    (await db.query('SELECT * FROM unidades WHERE id=$1', [id]))[0];
  it('passes all binding headers through BFF; subject cookie switch rejects initial and replayed commands', async () => {
    cookie = 'cookie-B';
    await expect(
      helper.submitJourney(
        'salidas',
        binding,
        { ambito: 'LOCAL' },
        'LOGISTICA',
        a.subject,
      ),
    ).rejects.toMatchObject({ code: 'LOGISTICA_COMMAND_SUBJECT_CHANGED' });
    expect((await state()).ops_estado).toBe('DISPONIBLE');
    expect(storage.size).toBe(1);
    const prior = calls;
    reloadHelper();
    await helper.resumeJourneys(a.subject, 'LOGISTICA');
    expect(calls).toBe(prior); // definitive subject mismatch suspends automatic replay
    storage.clear();
    cookie = 'cookie-A';
    reloadHelper();
    await helper.submitJourney(
      'salidas',
      binding,
      { ambito: 'LOCAL' },
      'LOGISTICA',
      a.subject,
    );
    expect((await state()).ops_estado).toBe('EN_RUTA');
    expect(storage.size).toBe(0);
    const returning = await app.get(LogisticaJourneyService).context(id, a);
    drop = 'after';
    await expect(
      helper.submitJourney('regresos', returning, null, 'LOGISTICA', a.subject),
    ).rejects.toThrow('response lost');
    cookie = 'cookie-B';
    reloadHelper();
    await helper.resumeJourneys(a.subject, 'LOGISTICA');
    expect((await state()).ops_estado).toBe('DISPONIBLE');
    expect(window.dispatchEvent).toHaveBeenCalled();
    const entries = await db.query(
      'SELECT DISTINCT actor_id FROM logistica_journey_commands WHERE unidad_id=$1',
      [id],
    );
    expect(entries).toEqual([{ actor_id: a.subject }]);
  });
  it('reload automatically makes delayed first commit once using the original stored envelope', async () => {
    drop = 'before';
    await expect(
      helper.submitJourney(
        'salidas',
        binding,
        { ambito: 'FORANEO', destino: 'Delayed' },
        'LOGISTICA',
        a.subject,
      ),
    ).rejects.toThrow('request lost');
    const original = [...storage.values()][0];
    expect((await state()).ops_estado).toBe('DISPONIBLE');
    reloadHelper();
    await Promise.all([
      helper.resumeJourneys(a.subject, 'LOGISTICA'),
      helper.resumeJourneys(a.subject, 'LOGISTICA'),
    ]);
    expect((await state()).ops_estado).toBe('EN_RUTA');
    expect(storage.size).toBe(0);
    const [receipt] = await db.query(
      'SELECT command_id FROM logistica_journey_commands WHERE unidad_id=$1',
      [id],
    );
    expect(receipt.command_id).toBe(JSON.parse(original).commandId);
    expect(calls).toBe(2);
  });
  it('lost-response J1 return replay after J2 preserves J2 and original timestamps', async () => {
    await helper.submitJourney(
      'salidas',
      binding,
      { ambito: 'LOCAL' },
      'LOGISTICA',
      a.subject,
    );
    const returning = await app.get(LogisticaJourneyService).context(id, a);
    drop = 'after';
    await expect(
      helper.submitJourney('regresos', returning, null, 'LOGISTICA', a.subject),
    ).rejects.toThrow('response lost');
    await request(app.getHttpServer())
      .post('/logistica/salidas/' + id)
      .set('Authorization', 'Bearer A')
      .set(await commandHeaders(db, id, a.subject))
      .send({ ambito: 'LOCAL' })
      .expect(204);
    const before = await state();
    const endpoints = await db.query(
      'SELECT id,returned_effective_at FROM logistica_journeys WHERE unidad_id=$1 ORDER BY id',
      [id],
    );
    reloadHelper();
    await helper.resumeJourneys(a.subject, 'LOGISTICA');
    expect(await state()).toEqual(before);
    expect(
      await db.query(
        'SELECT id,returned_effective_at FROM logistica_journeys WHERE unidad_id=$1 ORDER BY id',
        [id],
      ),
    ).toEqual(endpoints);
  });
  it('no draft replay, no cross-subject replay, and storage failure sends no command', async () => {
    await helper.resumeJourneys(a.subject, 'LOGISTICA');
    expect(calls).toBe(0);
    const spy = jest.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    await expect(
      helper.submitJourney(
        'salidas',
        binding,
        { ambito: 'LOCAL' },
        'LOGISTICA',
        a.subject,
      ),
    ).rejects.toThrow('storage unavailable');
    spy.mockRestore();
    expect(calls).toBe(0);
    drop = 'before';
    await expect(
      helper.submitJourney(
        'salidas',
        binding,
        { ambito: 'LOCAL' },
        'LOGISTICA',
        a.subject,
      ),
    ).rejects.toThrow();
    reloadHelper();
    const before = calls;
    await helper.resumeJourneys(b.subject, 'LOGISTICA');
    expect(calls).toBe(before);
  });
});
