import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  Actor,
  TrustedAuthentication,
} from '../../auth/trusted-auth.decorator';
import { TrustedActor } from '../../auth/trusted-actor';
import { CheckSource } from '../work-order';
import { CanonicalOrdersService } from './canonical-orders.service';
import {
  ChecksQuery,
  CreateCheckDto,
  CreateMaintenanceDto,
  OrdersQuery,
} from './canonical-orders.dto';
import { CanonicalHttpFilter } from './canonical-http.filter';

@Controller()
@TrustedAuthentication()
@UseFilters(CanonicalHttpFilter)
export class CanonicalOrdersController {
  constructor(private readonly service: CanonicalOrdersService) {}
  @Post('unidades/:unidadId/checks')
  create(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: CreateCheckDto,
    @Actor() actor: TrustedActor,
  ) {
    if (dto.source === CheckSource.DAILY_AUTOMATIC)
      throw new ForbiddenException(
        'DAILY_AUTOMATIC sólo admite el comando interno SYSTEM.',
      );
    return this.service.createCheck(
      unidadId,
      dto.source ?? CheckSource.LOGISTICS_MANUAL,
      actor,
    );
  }
  @Get('unidades/:unidadId/checks/active')
  active(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.active(unidadId, actor);
  }
  @Get('check-request-units')
  requestableUnits(@Actor() actor: TrustedActor) {
    return this.service.requestableUnits(actor);
  }
  @Get('checks/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.detail(id, actor);
  }
  @Get('checks')
  checks(@Query() query: ChecksQuery, @Actor() actor: TrustedActor) {
    return this.service.list(actor, query, true);
  }
  @Post('unidades/:unidadId/mantenimiento-ordenes')
  maintenance(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: CreateMaintenanceDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.createMaintenance(unidadId, dto, actor);
  }
  @Get('mantenimiento-ordenes')
  list(@Query() query: OrdersQuery, @Actor() actor: TrustedActor) {
    return this.service.list(actor, query, false);
  }
}
