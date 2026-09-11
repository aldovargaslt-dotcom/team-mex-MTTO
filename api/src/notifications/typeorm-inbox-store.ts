import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { InboxItemEntity } from './entities/inbox-item.entity';
import { InboxReadEntity } from './entities/inbox-read.entity';
import { InboxItem, InboxStore } from './inbox-types';

@Injectable()
export class TypeOrmInboxStore implements InboxStore {
  constructor(
    @InjectRepository(InboxItemEntity)
    private readonly items: Repository<InboxItemEntity>,
    @InjectRepository(InboxReadEntity)
    private readonly reads: Repository<InboxReadEntity>,
  ) {}

  async findByDedupe(key: string) {
    const row = await this.items.findOne({ where: { dedupeKey: key } });
    return row ? this.toItem(row) : null;
  }

  async findById(id: string) {
    const row = await this.items.findOne({ where: { id } });
    return row ? this.toItem(row) : null;
  }

  async save(item: InboxItem) {
    await this.items.save(
      this.items.create({
        id: item.id,
        sourceModule: item.sourceModule,
        sourceEvent: item.sourceEvent,
        sourceRef: item.sourceRef,
        subjectType: item.subjectType,
        subjectRef: item.subjectRef,
        severity: item.severity,
        title: item.title,
        body: item.body,
        dedupeKey: item.dedupeKey,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
      }),
    );
  }

  async listActive(now: Date) {
    const rows = await this.items.find({
      where: [{ expiresAt: IsNull() }, { expiresAt: MoreThan(now) }],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toItem(row));
  }

  async getReadAt(userId: string, itemId: string) {
    const row = await this.reads.findOne({
      where: { userId, inboxItemId: itemId },
    });
    return row?.readAt ?? null;
  }

  async getReads(userId: string) {
    const rows = await this.reads.find({ where: { userId } });
    return new Map(rows.map((row) => [row.inboxItemId, row.readAt]));
  }

  async saveRead(itemId: string, userId: string, readAt: Date) {
    await this.reads.save(
      this.reads.create({
        inboxItemId: itemId,
        userId,
        readAt,
      }),
    );
  }

  async clearReads(itemId: string) {
    await this.reads.delete({ inboxItemId: itemId });
  }

  private toItem(row: InboxItemEntity): InboxItem {
    return {
      id: row.id,
      sourceModule: row.sourceModule,
      sourceEvent: row.sourceEvent,
      sourceRef: row.sourceRef,
      subjectType: row.subjectType,
      subjectRef: row.subjectRef,
      severity: row.severity,
      title: row.title,
      body: row.body,
      dedupeKey: row.dedupeKey,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }
}
