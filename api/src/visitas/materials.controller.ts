import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { TicketDto } from '../inventario/dto/ticket.dto';
import { MaterialCommandDto } from './dto/material-command.dto';
import { VisitasService } from './visitas.service';

@Controller('visitas/:id/materiales')
@Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
export class MaterialsController {
  constructor(private readonly visits: VisitasService) {}
  @Get()
  read(@Param('id', ParseUUIDPipe) id: string, @CurrentUserParam() user: CurrentUser) {
    return this.visits.materialsRead(id, user);
  }
  @Post('comandos')
  command(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MaterialCommandDto, @CurrentUserParam() user: CurrentUser) {
    return this.visits.materialsCommand(id, dto, user);
  }
  @Post('compras/:purchaseId/comprobante')
  attach(@Param('id', ParseUUIDPipe) id: string, @Param('purchaseId', ParseUUIDPipe) purchaseId: string, @Body() dto: TicketDto, @CurrentUserParam() user: CurrentUser) {
    return this.visits.materialsReceipt(id, purchaseId, dto.dataUrl, user);
  }
  @Get('compras/:purchaseId/comprobante')
  async receipt(@Param('id', ParseUUIDPipe) id: string, @Param('purchaseId', ParseUUIDPipe) purchaseId: string, @CurrentUserParam() user: CurrentUser, @Res() response: Response) {
    const result = await this.visits.readMaterialsReceipt(id, purchaseId, user);
    response.setHeader('Content-Type', result.mime);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(result.content);
  }
}
