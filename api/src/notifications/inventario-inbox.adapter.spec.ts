import { StockAlertEvent } from '../inventario/stock-alert.event';
import { InventarioInboxAdapter } from './inventario-inbox.adapter';
import { NotificationsService } from './notifications.service';

describe('InventarioInboxAdapter (ADR-007 seam)', () => {
  it('onStockBajo → ingestStockBajo(event); onStockReabastecido → clear(itemId)', async () => {
    const ingested: StockAlertEvent[] = [];
    const cleared: string[] = [];
    const adapter = new InventarioInboxAdapter({
      ingestStockBajo: (event: StockAlertEvent) => {
        ingested.push(event);
        return Promise.resolve();
      },
      clear: (itemId: string) => {
        cleared.push(itemId);
        return Promise.resolve();
      },
    } as unknown as NotificationsService);

    const event: StockAlertEvent = {
      eventId: 'evt-1',
      eventType: 'StockBajo',
      itemId: 'item-9',
      sku: 'UMB-01',
      qty: 2,
      minQty: 5,
      occurredAt: '2026-09-11T16:00:00.000Z',
    };
    await adapter.onStockBajo(event);
    expect(ingested).toEqual([event]);
    expect(cleared).toEqual([]);

    await adapter.onStockReabastecido({
      ...event,
      eventId: 'evt-2',
      eventType: 'StockReabastecido',
      qty: 9,
    });
    expect(cleared).toEqual(['item-9']);
  });
});
