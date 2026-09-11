import { randomUUID } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InboxFilter } from './enums';
import {
  applyExpire,
  applyIngest,
  deeplinkPath,
  isExpired,
  sortInbox,
} from './inbox-rules';
import {
  InboxEngineDeps,
  InboxItem,
  InboxListItem,
  IngestCommand,
} from './inbox-types';

export class InboxEngine {
  constructor(private readonly deps: InboxEngineDeps) {}

  private now() {
    return this.deps.now?.() ?? new Date();
  }

  private id() {
    return this.deps.newId?.() ?? randomUUID();
  }

  async ingest(cmd: IngestCommand): Promise<InboxItem> {
    const existing = await this.deps.store.findByDedupe(cmd.dedupeKey);
    const { item, reactivated } = applyIngest(
      existing,
      cmd,
      this.now(),
      () => this.id(),
    );
    await this.deps.store.save(item);
    if (reactivated) {
      await this.deps.store.clearReads(item.id);
    }
    return item;
  }

  async expireDedupe(dedupeKey: string, at?: Date): Promise<InboxItem | null> {
    const existing = await this.deps.store.findByDedupe(dedupeKey);
    if (!existing || isExpired(existing, at ?? this.now())) {
      return existing;
    }
    const expired = applyExpire(existing, at ?? this.now());
    await this.deps.store.save(expired);
    return expired;
  }

  async markRead(itemId: string, userId: string, at?: Date): Promise<InboxListItem> {
    this.requireUser(userId);
    const item = await this.deps.store.findById(itemId);
    if (!item || isExpired(item, this.now())) {
      throw new NotFoundException('No se encontró la notificación.');
    }
    const existingRead = await this.deps.store.getReadAt(userId, itemId);
    const readAt = existingRead ?? at ?? this.now();
    if (!existingRead) {
      await this.deps.store.saveRead(itemId, userId, readAt);
    }
    return { ...item, readAt, deeplinkPath: deeplinkPath(item) };
  }

  async markAllRead(userId: string, at?: Date): Promise<number> {
    this.requireUser(userId);
    const now = at ?? this.now();
    const unread = (await this.list(userId, 'unread')).filter(
      (row) => row.readAt == null,
    );
    for (const row of unread) {
      await this.deps.store.saveRead(row.id, userId, now);
    }
    return unread.length;
  }

  async list(userId: string, filter: InboxFilter = 'unread'): Promise<InboxListItem[]> {
    this.requireUser(userId);
    const now = this.now();
    const active = (await this.deps.store.listActive(now)).filter(
      (item) => !isExpired(item, now),
    );
    const reads = await this.deps.store.getReads(userId);
    const rows: InboxListItem[] = active.map((item) => ({
      ...item,
      readAt: reads.get(item.id) ?? null,
      deeplinkPath: deeplinkPath(item),
    }));
    const filtered =
      filter === 'all' ? rows : rows.filter((row) => row.readAt == null);
    return sortInbox(filtered);
  }

  async badge(userId: string): Promise<number> {
    this.requireUser(userId);
    return (await this.list(userId, 'unread')).length;
  }

  private requireUser(userId: string) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'Se requiere el encabezado X-User-Id para el inbox.',
      );
    }
  }
}
