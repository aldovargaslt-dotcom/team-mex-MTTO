import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { UpdateHealthConfigDto } from './dto/salud.dto';
import { SaludService } from './salud.service';

@ApiTags('salud')
@Controller()
export class SaludController {
  constructor(private readonly service: SaludService) {}

  @Get('unidades/:id/health')
  @Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Salud calculada de la unidad (on-demand)' })
  getHealth(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getHealth(id);
  }

  @Get('salud/config')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Configuración activa de salud (admin)' })
  getConfig() {
    return this.service.getConfig();
  }

  @Get('salud/config/versions')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Historial de versiones de configuración' })
  listVersions() {
    return this.service.listVersions();
  }

  @Put('salud/config')
  @Roles(Rol.ADMIN_DIRECTIVO)
  @ApiOperation({ summary: 'Nueva versión de configuración (admin)' })
  updateConfig(
    @Body() dto: UpdateHealthConfigDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.service.updateConfig(dto, user);
  }
}
