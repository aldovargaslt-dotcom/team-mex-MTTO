import { Controller, Get, Req, Header } from '@nestjs/common';
import { Request } from 'express';
import { TrustedAuthentication } from './trusted-auth.decorator';
import { TrustedActor } from './trusted-actor';

@Controller('auth')
@TrustedAuthentication()
export class IdentityController {
  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  me(@Req() request: Request & { actor: TrustedActor }) {
    return request.actor;
  }
}
