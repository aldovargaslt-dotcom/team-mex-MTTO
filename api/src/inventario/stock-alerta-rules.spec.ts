import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  estadoAlertaStock,
  esStockBajo,
  eventoCruceUmbral,
  severidadAlertaStock,
} from './stock-alerta-rules';

describe('stock umbral (S1–S3)', () => {
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
  });

  describe('S3 umbral no toca Andon', () => {
    it('las reglas de stock viven en inventario y andon no declara stock/sku', () => {
      const here = readFileSync(__filename, 'utf8');
      expect(here).not.toMatch(/andon\./i);
      expect(here).not.toMatch(/schema:\s*['"]andon['"]/);

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
});
