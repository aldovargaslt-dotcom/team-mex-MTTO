import { SEED_ALERT_CODES } from '../alert-catalog/alert-catalog.types';
import {
  AlertTypeActivePort,
  emitIfActive,
} from '../alert-catalog/ports';
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
  alertTypes?: AlertTypeActivePort | null,
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
    await emitIfActive(alertTypes, SEED_ALERT_CODES.STOCK_BAJO, () =>
      port.onStockBajo(event),
    );
  } else {
    await port.onStockReabastecido(event);
  }
  return event;
}
