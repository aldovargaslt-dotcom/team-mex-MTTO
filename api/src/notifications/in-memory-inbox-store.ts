import { InboxItem } from './inbox-types';
import { InboxStore } from './inbox-types';
import { isExpired } from './inbox-rules';

export class InMemoryInboxStore implements InboxStore {
  readonly items = new Map<string, InboxItem>();
  /** itemId -> userId -> readAt */
  readonly reads = new Map<string, Map<string, Date>>();

  async findByDedupe(key: string) {
    return [...this.items.values()].find((item) => item.dedupeKey === key) ?? null;
  }

  async findById(id: string) {
    return this.items.get(id) ?? null;
  }

  async save(item: InboxItem) {
    this.items.set(item.id, { ...item });
  }

  async listActive(now: Date) {
    return [...this.items.values()].filter((item) => !isExpired(item, now));
  }

  async getReadAt(userId: string, itemId: string) {
    return this.reads.get(itemId)?.get(userId) ?? null;
  }

  async getReads(userId: string) {
    const map = new Map<string, Date>();
    for (const [itemId, byUser] of this.reads) {
      const at = byUser.get(userId);
      if (at) {
        map.set(itemId, at);
      }
    }
    return map;
  }

  async saveRead(itemId: string, userId: string, readAt: Date) {
    const byUser = this.reads.get(itemId) ?? new Map<string, Date>();
    byUser.set(userId, readAt);
    this.reads.set(itemId, byUser);
  }

  async clearReads(itemId: string) {
    this.reads.delete(itemId);
  }
}
