import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from './roles.decorator';
import { Rol } from './roles.enum';
import { TrustedAuthentication } from './trusted-auth.decorator';
import { TrustedActor } from './trusted-actor';
import { UserAccessService } from './user-access.service';
import { CreateAccessDto, UpdateAccessDto } from './user-access.dto';

@Controller('admin/users')
@TrustedAuthentication()
@Roles(Rol.ADMIN_DIRECTIVO)
export class UsersController {
  constructor(private readonly users: UserAccessService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list() {
    return this.users.list();
  }
  @Get('options') @Header('Cache-Control', 'private, no-store') options() {
    return this.users.options();
  }
  @Get(':id/audit') @Header('Cache-Control', 'private, no-store') audit(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.history(id);
  }
  @Post() @Header('Cache-Control', 'private, no-store') create(
    @Body() body: CreateAccessDto,
    @Req() request: Request & { actor: TrustedActor },
  ) {
    return this.users.create(body, request.actor);
  }
  @Patch(':id') @Header('Cache-Control', 'private, no-store') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAccessDto,
    @Req() request: Request & { actor: TrustedActor },
  ) {
    return this.users.update(id, body, request.actor);
  }
}
