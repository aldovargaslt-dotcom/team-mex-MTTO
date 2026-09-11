import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Rol } from '../auth/roles.enum';
import {
  OrigenConsumo,
  buildVisitaCerrada,
} from '../kernel/events/visita-cerrada';
import { AndonEngine } from './andon-engine';
import { evaluarApertura } from './andon-rules';
import { EstadoAviso, WhatsAppKind } from './enums';
import { FakeWhatsAppAdapter } from './fake-whatsapp';
import { InMemoryUnidadCatalog } from './in-memory-catalog';
import { InMemoryAndonStore } from './in-memory-store';

const UNIDAD = '11111111-1111-4111-8111-111111111111';
const TIPO = '22222222-2222-4222-8222-222222222222';
const VISITA_1 = '33333333-3333-4333-8333-333333333331';
const VISITA_2 = '33333333-3333-4333-8333-333333333332';
const EVENT_1 = '44444444-4444-4444-8444-444444444441';
const EVENT_2 = '44444444-4444-4444-8444-444444444442';

const CERRADO_AT = '2026-01-01T00:00:00.000Z';
const DAY_90 = '2026-04-01T00:00:00.000Z';
const DAY_10 = '2026-01-11T00:00:00.000Z';

function payload(over: Partial<Parameters<typeof buildVisitaCerrada>[0]> = {}) {
  return buildVisitaCerrada({
    eventId: EVENT_1,
    visitaId: VISITA_1,
    unidadId: UNIDAD,
    tipoVehiculoId: TIPO,
    km: 10000,
    cerradoAt: CERRADO_AT,
    consumos: [
      { itemId: 'item-stock', qty: 3, origen: OrigenConsumo.DESDE_STOCK },
    ],
    ...over,
  });
}

function harness() {
  const store = new InMemoryAndonStore();
  const catalog = new InMemoryUnidadCatalog();
  const whatsapp = new FakeWhatsAppAdapter();
  const visitaWrites: unknown[] = [];
  const stockWrites: unknown[] = [];
  catalog.put({
    unidadId: UNIDAD,
    tipoVehiculoId: TIPO,
    activa: true,
    numeroInterno: 'U-101',
  });
  const engine = new AndonEngine({
    store,
    catalog,
    whatsapp,
    visitaWriter: { write: (p) => visitaWrites.push(p) },
    stockWriter: { write: (p) => stockWrites.push(p) },
  });
  return { engine, store, catalog, whatsapp, visitaWrites, stockWrites };
}

