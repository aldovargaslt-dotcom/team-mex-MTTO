import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseFilters,
} from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { Actor, TrustedAuthentication } from '../auth/trusted-auth.decorator';
import { TrustedActor } from '../auth/trusted-actor';
import { CanonicalHttpFilter } from '../visitas/checks/canonical-http.filter';
import { CheckInboxAdapter } from './check-inbox.adapter';
class QueryDto {
  @IsOptional() @IsIn(['all', 'unread']) filter?: string;
}
@Controller('notifications/checks')
@TrustedAuthentication()
@UseFilters(CanonicalHttpFilter)
export class CheckNotificationsController {
  constructor(private readonly inbox: CheckInboxAdapter) {}
  @Get() list(@Actor() actor: TrustedActor, @Query() query: QueryDto) {
    return this.inbox.list(actor, query.filter === 'all');
  }
  @Post('read-all') readAll(@Actor() actor: TrustedActor) {
    return this.inbox.markAllRead(actor);
  }
  @Post(':id/read') read(
    @Param('id', ParseUUIDPipe) id: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.inbox.markRead(id, actor);
  }
}
