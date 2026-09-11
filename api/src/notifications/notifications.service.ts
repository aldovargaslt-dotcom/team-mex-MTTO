import { Injectable } from '@nestjs/common';
import { InboxFilter } from './enums';
import { InboxEngine } from './inbox-engine';
import { IngestCommand, StockBajoInput } from './inbox-types';
import { stockBajoCommand, stockBajoDedupeKey } from './inbox-rules';
import { TypeOrmInboxStore } from './typeorm-inbox-store';

@Injectable()
export class NotificationsService {
  constructor(private readonly store: TypeOrmInboxStore) {}

  private engine() {
    return new InboxEngine({ store: this.store });
  }

  ingest(cmd: IngestCommand) {
    return this.engine().ingest(cmd);
  }

  expireDedupe(dedupeKey: string) {
    return this.engine().expireDedupe(dedupeKey);
  }

  /** Inventario llama esto al cruzar a qty <= min_qty. */
  ingestStockBajo(input: StockBajoInput) {
    return this.engine().ingest(stockBajoCommand(input));
  }

  /** Inventario llama esto al cruzar a qty > min_qty (expira el matching dedupe). */
  ingestStockReabastecido(itemId: string) {
    return this.engine().expireDedupe(stockBajoDedupeKey(itemId));
  }

  list(userId: string, filter: InboxFilter = 'unread') {
    return this.engine().list(userId, filter);
  }

  badge(userId: string) {
    return this.engine().badge(userId);
  }

  markRead(id: string, userId: string) {
    return this.engine().markRead(id, userId);
  }

  markAllRead(userId: string) {
    return this.engine().markAllRead(userId);
  }
}
