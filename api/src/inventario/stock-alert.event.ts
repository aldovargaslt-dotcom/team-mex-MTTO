export const STOCK_BAJO = 'StockBajo';
export const STOCK_REABASTECIDO = 'StockReabastecido';

export type StockAlertEventType = typeof STOCK_BAJO | typeof STOCK_REABASTECIDO;

/** Envelope Inventario → Notifications (ADR-007). */
export type StockAlertEvent = {
  eventId: string;
  eventType: StockAlertEventType;
  itemId: string;
  sku: string;
  qty: number;
  minQty: number | null;
  occurredAt: string;
};

export function toIso8601(value: Date | string) {
  return typeof value === 'string' ? value : value.toISOString();
}

export function buildStockAlert(input: {
  eventId: string;
  eventType: StockAlertEventType;
  itemId: string;
  sku: string;
  qty: number;
  minQty: number | null;
  occurredAt: Date | string;
}): StockAlertEvent {
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    itemId: input.itemId,
    sku: input.sku,
    qty: input.qty,
    minQty: input.minQty,
    occurredAt: toIso8601(input.occurredAt),
  };
}
