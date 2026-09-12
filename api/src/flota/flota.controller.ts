import {
  Body,
  Controller,
  Get,
  Param,
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
import {
  CreateMovimientoFlotaDto,
  CreateSitioDto,
  UpdateSitioDto,
} from './dto/flota.dto';
import { FlotaService } from './flota.service';

@ApiTags('flota')
@Controller('flota')
@Roles(Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO)
export class FlotaController {
  constructor(private readonly service: FlotaService) {}

  @Get('tablero')
  @ApiOperation({
    summary: 'Tablero operativo. `fuera=1` = solo salidas abiertas.',
  })
  tablero(@Query('fuera') fuera?: string) {
    const soloFuera = fuera === '1' || fuera === 'true';
    return this.service.tablero(soloFuera);
  }

  @Get('sitios')
  @ApiOperation({ summary: 'Catálogo de sitios' })
  sitios() {
    return this.service.listSitios();
  }

  @Post('sitios')
  @ApiOperation({ summary: 'Alta de sitio' })
  createSitio(@Body() dto: CreateSitioDto) {
    return this.service.createSitio(dto);
  }

  @Patch('sitios/:id')
  @ApiOperation({ summary: 'Actualizar sitio' })
  updateSitio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSitioDto,
  ) {
    return this.service.updateSitio(id, dto);
  }

  @Post('movimientos')
  @ApiOperation({ summary: 'Registrar SALIDA o ENTRADA (dos firmas)' })
  registrar(
    @Body() dto: CreateMovimientoFlotaDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.registrar(dto, user);
  }

  @Get('unidades/:unidadId')
  @ApiOperation({ summary: 'Ficha operativa + historial' })
  detalle(@Param('unidadId', ParseUUIDPipe) unidadId: string) {
    return this.service.detalle(unidadId);
  }

  @Post('unidades/:unidadId/envio-especial')
  @ApiOperation({ summary: 'Inactivar por envío especial (kernel)' })
  envioEspecial(@Param('unidadId', ParseUUIDPipe) unidadId: string) {
    return this.service.marcarEnvioEspecial(unidadId);
  }

  @Post('unidades/:unidadId/reactivar')
  @ApiOperation({ summary: 'Reactivar unidad y limpiar motivo' })
  reactivar(@Param('unidadId', ParseUUIDPipe) unidadId: string) {
    return this.service.reactivar(unidadId);
  }
}
