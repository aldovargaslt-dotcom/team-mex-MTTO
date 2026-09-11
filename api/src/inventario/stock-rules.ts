import { OrigenConsumo } from '../kernel/events/visita-cerrada';

export function stockTrasMovimiento(actual: number, delta: number): number {
  const next = actual + delta;
  if (next < 0) {
    throw new Error('NEGATIVO');
  }
  return next;
}

export function mensajeStockInsuficiente(
  sku: string,
  stock: number,
  qty: number,
): string {
  return `Stock insuficiente para ${sku}: hay ${stock}, se piden ${qty}. Use compra externa o reduzca la cantidad.`;
}

export function deltaConsumo(origen: OrigenConsumo, qty: number): number | null {
  if (origen === OrigenConsumo.DESDE_STOCK) {
    return -qty;
  }
  return null;
}