describe('Andon v0 (ADR-004 A1–A8)', () => {
  describe('A1 skip no prior closed visit', () => {
    it('no abre si no hay visita cerrada previa aunque km/días superen umbral', async () => {
      const { engine, store } = harness();
      await store.setUmbral({ tipoVehiculoId: TIPO, tKm: 1000, tDias: 7 });
      const aviso = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 50000,
        now: new Date(DAY_90),
      });
      expect(aviso).toBeNull();
      expect(await store.listNoResueltos()).toEqual([]);
    });

    it('evaluarTodas no abre sin handleVisitaCerrada (no hay proyección last-closed)', async () => {
      const { engine, store } = harness();
      await store.setUmbral({ tipoVehiculoId: TIPO, tKm: 1, tDias: 1 });
      const opened = await engine.evaluarTodas(new Date(DAY_90));
      expect(opened).toEqual([]);
      expect(await store.listNoResueltos()).toEqual([]);
    });

    it('proyección sin visitaId opaco no cuenta como visita cerrada previa', () => {
      expect(
        evaluarApertura({
          lastClosed: {
            unidadId: UNIDAD,
            visitaId: '',
            tipoVehiculoId: TIPO,
            km: 10000,
            cerradoAt: CERRADO_AT,
          },
          currentKm: 50000,
          nowIso: DAY_90,
          unidadActiva: true,
          tieneNoResuelto: false,
          tKm: 1,
          tDias: 1,
        }).abrir,
      ).toBe(false);
    });

    it('evaluarUnidad no abre si el seed/eval metió lastClosed sin visitaId', async () => {
      const { engine, store } = harness();
      await store.setUmbral({ tipoVehiculoId: TIPO, tKm: 1, tDias: 1 });
      await store.setLastClosed({
        unidadId: UNIDAD,
        visitaId: '   ',
        tipoVehiculoId: TIPO,
        km: 10000,
        cerradoAt: CERRADO_AT,
      });
      const aviso = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 50000,
        now: new Date(DAY_90),
      });
      expect(aviso).toBeNull();
      expect(await store.listNoResueltos()).toEqual([]);
    });
  });

  describe('A2 at most 1 non-resolved per unidadId', () => {
    it('no abre un segundo aviso ABIERTO o ENTERADO para la misma unidad', async () => {
      const { engine, store } = harness();
      await store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      await engine.handleVisitaCerrada(payload());
      const first = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 16000,
        now: new Date(DAY_90),
      });
      expect(first?.estado).toBe(EstadoAviso.ABIERTO);
      const second = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 30000,
        now: new Date('2026-06-01T00:00:00.000Z'),
      });
      expect(second).toBeNull();
      expect(await store.listNoResueltos()).toHaveLength(1);

      await engine.enterado(first!.id, {
        rol: Rol.SUPERVISOR,
        userId: 'sup-1',
      });
      const third = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 40000,
        now: new Date('2026-07-01T00:00:00.000Z'),
      });
      expect(third).toBeNull();
      const open = await store.listNoResueltos();
      expect(open).toHaveLength(1);
      expect(open[0].estado).toBe(EstadoAviso.ENTERADO);
    });
  });

  describe('A3 open when km-since-last ≥ t_km OR days ≥ t_dias', () => {
    it('abre por km desde la última cerrada', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 365 });
      await h.engine.handleVisitaCerrada(payload({ km: 10000 }));
      const aviso = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 15000,
        now: new Date(DAY_10),
      });
      expect(aviso?.estado).toBe(EstadoAviso.ABIERTO);
      expect(aviso?.kmAlAbrir).toBe(5000);
      expect(aviso?.visitaResolutoriaId).toBeNull();
    });

    it('abre por días desde la última cerrada', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 999999, tDias: 90 });
      await h.engine.handleVisitaCerrada(payload({ km: 10000 }));
      const aviso = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 10000,
        now: new Date(DAY_90),
      });
      expect(aviso?.estado).toBe(EstadoAviso.ABIERTO);
      expect(aviso?.diasAlAbrir).toBe(90);
    });

    it('no abre si km y días están bajo el umbral', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      await h.engine.handleVisitaCerrada(payload({ km: 10000 }));
      const aviso = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 12000,
        now: new Date(DAY_10),
      });
      expect(aviso).toBeNull();
    });

    it('evaluarApertura es OR inclusivo en el límite (≥)', () => {
      const last = {
        unidadId: UNIDAD,
        visitaId: VISITA_1,
        tipoVehiculoId: TIPO,
        km: 10000,
        cerradoAt: CERRADO_AT,
      };
      expect(
        evaluarApertura({
          lastClosed: last,
          currentKm: 15000,
          nowIso: DAY_10,
          unidadActiva: true,
          tieneNoResuelto: false,
          tKm: 5000,
          tDias: 90,
        }).abrir,
      ).toBe(true);
      expect(
        evaluarApertura({
          lastClosed: last,
          currentKm: 10000,
          nowIso: DAY_90,
          unidadActiva: true,
          tieneNoResuelto: false,
          tKm: 5000,
          tDias: 90,
        }).abrir,
      ).toBe(true);
    });
  });

  describe('A4 inactive → no new aviso', () => {
    it('unidad inactiva no genera aviso nuevo', async () => {
      const h = harness();
      h.catalog.put({
        unidadId: UNIDAD,
        tipoVehiculoId: TIPO,
        activa: false,
        numeroInterno: 'U-103',
      });
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 1, tDias: 1 });
      await h.engine.handleVisitaCerrada(payload());
      const aviso = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 80000,
        now: new Date(DAY_90),
      });
      expect(aviso).toBeNull();
      expect(await h.store.listNoResueltos()).toEqual([]);
    });
  });

  describe('A5 VisitaCerrada → RESUELTO + opaque visita_resolutoria_id', () => {
    it('cierra el aviso no resuelto con el visitaId opaco del envelope', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      await h.engine.handleVisitaCerrada(payload());
      const abierto = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 16000,
        now: new Date(DAY_90),
      });
      expect(abierto?.estado).toBe(EstadoAviso.ABIERTO);

      const result = await h.engine.handleVisitaCerrada(
        payload({
          eventId: EVENT_2,
          visitaId: VISITA_2,
          km: 16000,
          cerradoAt: '2026-04-02T00:00:00.000Z',
          consumos: [],
        }),
      );
      expect(result.resolved?.estado).toBe(EstadoAviso.RESUELTO);
      expect(result.resolved?.visitaResolutoriaId).toBe(VISITA_2);
      expect(await h.store.listNoResueltos()).toEqual([]);
      const saved = await h.store.getAviso(abierto!.id);
      expect(saved?.estado).toBe(EstadoAviso.RESUELTO);
      expect(saved?.visitaResolutoriaId).toBe(VISITA_2);
    });
  });

  describe('A6 Enterado stops reminds; not resolve', () => {
    it('Enterado deja de mandar recordatorios y no resuelve', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      await h.engine.handleVisitaCerrada(payload());
      const abierto = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 16000,
        now: new Date(DAY_90),
      });
      expect(
        h.whatsapp.sent.filter((m) => m.kind === WhatsAppKind.AVISO),
      ).toHaveLength(1);

      const n1 = await h.engine.enviarRecordatorios();
      expect(n1).toBe(1);
      expect(
        h.whatsapp.sent.filter((m) => m.kind === WhatsAppKind.RECORDATORIO),
      ).toHaveLength(1);

      const enterado = await h.engine.enterado(abierto!.id, {
        rol: Rol.SUPERVISOR,
        userId: 'sup-1',
      });
      expect(enterado.estado).toBe(EstadoAviso.ENTERADO);
      expect(enterado.visitaResolutoriaId).toBeNull();
      expect(enterado.resueltoAt).toBeNull();

      const n2 = await h.engine.enviarRecordatorios();
      expect(n2).toBe(0);
      expect(
        h.whatsapp.sent.filter((m) => m.kind === WhatsAppKind.RECORDATORIO),
      ).toHaveLength(1);
      expect((await h.store.getAviso(abierto!.id))?.estado).toBe(
        EstadoAviso.ENTERADO,
      );
    });
  });

  describe('A7 handler ignores consumos; never writes Visita/stock', () => {
    it('ingesta VisitaCerrada con consumos sin tocar Visita ni stock', async () => {
      const h = harness();
      await h.engine.handleVisitaCerrada(
        payload({
          consumos: [
            { itemId: randomUUID(), qty: 9, origen: OrigenConsumo.DESDE_STOCK },
            {
              itemId: randomUUID(),
              qty: 2,
              origen: OrigenConsumo.COMPRA_EXTERNA,
            },
          ],
        }),
      );
      expect(h.visitaWrites).toEqual([]);
      expect(h.stockWrites).toEqual([]);
      expect(await h.store.listNoResueltos()).toEqual([]);
      const last = await h.store.getLastClosed(UNIDAD);
      expect(last?.visitaId).toBe(VISITA_1);
      expect(last?.km).toBe(10000);
      expect(h.store).not.toHaveProperty('stock');
      expect(h.store).not.toHaveProperty('visitas');
    });
  });

  describe('A8 idempotent resolve on duplicate eventId', () => {
    it('el mismo eventId no vuelve a resolver ni cambia visita_resolutoria_id', async () => {
      const h = harness();
      await h.store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      await h.engine.handleVisitaCerrada(payload());
      const abierto = await h.engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 16000,
        now: new Date(DAY_90),
      });
      const closing = payload({
        eventId: EVENT_2,
        visitaId: VISITA_2,
        km: 16000,
        cerradoAt: '2026-04-02T00:00:00.000Z',
      });
      const first = await h.engine.handleVisitaCerrada(closing);
      expect(first.duplicate).toBe(false);
      expect(first.resolved?.visitaResolutoriaId).toBe(VISITA_2);

      const second = await h.engine.handleVisitaCerrada({
        ...closing,
        visitaId: randomUUID(),
        km: 99999,
      });
      expect(second.duplicate).toBe(true);
      const saved = await h.store.getAviso(abierto!.id);
      expect(saved?.estado).toBe(EstadoAviso.RESUELTO);
      expect(saved?.visitaResolutoriaId).toBe(VISITA_2);
      const last = await h.store.getLastClosed(UNIDAD);
      expect(last?.visitaId).toBe(VISITA_2);
      expect(last?.km).toBe(16000);
    });
  });

  it('A7/ADR-005 el motor Andon no importa Visita, Inventario ni Twilio', () => {
    const src = readFileSync(join(__dirname, 'andon-engine.ts'), 'utf8');
    expect(src).not.toMatch(/visitas\//);
    expect(src).not.toMatch(/inventario\//);
    expect(src).not.toMatch(/twilio/i);
  });
});
