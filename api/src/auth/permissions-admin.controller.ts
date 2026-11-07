import { Body, Controller, Get, Header, Param, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { PermissionMatrixService } from './permission-matrix.service';
import { UpdateRolePermissionsDto } from './permission-matrix.dto';
import { Roles } from './roles.decorator';
import { Rol } from './roles.enum';
import { TrustedActor } from './trusted-actor';
import { TrustedAuthentication } from './trusted-auth.decorator';

/** EWO-068 · matriz en modo sombra: editarla no cambia aún el acceso real (`enforced:false`). */
@Controller('admin/permissions')
@TrustedAuthentication()
@Roles(Rol.ADMIN_DIRECTIVO)
export class PermissionsAdminController {
  constructor(private readonly matrix: PermissionMatrixService) {}
  @Get() @Header('Cache-Control', 'private, no-store') read() {
    return this.matrix.read();
  }
  @Put('roles/:rol') @Header('Cache-Control', 'private, no-store') update(
    @Param('rol') rol: string,
    @Body() body: UpdateRolePermissionsDto,
    @Req() request: Request & { actor: TrustedActor },
  ) {
    return this.matrix.update(rol, body, request.actor);
  }
}
