import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { StockAlertPort } from './ports';
import { publicarAlertaStock } from './stock-alert-emit';
import {
  STOCK_BAJO,
  STOCK_REABASTECIDO,
  StockAlertEvent,
} from './stock-alert.event';
import {
  estadoAlertaStock,
  esStockBajo,
  eventoCruceUmbral,
  severidadAlertaStock,
} from './stock-alerta-rules';

function fakePort() {
  const bajo: StockAlertEvent[] = [];
  const reabastecido: StockAlertEvent[] = [];
  const port: StockAlertPort = {
    onStockBajo: (event) => {
      bajo.push(event);
      return Promise.resolve();
    },
    onStockReabastecido: (event) => {
      reabastecido.push(event);
      return Promise.resolve();
    },
  };
  return { port, bajo, reabastecido };
}

describe('stock umbral (S1–S4)', () => {
  describe('S1 umbral opt-in y badge', () => {
    it('null min_qty no alerta aunque qty sea 0', () => {
      expect(estadoAlertaStock(0, null)).toBeNull();
      expect(estadoAlertaStock(4, undefined)).toBeNull();
      expect(esStockBajo(0, null)).toBe(false);
    });

    it('qty <= min_qty es bajo; qty = 0 es agotado CRITICAL; qty > 0 WARNING', () => {
      expect(estadoAlertaStock(5, 5)).toBe('BAJO');
      expect(estadoAlertaStock(1, 5)).toBe('BAJO');
      expect(estadoAlertaStock(6, 5)).toBe('OK');
      expect(estadoAlertaStock(0, 5)).toBe('AGOTADO');
      expect(estadoAlertaStock(0, 0)).toBe('AGOTADO');
      expect(estadoAlertaStock(1, 0)).toBe('OK');
      expect(severidadAlertaStock(3)).toBe('WARNING');
      expect(severidadAlertaStock(0)).toBe('CRITICAL');
    });
  });

  describe('S2 cruce emite StockBajo / StockReabastecido', () => {
    it('cruza a qty <= min → StockBajo; entrada por encima → StockReabastecido', () => {
      expect(
        eventoCruceUmbral({
          prevQty: 6,
          nextQty: 5,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBe('StockBajo');
      expect(
        eventoCruceUmbral({
          prevQty: 2,
          nextQty: 8,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBe('StockReabastecido');
    });

    it('fijar min_qty con qty ya baja emite StockBajo; quitar min expira', () => {
      expect(
        eventoCruceUmbral({
          prevQty: 2,
          nextQty: 2,
          prevMin: null,
          nextMin: 5,
        }),
      ).toBe('StockBajo');
      expect(
        eventoCruceUmbral({
          prevQty: 2,
          nextQty: 2,
          prevMin: 5,
          nextMin: null,
        }),
      ).toBe('StockReabastecido');
    });

    it('seguir bajo no reemite salvo WARNING → CRITICAL (qty a 0)', () => {
      expect(
        eventoCruceUmbral({
          prevQty: 3,
          nextQty: 1,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBeNull();
      expect(
        eventoCruceUmbral({
          prevQty: 2,
          nextQty: 0,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBe('StockBajo');
      expect(
        eventoCruceUmbral({
          prevQty: 10,
          nextQty: 8,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBeNull();
    });

    it('StockAlertPort recibe el envelope { eventId, itemId, sku, qty, minQty, occurredAt }', async () => {
      const { port, bajo, reabastecido } = fakePort();
      const occurredAt = new Date('2026-09-11T16:00:00.000Z');
      const emitted = await publicarAlertaStock(port, {
        eventId: 'evt-bajo-1',
        occurredAt,
        itemId: 'item-1',
        sku: 'UMB-01',
        prevQty: 6,
        nextQty: 5,
        prevMin: 5,
        nextMin: 5,
      });
      expect(emitted).toEqual({
        eventId: 'evt-bajo-1',
        eventType: STOCK_BAJO,
        itemId: 'item-1',
        sku: 'UMB-01',
        qty: 5,
        minQty: 5,
        occurredAt: '2026-09-11T16:00:00.000Z',
      });
      expect(bajo).toEqual([emitted]);
      expect(reabastecido).toEqual([]);

      const cleared = await publicarAlertaStock(port, {
        eventId: 'evt-ok-1',
        occurredAt: '2026-09-11T16:05:00.000Z',
        itemId: 'item-1',
        sku: 'UMB-01',
        prevQty: 5,
        nextQty: 8,
        prevMin: 5,
        nextMin: 5,
      });
      expect(cleared).toMatchObject({
        eventId: 'evt-ok-1',
        eventType: STOCK_REABASTECIDO,
        itemId: 'item-1',
        sku: 'UMB-01',
        qty: 8,
        minQty: 5,
        occurredAt: '2026-09-11T16:05:00.000Z',
      });
      expect(reabastecido).toEqual([cleared]);
    });

    it('sin cruce o sin port no emite', async () => {
      const { port, bajo, reabastecido } = fakePort();
      expect(
        await publicarAlertaStock(port, {
          eventId: 'evt-stay',
          occurredAt: new Date(),
          itemId: 'item-1',
          sku: 'UMB-01',
          prevQty: 3,
          nextQty: 2,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBeNull();
      expect(bajo).toEqual([]);
      expect(reabastecido).toEqual([]);
      expect(
        await publicarAlertaStock(undefined, {
          eventId: 'evt-noport',
          occurredAt: new Date(),
          itemId: 'item-1',
          sku: 'UMB-01',
          prevQty: 6,
          nextQty: 1,
          prevMin: 5,
          nextMin: 5,
        }),
      ).toBeNull();
    });
  });

  describe('S3 umbral no toca Andon', () => {
    it('las reglas de stock viven en inventario y andon no declara stock/sku', () => {
      const andonDir = join(__dirname, '../andon');
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const path = join(dir, entry.name);
          return entry.isDirectory() ? walk(path) : [path];
        });
      const sqlish = walk(andonDir).filter((path) => path.endsWith('.ts'));
      for (const path of sqlish) {
        if (path.endsWith('.spec.ts')) continue;
        const src = readFileSync(path, 'utf8');
        expect(src).not.toMatch(/min_qty/i);
        expect(src).not.toMatch(/stock_min/i);
        expect(src).not.toMatch(/StockBajo/);
      }
    });
  });

  describe('S4 Inventario emite por port, no escribe notifications/andon', () => {
    it('dominio Inventario no importa NotificationsService ni entidades inbox/andon', () => {
      const dominio = join(__dirname);
      const skip = new Set([join(__dirname, 'inventario.module.ts')]);
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const path = join(dir, entry.name);
          return entry.isDirectory() ? walk(path) : [path];
        });
      const files = walk(dominio).filter(
        (path) =>
          path.endsWith('.ts') && !path.endsWith('.spec.ts') && !skip.has(path),
      );
      expect(files.some((path) => path.endsWith('inventario.service.ts'))).toBe(
        true,
      );
      for (const path of files) {
        const src = readFileSync(path, 'utf8');
        expect(src).not.toMatch(/NotificationsService/);
        expect(src).not.toMatch(/inbox-item\.entity/);
        expect(src).not.toMatch(/InboxItemEntity/);
        expect(src).not.toMatch(/from ['"]\.\.\/notifications\//);
        expect(src).not.toMatch(/from ['"]\.\.\/andon\//);
        expect(src).not.toMatch(/schema:\s*['"]notifications['"]/);
        expect(src).not.toMatch(/schema:\s*['"]andon['"]/);
        expect(src).not.toMatch(/ingestStockBajo/);
        expect(src).not.toMatch(/ingestStockReabastecido/);
        expect(src).not.toMatch(/InboxReadEntity/);
      }
    });
  });
});
