import { deltaConsumo, mensajeStockInsuficiente, stockTrasMovimiento } from './stock-rules';
import { OrigenConsumo } from '../kernel/events/visita-cerrada';

describe('stock-rules', () => {
  it('nunca deja stock negativo', () => {
    expect(stockTrasMovimiento(5, -3)).toBe(2);
    expect(stockTrasMovimiento(0, 4)).toBe(4);
    expect(() => stockTrasMovimiento(2, -3)).toThrow('NEGATIVO');
  });

  it('SALIDA_OT solo aplica a DESDE_STOCK', () => {
    expect(deltaConsumo(OrigenConsumo.DESDE_STOCK, 2)).toBe(-2);
    expect(deltaConsumo(OrigenConsumo.COMPRA_EXTERNA, 2)).toBeNull();
  });

  it('explica stock insuficiente', () => {
    expect(mensajeStockInsuficiente('FIL-ACEITE-01', 1, 3)).toMatch(
      /compra externa/i,
    );
  });
});
