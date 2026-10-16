import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Actor, TrustedAuthentication } from '../auth/trusted-auth.decorator';
import { TrustedActor } from '../auth/trusted-actor';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { AjusteDto } from './dto/ajuste.dto';
import { OpeningDto, ReceiptDto, ReturnDto, RevisionDto } from './dto/cost.dto';
import { InventoryCostsService } from './inventory-costs.service';
@Controller('inventario')
@TrustedAuthentication()
@Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
export class InventoryCostsController {
  constructor(private readonly costs: InventoryCostsService) {}
  @Post('costos/ajustes') adjust(
    @Body() body: AjusteDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.adjust(body, actor, key);
  }
  @Post('recepciones') receive(
    @Body() body: ReceiptDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.receive(body, actor, key);
  }
  @Get('items/:id/costos') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.costs.detail(id, actor);
  }
  @Post('items/:id/valoraciones/aperturas') opening(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpeningDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.opening(id, body, actor, key);
  }
  @Post('costos/:id/completar') complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.revise(id, body, actor, key);
  }
  @Post('costos/:id/corregir') correct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.revise(id, body, actor, key, true);
  }
  @Post('costos/:id/retornos') returns(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReturnDto,
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
  ) {
    return this.costs.returnFromOrder(id, body, actor, key);
  }
  @Get('costos/consumos') consumptions(
    @Actor() actor: TrustedActor,
    @Query('unidadId', new ParseUUIDPipe({ optional: true })) unidadId?: string,
    @Query('visitaId', new ParseUUIDPipe({ optional: true })) visitaId?: string,
  ) {
    return this.costs.consumptions(actor, unidadId, visitaId);
  }
}
