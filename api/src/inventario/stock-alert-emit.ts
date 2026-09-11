import { StockAlertPort } from './ports';
import {
  STOCK_BAJO,
  StockAlertEvent,
  buildStockAlert,
} from './stock-alert.event';
import { eventoCruceUmbral } from './stock-alerta-rules';

export async function publicarAlertaStock(
  port: StockAlertPort | null | undefined,
  input: {
    eventId: string;
    occurredAt: Date | string;
    itemId: string;
    sku: string;
    prevQty: number;
    nextQty: number;
    prevMin: number | null | undefined;
    nextMin: number | null;
  },
): Promise<StockAlertEvent | null> {
  const eventType = eventoCruceUmbral({
    prevQty: input.prevQty,
    nextQty: input.nextQty,
    prevMin: input.prevMin,
    nextMin: input.nextMin,
  });
  if (!eventType || !port) {
    return null;
  }
  const event = buildStockAlert({
    eventId: input.eventId,
    eventType,
    itemId: input.itemId,
    sku: input.sku,
    qty: input.nextQty,
    minQty: input.nextMin,
    occurredAt: input.occurredAt,
  });
  if (eventType === STOCK_BAJO) {
    await port.onStockBajo(event);
  } else {
    await port.onStockReabastecido(event);
  }
  return event;
}
