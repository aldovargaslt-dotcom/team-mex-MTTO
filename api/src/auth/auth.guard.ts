import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from './current-user';
import { Rol, ROLES_VALIDOS } from './roles.enum';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationPort,
  TrustedActor,
  validateActor,
} from './trusted-actor';
import { TRUSTED_AUTH } from './trusted-auth.decorator';

const RUTAS_PUBLICAS = ['/health', '/docs', '/docs-json'];

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @Inject(AuthenticationPort)
    private readonly authentication: AuthenticationPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUser; actor?: TrustedActor }>();
    const path = request.path || '';

    if (
      RUTAS_PUBLICAS.some(
        (ruta) => path === ruta || path.startsWith(`${ruta}/`),
      )
    ) {
      return true;
    }

    const trusted = this.reflector.getAllAndOverride<boolean>(TRUSTED_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (
      trusted ||
      this.config.get('NODE_ENV') === 'production' ||
      this.config.get('AUTH_MODE') === 'OIDC'
    ) {
      const actor = validateActor(
        await this.authentication.authenticate(request),
        this.config.get('NODE_ENV'),
      );
      request.actor = actor;
      // Legacy controllers retain CurrentUser. The selected UI role is only a
      // preference among roles granted to the verified actor and allowed here.
      const required = this.reflector.getAllAndOverride<Rol[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
      const preferred = request.header('x-role')?.trim() as Rol | undefined;
      const role =
        (preferred &&
        actor.roles.includes(preferred) &&
        (!required || required.includes(preferred))
          ? preferred
          : undefined) ??
        (actor.roles.find(
          (r) => r !== 'SYSTEM' && (!required || required.includes(r)),
        ) as Rol | undefined);
      request.user = {
        rol: role ?? (actor.roles[0] as Rol),
        userId: actor.subject,
      };
      return true;
    }

    const rawRole = request.header('x-role')?.trim();
    if (!rawRole) {
      throw new UnauthorizedException(
        'Se requiere autenticación. Envíe el encabezado X-Role.',
      );
    }

    if (!ROLES_VALIDOS.includes(rawRole as Rol)) {
      throw new UnauthorizedException(
        'El rol indicado no es válido. Use SUPERVISOR, ADMIN_DIRECTIVO o LOGISTICA.',
      );
    }

    const userId = request.header('x-user-id')?.trim() || null;
    request.user = { rol: rawRole as Rol, userId };
    return true;
  }
}
