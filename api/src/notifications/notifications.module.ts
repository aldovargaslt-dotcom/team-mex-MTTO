import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AndonInboxAdapter } from './andon-inbox.adapter';
import { InboxItemEntity } from './entities/inbox-item.entity';
import { InboxReadEntity } from './entities/inbox-read.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TypeOrmInboxStore } from './typeorm-inbox-store';

export const NOTIFICATIONS_ENTITIES = [InboxItemEntity, InboxReadEntity];

@Module({
  imports: [TypeOrmModule.forFeature(NOTIFICATIONS_ENTITIES)],
  controllers: [NotificationsController],
  providers: [TypeOrmInboxStore, NotificationsService, AndonInboxAdapter],
  exports: [TypeOrmModule, NotificationsService, AndonInboxAdapter],
})
export class NotificationsModule {}
