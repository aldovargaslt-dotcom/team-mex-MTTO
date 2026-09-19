import { readFileSync } from 'fs';
import { join } from 'path';
import { AndonEngine } from '../andon/andon-engine';
import { Aviso } from '../andon/andon-types';
import { EstadoAviso } from '../andon/enums';
import { FakeWhatsAppAdapter } from '../andon/fake-whatsapp';
import { InMemoryUnidadCatalog } from '../andon/in-memory-catalog';
import { InMemoryAndonStore } from '../andon/in-memory-store';
import {
  OrigenConsumo,
  buildVisitaCerrada,
} from '../kernel/events/visita-cerrada';
import { Severity, SourceEvent, SourceModule, SubjectType } from './enums';
import { InboxEngine } from './inbox-engine';
import {
  avisoAbiertoCommand,
  avisoAbiertoDedupeKey,
  flotaSinRegresoCommand,
  flotaSinRegresoDedupeKey,
  stockBajoCommand,
  stockBajoDedupeKey,
} from './inbox-rules';
import { InMemoryInboxStore } from './in-memory-inbox-store';

const UNIDAD = '11111111-1111-4111-8111-111111111111';
const TIPO = '22222222-2222-4222-8222-222222222222';
const VISITA_1 = '33333333-3333-4333-8333-333333333331';
const EVENT_1 = '44444444-4444-4444-8444-444444444441';
const USER = 'sup-n1';
const CERRADO_AT = '2026-01-01T00:00:00.000Z';
const DAY_90 = '2026-04-01T00:00:00.000Z';

const avisoInput = {
  avisoId: '55555555-5555-4555-8555-555555555555',
  unidadId: UNIDAD,
  numeroInterno: 'U-101',
  kmAlAbrir: 12000,
  diasAlAbrir: 90,
  abiertaAt: DAY_90,
};

function inboxHarness() {
  const store = new InMemoryInboxStore();
  let n = 0;
  const engine = new InboxEngine({
    store,
    now: () => new Date('2026-04-01T12:00:00.000Z'),
    newId: () => `99999999-9999-4999-8999-99999999999${n++}`,
  });
  return { store, engine };
}

