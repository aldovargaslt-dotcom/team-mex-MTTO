export type AlertaStock = 'OK' | 'BAJO' | 'AGOTADO';

export type EventoUmbralStock = 'StockBajo' | 'StockReabastecido';

export function estadoAlertaStock(
  qty: number,
  minQty: number | null | undefined,
): AlertaStock | null {
  if (minQty == null) {
    return null;
  }
  if (qty > minQty) {
    return 'OK';
  }
  return qty === 0 ? 'AGOTADO' : 'BAJO';
}

export function esStockBajo(
  qty: number,
  minQty: number | null | undefined,
): boolean {
  return minQty != null && qty <= minQty;
}

export function severidadAlertaStock(
  qty: number,
  criticalQty = 0,
): 'WARNING' | 'CRITICAL' {
  return qty <= criticalQty ? 'CRITICAL' : 'WARNING';
}

/**
 * Cruce de umbral (opt-in). `minQty` null nunca alerta.
 * Sigue bajo: solo reemite StockBajo si cambia WARNING ↔ CRITICAL.
 */
export function eventoCruceUmbral(input: {
  prevQty: number;
  nextQty: number;
  prevMin: number | null | undefined;
  nextMin: number | null | undefined;
  prevCritical?: number;
  nextCritical?: number;
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
    severidadAlertaStock(input.prevQty, input.prevCritical) !==
      severidadAlertaStock(input.nextQty, input.nextCritical)
  ) {
    return 'StockBajo';
  }
  return null;
}
