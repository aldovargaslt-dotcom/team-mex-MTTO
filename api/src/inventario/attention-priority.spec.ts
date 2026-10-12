import {
  esStockBajo,
  eventoCruceUmbral,
  severidadAlertaStock,
} from './stock-alerta-rules';

describe('Stock prioridad configurable — AC-04', () => {
  it('mantiene opt-in e igualdad de mínimo', () => {
    expect(esStockBajo(0, null)).toBe(false);
    expect(esStockBajo(5, 5)).toBe(true);
    expect(esStockBajo(6, 5)).toBe(false);
  });
  it('crítico inicialmente cero y configurable inclusivo', () => {
    expect(severidadAlertaStock(1)).toBe('WARNING');
    expect(severidadAlertaStock(0)).toBe('CRITICAL');
    expect(severidadAlertaStock(2, 2)).toBe('CRITICAL');
    expect(severidadAlertaStock(3, 2)).toBe('WARNING');
  });
  it('reenvía al cambiar sólo el límite crítico y al recuperar', () => {
    expect(
      eventoCruceUmbral({
        prevQty: 2,
        nextQty: 2,
        prevMin: 5,
        nextMin: 5,
        prevCritical: 0,
        nextCritical: 2,
      }),
    ).toBe('StockBajo');
    expect(
      eventoCruceUmbral({ prevQty: 2, nextQty: 2, prevMin: 5, nextMin: 1 }),
    ).toBe('StockReabastecido');
  });
});
