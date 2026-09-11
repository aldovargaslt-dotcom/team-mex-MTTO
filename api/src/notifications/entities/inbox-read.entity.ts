import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { NOTIFICATIONS_SCHEMA } from '../enums';
import { InboxItemEntity } from './inbox-item.entity';

@Entity({ name: 'inbox_read', schema: NOTIFICATIONS_SCHEMA })
export class InboxReadEntity {
  @PrimaryColumn({ name: 'inbox_item_id', type: 'uuid' })
  inboxItemId: string;

  /** Id opaco de Kernel (`X-User-Id`). Sin FK fuera de `notifications`. */
  @PrimaryColumn({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'read_at', type: 'timestamptz' })
  readAt: Date;

  @ManyToOne(() => InboxItemEntity, (item) => item.reads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inbox_item_id' })
  item: InboxItemEntity;
}
