import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  Actor,
  TrustedAuthentication,
} from '../../auth/trusted-auth.decorator';
import { TrustedActor } from '../../auth/trusted-actor';
import { CanonicalHttpFilter } from './canonical-http.filter';
import { UnitReadinessService } from './unit-readiness.service';
import { ReadinessSettingsService } from './readiness-settings.service';
import { ReadinessHoldsService } from './readiness-holds.service';
import {
  CreateReadinessHoldDto,
  UnitReadinessQuery,
  UpdateReadinessSettingsDto,
  VerifyReadinessHoldsDto,
} from './unit-readiness.dto';
import { AssignMaintenanceDto } from './unit-readiness.dto';

@Controller('unit-readiness')
@TrustedAuthentication()
@UseFilters(CanonicalHttpFilter)
export class UnitReadinessController {
  constructor(
    private readonly read: UnitReadinessService,
    private readonly settings: ReadinessSettingsService,
    private readonly holds: ReadinessHoldsService,
  ) {}
  @Get() list(
    @Query() query: UnitReadinessQuery,
    @Actor() actor: TrustedActor,
  ) {
    return this.read.snapshot(query, actor);
  }
  @Put('settings') update(
    @Body() dto: UpdateReadinessSettingsDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.settings.update(dto, actor);
  }
  @Get(':id') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.read.snapshot(new UnitReadinessQuery(), actor, id);
  }
  @Get(':id/history') history(
    @Param('id', ParseUUIDPipe) id: string,
    @Actor() actor: TrustedActor,
    @Query() query: UnitReadinessQuery,
  ) {
    return this.read.history(id, actor, query);
  }
  @Get(':id/assignees') assignees(
    @Param('id', ParseUUIDPipe) id: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.holds.assignees(id, actor);
  }
  @Post(':id/orders/:orderId/assign') assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AssignMaintenanceDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.holds.assign(id, orderId, dto, actor);
  }
  @Post(':id/holds') hold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReadinessHoldDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.holds.create(id, dto, actor);
  }
  @Post(':id/verifications') verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyReadinessHoldsDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.holds.verify(id, dto, actor);
  }
}
