export type AlertaStock = 'OK' | 'BAJO' | 'AGOTADO';

export type EventoUmbralStock = 'StockBajo' | 'StockReabastecido';

export function estadoAlertaStock(
  qty: number,
  stockMin: number | null | undefined,
): AlertaStock | null {
  if (stockMin == null) {
    return null;
  }
  if (qty > stockMin) {
    return 'OK';
  }
  return qty === 0 ? 'AGOTADO' : 'BAJO';
}

export function esStockBajo(
  qty: number,
  stockMin: number | null | undefined,
): boolean {
  return stockMin != null && qty <= stockMin;
}

export function severidadAlertaStock(qty: number): 'WARNING' | 'CRITICAL' {
  return qty === 0 ? 'CRITICAL' : 'WARNING';
}

/**
 * Cruce de umbral (opt-in). `stockMin` null nunca alerta.
 * Sigue bajo: solo reemite StockBajo si cambia WARNING ↔ CRITICAL.
 */
export function eventoCruceUmbral(input: {
  prevQty: number;
  nextQty: number;
  prevMin: number | null | undefined;
  nextMin: number | null | undefined;
}): EventoUmbralStock | null {
  const prev = esStockBajo(input.prevQty, input.prevMin);
  const next = esStockBajo(input.nextQty, input.nextMin);
  if (!prev && next) {
    return 'StockBajo';
  }
  if (prev && !next) {
    return 'StockReabastecido';
  }
  if (
    prev &&
    next &&
    severidadAlertaStock(input.prevQty) !== severidadAlertaStock(input.nextQty)
  ) {
    return 'StockBajo';
  }
  return null;
}