describe('Notifications inbox (ADR-004 N1–N4 / ADR-006)', () => {
  describe('N1 upsert by dedupe_key', () => {
    it('el mismo dedupe_key no crea una segunda fila activa', async () => {
      const { engine, store } = inboxHarness();
      const cmd = avisoAbiertoCommand(avisoInput);
      const first = await engine.ingest(cmd);
      const second = await engine.ingest({
        ...cmd,
        sourceRef: 'otro-aviso',
        title: 'Mantenimiento vencido — U-101',
        body: 'U-101 sigue vencida. Revisar la alerta en el hub.',
      });
      expect(second.id).toBe(first.id);
      expect(store.items.size).toBe(1);
      expect(second.sourceRef).toBe('otro-aviso');
      expect(second.expiresAt).toBeNull();
    });
  });

  describe('N2 mark read / badge / unread first', () => {
    it('marca leída por usuario, el badge baja y Todas pone no leídas primero', async () => {
      const { engine } = inboxHarness();
      const abierto = await engine.ingest(avisoAbiertoCommand(avisoInput));
      const stock = await engine.ingest(
        stockBajoCommand({
          itemId: 'item-1',
          sku: 'FIL-ACEITE-01',
          nombre: 'Filtro de aceite',
        }),
      );
      expect(await engine.badge(USER)).toBe(2);

      await engine.markRead(abierto.id, USER);
      expect(await engine.badge(USER)).toBe(1);
      const unread = await engine.list(USER, 'unread');
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe(stock.id);

      const all = await engine.list(USER, 'all');
      expect(all[0].readAt).toBeNull();
      expect(all[1].readAt).not.toBeNull();
      expect(all[1].id).toBe(abierto.id);

      const marked = await engine.markAllRead(USER);
      expect(marked).toBe(1);
      expect(await engine.badge(USER)).toBe(0);
    });
  });

  describe('N3 Andon AvisoAbierto → inbox WARNING / UNIDAD', () => {
    it('el comando de productor es WARNING, ANDON, subject UNIDAD y deeplink al hub', async () => {
      const { engine } = inboxHarness();
      const cmd = avisoAbiertoCommand(avisoInput);
      expect(cmd.severity).toBe(Severity.WARNING);
      expect(cmd.sourceModule).toBe(SourceModule.ANDON);
      expect(cmd.sourceEvent).toBe(SourceEvent.AVISO_ABIERTO);
      expect(cmd.subjectType).toBe(SubjectType.UNIDAD);
      expect(cmd.subjectRef).toBe(UNIDAD);
      expect(cmd.dedupeKey).toBe(avisoAbiertoDedupeKey(UNIDAD));
      expect(cmd.title).toBe('Mantenimiento vencido — U-101');

      const item = await engine.ingest(cmd);
      const [row] = await engine.list(USER, 'unread');
      expect(row.severity).toBe(Severity.WARNING);
      expect(row.deeplinkPath).toBe(`/unidades/${UNIDAD}`);
      expect(item.sourceRef).toBe(avisoInput.avisoId);
    });

    it('el motor Andon notifica inbox al abrir y no usa NotifyPort para el inbox', async () => {
      const store = new InMemoryAndonStore();
      const catalog = new InMemoryUnidadCatalog();
      const whatsapp = new FakeWhatsAppAdapter();
      const opened: Aviso[] = [];
      catalog.put({
        unidadId: UNIDAD,
        tipoVehiculoId: TIPO,
        activa: true,
        numeroInterno: 'U-101',
      });
      await store.setUmbral({ tipoVehiculoId: TIPO, tKm: 5000, tDias: 90 });
      const engine = new AndonEngine({
        store,
        catalog,
        whatsapp,
        inbox: {
          onAbierto: async (next) => {
            opened.push(next);
          },
          onResuelto: async () => undefined,
        },
      });
      await engine.handleVisitaCerrada(
        buildVisitaCerrada({
          eventId: EVENT_1,
          visitaId: VISITA_1,
          unidadId: UNIDAD,
          tipoVehiculoId: TIPO,
          km: 100,
          cerradoAt: CERRADO_AT,
          consumos: [
            { itemId: 'item-stock', qty: 1, origen: OrigenConsumo.DESDE_STOCK },
          ],
        }),
      );
      const avisoAbierto = await engine.evaluarUnidad({
        unidadId: UNIDAD,
        currentKm: 16000,
        now: new Date(DAY_90),
      });
      expect(avisoAbierto?.estado).toBe(EstadoAviso.ABIERTO);
      expect(opened).toHaveLength(1);
      expect(opened[0].id).toBe(avisoAbierto!.id);
      expect(whatsapp.sent).toHaveLength(1);
      expect(whatsapp.sent[0].avisoId).toBe(avisoAbierto!.id);
    });
  });

  describe('N4 AvisoResuelto expira; StockBajo no toca andon', () => {
    it('AvisoResuelto pone expires_at y saca el ítem del inbox', async () => {
      const { engine } = inboxHarness();
      await engine.ingest(avisoAbiertoCommand(avisoInput));
      expect(await engine.badge(USER)).toBe(1);
      const expired = await engine.expireDedupe(avisoAbiertoDedupeKey(UNIDAD));
      expect(expired?.expiresAt).toBeTruthy();
      expect(await engine.list(USER, 'all')).toEqual([]);
      expect(await engine.badge(USER)).toBe(0);
    });

    it('StockBajo stub ingiere INVENTARIO/ITEM y Andon no tiene tablas de stock', () => {
      const cmd = stockBajoCommand({
        itemId: 'item-opa',
        sku: 'PAST-FR-01',
        nombre: 'Pastilla de freno',
        qty: 2,
      });
      expect(cmd.sourceModule).toBe(SourceModule.INVENTARIO);
      expect(cmd.sourceEvent).toBe(SourceEvent.STOCK_BAJO);
      expect(cmd.subjectType).toBe(SubjectType.ITEM);
      expect(cmd.subjectRef).toBe('item-opa');
      expect(cmd.sourceRef).toBe('item-opa');
      expect(cmd.severity).toBe(Severity.WARNING);
      expect(cmd.dedupeKey).toBe(stockBajoDedupeKey('item-opa'));
      expect(cmd.dedupeKey).toBe('INV:stock-bajo:item-opa');

      const full = stockBajoCommand({
        eventId: 'evt-envelope',
        itemId: 'item-opa',
        sku: 'PAST-FR-01',
        qty: 2,
        minQty: 5,
        occurredAt: '2026-09-11T16:00:00.000Z',
      });
      expect(full.sourceRef).toBe('evt-envelope');
      expect(full.subjectRef).toBe('item-opa');
      expect(full.createdAt?.toISOString()).toBe('2026-09-11T16:00:00.000Z');

      const avisoEntity = readFileSync(
        join(__dirname, '../andon/entities/aviso.entity.ts'),
        'utf8',
      );
      expect(avisoEntity).not.toMatch(/stock/i);
      expect(avisoEntity).not.toMatch(/sku/i);
      const andonDir = readFileSync(
        join(__dirname, '../andon/enums.ts'),
        'utf8',
      );
      expect(andonDir).toMatch(/ANDON_SCHEMA = 'andon'/);
      expect(andonDir).not.toMatch(/stock/i);
    });

    it('qty=0 es CRITICAL; StockReabastecido expira el matching dedupe', async () => {
      const { engine } = inboxHarness();
      const cmd = stockBajoCommand({
        itemId: 'item-zero',
        sku: 'FIL-CAB-01',
        nombre: 'Filtro de cabina',
        qty: 0,
      });
      expect(cmd.severity).toBe(Severity.CRITICAL);
      expect(cmd.title).toMatch(/agotado/i);
      await engine.ingest(cmd);
      const [row] = await engine.list(USER, 'unread');
      expect(row.deeplinkPath).toBe('/inventario/stock');
      expect(await engine.badge(USER)).toBe(1);

      const expired = await engine.expireDedupe(
        stockBajoDedupeKey('item-zero'),
      );
      expect(expired?.expiresAt).toBeTruthy();
      expect(await engine.list(USER, 'all')).toEqual([]);
    });
  });

  describe('L10/L11 FLOTA_SIN_REGRESO emit + clear (ADR-010)', () => {
    const abierto = {
      eventId: 'evt-flota-1',
      unidadId: UNIDAD,
      ambito: 'LOCAL' as const,
      salidaAt: '2026-09-19T03:00:00.000Z',
      thresholdHoras: 8,
      elapsedHoras: 9,
      occurredAt: '2026-09-19T12:00:00.000Z',
      numeroInterno: 'FOTON',
      placas: 'VU2625C',
    };

    it('emite LOGISTICA/FLOTA_SIN_REGRESO con dedupe FLOTA:sin-regreso:{unidadId}', async () => {
      const { engine, store } = inboxHarness();
      const cmd = flotaSinRegresoCommand(abierto);
      expect(cmd.sourceModule).toBe(SourceModule.LOGISTICA);
      expect(cmd.sourceEvent).toBe(SourceEvent.FLOTA_SIN_REGRESO);
      expect(cmd.subjectType).toBe(SubjectType.UNIDAD);
      expect(cmd.subjectRef).toBe(UNIDAD);
      expect(cmd.severity).toBe(Severity.WARNING);
      expect(cmd.dedupeKey).toBe(flotaSinRegresoDedupeKey(UNIDAD));
      expect(cmd.dedupeKey).toBe(`FLOTA:sin-regreso:${UNIDAD}`);
      expect(cmd.title).toBe('Sin regreso — FOTON');

      const first = await engine.ingest(cmd);
      const second = await engine.ingest({
        ...cmd,
        sourceRef: 'evt-flota-2',
      });
      expect(second.id).toBe(first.id);
      expect(store.items.size).toBe(1);

      const [row] = await engine.list(USER, 'unread');
      expect(row.deeplinkPath).toBe('/flota?alerta=SIN_REGRESO');
    });

    it('regreso / under-threshold expira el mismo dedupe; no toca andon', async () => {
      const { engine } = inboxHarness();
      await engine.ingest(flotaSinRegresoCommand(abierto));
      expect(await engine.badge(USER)).toBe(1);
      const expired = await engine.expireDedupe(
        flotaSinRegresoDedupeKey(UNIDAD),
      );
      expect(expired?.expiresAt).toBeTruthy();
      expect(await engine.list(USER, 'all')).toEqual([]);

      const avisoEntity = readFileSync(
        join(__dirname, '../andon/entities/aviso.entity.ts'),
        'utf8',
      );
      expect(avisoEntity).not.toMatch(/salida_at/i);
      expect(avisoEntity).not.toMatch(/FLOTA_SIN_REGRESO/);
    });
  });
});
