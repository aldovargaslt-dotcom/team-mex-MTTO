import { Injectable } from '@nestjs/common';
import { StockAlertPort } from '../inventario/ports';
import { StockAlertEvent } from '../inventario/stock-alert.event';
import { NotificationsService } from './notifications.service';

@Injectable()
export class InventarioInboxAdapter implements StockAlertPort {
  constructor(private readonly notifications: NotificationsService) {}

  async onStockBajo(event: StockAlertEvent) {
    await this.notifications.ingestStockBajo(event);
  }

  async onStockReabastecido(event: StockAlertEvent) {
    await this.notifications.clear(event.itemId);
  }
}
