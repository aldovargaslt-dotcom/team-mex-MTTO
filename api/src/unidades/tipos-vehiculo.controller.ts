import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { CreateTipoVehiculoDto } from './dto/create-tipo-vehiculo.dto';
import { UpdateTipoVehiculoDto } from './dto/update-tipo-vehiculo.dto';
import { TiposVehiculoService } from './tipos-vehiculo.service';

@ApiTags('unidades')
@Controller('unidades/tipos')
export class TiposVehiculoController {
  constructor(private readonly service: TiposVehiculoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de vehículo' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de vehículo' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Crear tipo de vehículo (admin)' })
  create(@Body() dto: CreateTipoVehiculoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Actualizar tipo de vehículo (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoVehiculoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Eliminar tipo de vehículo (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
