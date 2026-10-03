import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { Actor, TrustedAuthentication } from '../auth/trusted-auth.decorator';
import { TrustedActor } from '../auth/trusted-actor';
import {
  CreateAsignacionDto,
  FiltrarLogisticaChoferesDto,
  FiltrarLogisticaUnidadesDto,
  PatchAlertasSinRegresoDto,
  RegistrarSalidaDto,
} from './dto/logistica.dto';
import { LogisticaService } from './logistica.service';
import { ControlTowerService } from './control-tower.service';
import { ControlTowerQueryDto } from './control-tower.dto';

@ApiTags('logistica')
@Controller('logistica')
@Roles(Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO)
export class LogisticaController {
  constructor(
    private readonly service: LogisticaService,
    private readonly tower: ControlTowerService,
  ) {}

  @Get('torre-control')
  @TrustedAuthentication()
  @ApiOperation({
    summary: 'Torre compuesta: físico, habilitación, CHECK y urgencia',
  })
  controlTower(
    @Query() query: ControlTowerQueryDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.tower.snapshot(query, actor);
  }

  @Get('choferes')
  @ApiOperation({
    summary:
      'Choferes ACTIVO con ops DISPONIBLE|EN_RUTA. Query q (nombre) y chip.',
  })
  list(@Query() filtros: FiltrarLogisticaChoferesDto) {
    return this.service.listChoferes(filtros.q, filtros.chip);
  }

  @Get('unidades')
  @ApiOperation({
    summary:
      'Unidades con ops EN_RUTA|DISPONIBLE, ambito FORANEO|LOCAL y destino. Query q (placas/nombre) y chip.',
  })
  listUnidades(@Query() filtros: FiltrarLogisticaUnidadesDto) {
    return this.service.listUnidades(filtros.q, filtros.chip);
  }

  @Get('alertas/sin-regreso')
  @ApiOperation({
    summary: 'Config familia sin regreso (LOCAL 8h / FORANEO 24h).',
  })
  getAlertasSinRegreso() {
    return this.service.getAlertasSinRegreso();
  }

  @Patch('alertas/sin-regreso')
  @ApiOperation({
    summary: 'Actualizar umbrales default y override por unidad.',
  })
  patchAlertasSinRegreso(@Body() dto: PatchAlertasSinRegresoDto) {
    return this.service.patchAlertasSinRegreso(dto);
  }

  @Post('salidas/:unidadId')
  @TrustedAuthentication()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Registrar salida: EN_RUTA + salida_at=now (ADR-010).',
  })
  registrarSalida(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: RegistrarSalidaDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.registrarSalida(unidadId, dto, actor);
  }

  @Post('regresos/:unidadId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Registrar regreso: DISPONIBLE y limpia salida_at.',
  })
  registrarRegreso(@Param('unidadId', ParseUUIDPipe) unidadId: string) {
    return this.service.registrarRegreso(unidadId);
  }

  @Post('asignaciones')
  @HttpCode(204)
  @ApiOperation({ summary: 'Asignar chofer ACTIVO a unidad libre (1:0..1)' })
  assign(@Body() dto: CreateAsignacionDto) {
    return this.service.assign(dto.unidadId, dto.choferId);
  }

  @Delete('asignaciones/:unidadId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Quitar asignación de la unidad' })
  unassign(@Param('unidadId', ParseUUIDPipe) unidadId: string) {
    return this.service.unassign(unidadId);
  }
}
