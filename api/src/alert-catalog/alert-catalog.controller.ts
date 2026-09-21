import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { AlertCatalogService } from './alert-catalog.service';
import {
  CreateAlertTypeDto,
  PatchAlertTypeDto,
  PatchCatalogUmbralesDto,
} from './dto/alert-catalog.dto';

@ApiTags('configuracion-alertas')
@Controller('configuracion/alertas')
@Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO, Rol.LOGISTICA)
export class AlertCatalogController {
  constructor(private readonly catalog: AlertCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de alerta visibles para el rol.' })
  list(@CurrentUserParam() user: CurrentUser) {
    return this.catalog.list(user.rol);
  }

  @Post()
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Crear tipo de alerta (admin).' })
  create(
    @Body() dto: CreateAlertTypeDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.catalog.create(dto, user.rol);
  }

  @Get(':code/umbrales')
  @ApiOperation({ summary: 'Leer umbrales del tipo (façade / módulo).' })
  getUmbrales(
    @Param('code') code: string,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.catalog.getUmbrales(code, user.rol);
  }

  @Patch(':code/umbrales')
  @ApiOperation({ summary: 'Guardar umbrales si el rol puede esa familia.' })
  patchUmbrales(
    @Param('code') code: string,
    @Body() dto: PatchCatalogUmbralesDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.catalog.patchUmbrales(code, dto, user);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Detalle de un tipo visible.' })
  getOne(@Param('code') code: string, @CurrentUserParam() user: CurrentUser) {
    return this.catalog.getVisible(code, user.rol);
  }

  @Patch(':code')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Activar o desactivar un tipo (admin).' })
  setActive(
    @Param('code') code: string,
    @Body() dto: PatchAlertTypeDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.catalog.setActive(code, dto.active, user.rol);
  }
}
