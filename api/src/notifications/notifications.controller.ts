import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import { NotificationsService } from './notifications.service';

function userIdOf(user: CurrentUser) {
  return user.userId ?? '';
}

function toDto(row: Awaited<ReturnType<NotificationsService['list']>>[number]) {
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
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    deeplinkPath: row.deeplinkPath,
  };
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('badge')
  @ApiOperation({ summary: 'Conteo de no leídas (campanita)' })
  async badge(@CurrentUserParam() user: CurrentUser) {
    return { unread: await this.service.badge(userIdOf(user)) };
  }

  @Get()
  @ApiOperation({
    summary:
      'Inbox. Default No leídas (`filter=unread`). `filter=all` = Todas. No leídas primero.',
  })
  async list(
    @CurrentUserParam() user: CurrentUser,
    @Query() query: ListNotificationsQuery,
  ) {
    const rows = await this.service.list(userIdOf(user), query.filter ?? 'unread');
    return rows.map(toDto);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marcar todas leídas' })
  async readAll(@CurrentUserParam() user: CurrentUser) {
    const marked = await this.service.markAllRead(userIdOf(user));
    return { marked };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación leída' })
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return toDto(await this.service.markRead(id, userIdOf(user)));
  }
}
