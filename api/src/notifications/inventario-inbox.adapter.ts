import { Injectable } from '@nestjs/common';
import { StockBajoEmit, StockInboxPort } from '../inventario/ports';
import { NotificationsService } from './notifications.service';

@Injectable()
export class InventarioInboxAdapter implements StockInboxPort {
  constructor(private readonly notifications: NotificationsService) {}

  async onStockBajo(input: StockBajoEmit) {
    await this.notifications.ingestStockBajo(input);
  }

  async onStockReabastecido(itemId: string) {
    await this.notifications.ingestStockReabastecido(itemId);
  }
}
