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
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { FotoUnidadDto } from './dto/foto-unidad.dto';
import { FiltrarUnidadesDto } from './dto/filtrar-unidades.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UnidadesService } from './unidades.service';

@ApiTags('unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly service: UnidadesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar unidades (ambos roles)' })
  findAll(@Query() filtros: FiltrarUnidadesDto) {
    return this.service.findAll(filtros);
  }

  @Get(':id/hub')
  @Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
  @ApiOperation({
    summary: 'Hub de unidad: ficha, borradores, historial y mensajes',
  })
  hub(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.hub(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una unidad' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Crear unidad (admin)' })
  create(@Body() dto: CreateUnidadDto) {
    return this.service.create(dto);
  }

  @Patch(':id/foto')
  @Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Foto de la unidad (supervisor o admin)' })
  setFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FotoUnidadDto,
  ) {
    return this.service.setFoto(id, dto.fotoDataUrl);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Actualizar unidad (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnidadDto,
  ) {
    return this.service.update(id, dto);
  }
}
