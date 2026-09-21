import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { AndonService } from './andon.service';
import { UpdateUmbralDto } from './dto/andon.dto';
import { EstadoAviso } from './enums';

@ApiTags('andon')
@Controller('andon')
@Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
export class AndonController {
  constructor(private readonly service: AndonService) {}

  @Get('avisos')
  @ApiOperation({
    summary:
      'Listar avisos Andon. Default: no resueltos. `estado` = ABIERTO | ENTERADO | RESUELTO.',
  })
  list(
    @Query('unidadId') unidadId?: string,
    @Query('estado', new ParseEnumPipe(EstadoAviso, { optional: true }))
    estado?: EstadoAviso,
  ) {
    return this.service.listAvisos(unidadId, estado);
  }

  @Post('avisos/:id/enterado')
  @Roles(Rol.SUPERVISOR)
  @ApiOperation({
    summary:
      'Marcar enterado (supervisor). In-app; no resuelve.',
  })
  enterado(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.enterado(id, user);
  }

  @Get('umbrales')
  @ApiOperation({ summary: 'Umbrales t_km / t_dias por tipo de vehículo' })
  listUmbrales() {
    return this.service.listUmbrales();
  }

  @Patch('umbrales/:tipoVehiculoId')
  @Roles(Rol.ADMIN_DIRECTIVO, Rol.SUPERVISOR)
  @ApiOperation({
    summary: 'Actualizar t_km / t_dias (admin o supervisor vía catálogo)',
  })
  updateUmbral(
    @Param('tipoVehiculoId', ParseUUIDPipe) tipoVehiculoId: string,
    @Body() dto: UpdateUmbralDto,
  ) {
    return this.service.updateUmbral(tipoVehiculoId, dto.tKm, dto.tDias);
  }
}
