import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { ChoferesService } from './choferes.service';
import { CreateChoferDto } from './dto/create-chofer.dto';
import { FiltrarChoferesDto } from './dto/filtrar-choferes.dto';
import { UpdateChoferDto } from './dto/update-chofer.dto';

@ApiTags('choferes')
@Controller('choferes')
export class ChoferesController {
  constructor(private readonly service: ChoferesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar choferes (ambos roles). Query estado=ACTIVO|INACTIVO.',
  })
  findAll(@Query() filtros: FiltrarChoferesDto) {
    return this.service.findAll(filtros.estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un chofer' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Crear chofer (admin). Default estado ACTIVO.' })
  create(@Body() dto: CreateChoferDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Actualizar chofer o estado (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChoferDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({
    summary: 'v0 no hay baja física: use PATCH estado INACTIVO',
  })
  remove() {
    throw new BadRequestException(
      'No se elimina el chofer. Páselo a INACTIVO desde el catálogo.',
    );
  }
}
