import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from './current-user';
import { Rol, ROLES_VALIDOS } from './roles.enum';

const RUTAS_PUBLICAS = ['/health', '/docs', '/docs-json'];

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUser }>();
    const path = request.path || '';

    if (RUTAS_PUBLICAS.some((ruta) => path === ruta || path.startsWith(`${ruta}/`))) {
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
