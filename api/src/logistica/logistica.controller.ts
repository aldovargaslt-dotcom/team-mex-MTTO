import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import {
  CreateAsignacionDto,
  FiltrarLogisticaChoferesDto,
  FiltrarLogisticaUnidadesDto,
} from './dto/logistica.dto';
import { LogisticaService } from './logistica.service';

@ApiTags('logistica')
@Controller('logistica')
@Roles(Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO)
export class LogisticaController {
  constructor(private readonly service: LogisticaService) {}

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

  @Post('regresos/:unidadId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Registrar regreso: opsEstado EN_RUTA → DISPONIBLE' })
  registrarRegreso(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
  ) {
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
