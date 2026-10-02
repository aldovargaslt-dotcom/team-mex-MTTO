import { CheckInboxAdapter } from './check-inbox.adapter';
import { CheckNotificationsController } from './check-notifications.controller';
import { CheckInboxItem, CheckInboxRead } from './entities/check-inbox.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AndonInboxAdapter } from './andon-inbox.adapter';
import { FlotaInboxAdapter } from './flota-inbox.adapter';
import { InventarioInboxAdapter } from './inventario-inbox.adapter';
import { SaludInboxAdapter } from './salud-inbox.adapter';
import { InboxItemEntity } from './entities/inbox-item.entity';
import { InboxReadEntity } from './entities/inbox-read.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TypeOrmInboxStore } from './typeorm-inbox-store';

export const NOTIFICATIONS_ENTITIES = [
  InboxItemEntity,
  InboxReadEntity,
  CheckInboxItem,
  CheckInboxRead,
];

@Module({
  imports: [TypeOrmModule.forFeature(NOTIFICATIONS_ENTITIES)],
  controllers: [NotificationsController, CheckNotificationsController],
  providers: [
    CheckInboxAdapter,
    TypeOrmInboxStore,
    NotificationsService,
    AndonInboxAdapter,
    InventarioInboxAdapter,
    SaludInboxAdapter,
    FlotaInboxAdapter,
  ],
  exports: [
    TypeOrmModule,
    CheckInboxAdapter,
    NotificationsService,
    AndonInboxAdapter,
    InventarioInboxAdapter,
    SaludInboxAdapter,
    FlotaInboxAdapter,
  ],
})
export class NotificationsModule {}
