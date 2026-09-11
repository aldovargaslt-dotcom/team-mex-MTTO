import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { CATALOGO_TRABAJOS } from './trabajos-catalogo';
import { UpdateVisitaDto } from './dto/update-visita.dto';
import { VisitasService } from './visitas.service';

@ApiTags('visitas')
@Controller()
export class VisitasController {
  constructor(private readonly service: VisitasService) {}

  @Get('catalogo/trabajos')
  @ApiOperation({ summary: 'Checklist A–E de trabajos de mantenimiento' })
  catalogo() {
    return CATALOGO_TRABAJOS;
  }

  @Post('unidades/:unidadId/visitas')
  @Roles(Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Crear borrador de visita (supervisor)' })
  create(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.createDraft(unidadId, user);
  }

  @Get('unidades/:unidadId/visitas')
  @ApiOperation({ summary: 'Listar visitas de una unidad' })
  list(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.listByUnidad(unidadId, user);
  }

  @Get('visitas/:id')
  @ApiOperation({ summary: 'Detalle de visita' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.findDetalle(id, user);
  }

  @Patch('visitas/:id')
  @Roles(Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar borrador (supervisor)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitaDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.updateDraft(id, dto, user);
  }

  @Delete('visitas/:id')
  @Roles(Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar borrador (supervisor)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeDraft(id);
  }

  @Post('visitas/:id/cerrar')
  @Roles(Rol.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar visita (supervisor)' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.close(id, user);
  }
}
