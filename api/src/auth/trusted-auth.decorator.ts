import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { TrustedActor } from './trusted-actor';
export const TRUSTED_AUTH = 'trusted-authentication';
export const TrustedAuthentication = () => SetMetadata(TRUSTED_AUTH, true);
export const Actor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TrustedActor =>
    context.switchToHttp().getRequest<{ actor: TrustedActor }>().actor,
);
