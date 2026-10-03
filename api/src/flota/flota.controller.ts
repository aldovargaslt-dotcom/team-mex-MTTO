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
  RecordPhysicalStateDto,
} from './dto/flota.dto';
import { FlotaService } from './flota.service';
import { PhysicalStateTransitionService } from './physical-state-transition.service';
import { Actor, TrustedAuthentication } from '../auth/trusted-auth.decorator';
import { TrustedActor } from '../auth/trusted-actor';

@ApiTags('flota')
@Controller('flota')
@Roles(Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO)
export class FlotaController {
  constructor(
    private readonly service: FlotaService,
    private readonly physicalStates: PhysicalStateTransitionService,
  ) {}

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

  @Get('movimientos/hoy')
  @ApiOperation({
    summary: 'Movimientos de patio del día de hoy en Ciudad de México',
  })
  movimientosDeHoy() {
    return this.service.movimientosDeHoy();
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
  @TrustedAuthentication()
  @ApiOperation({ summary: 'Registrar SALIDA o ENTRADA (dos firmas)' })
  registrar(
    @Body() dto: CreateMovimientoFlotaDto,
    @CurrentUserParam() user: CurrentUser,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.registrar(dto, user, actor);
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

  @Post('unidades/:unidadId/estado-fisico')
  @ApiOperation({
    summary: 'Registrar una transición física explícita de Flota/Patio',
  })
  recordPhysicalState(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: RecordPhysicalStateDto,
    @CurrentUserParam() actor: CurrentUser,
  ) {
    return this.physicalStates.record(unidadId, dto, actor);
  }
}
