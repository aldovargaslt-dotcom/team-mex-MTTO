import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUser } from './current-user';
import { ROLES_KEY } from './roles.decorator';
import { Rol } from './roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUser }>();
    const user = request.user;
    if (!user || !required.includes(user.rol)) {
      throw new ForbiddenException(mensajeSinPermiso(user?.rol));
    }
    return true;
  }
}

export function mensajeSinPermiso(rol?: Rol): string {
  if (rol === Rol.ADMIN_DIRECTIVO) {
    return 'El administrador directivo no tiene permiso para realizar esta acción.';
  }
  if (rol === Rol.LOGISTICA) {
    return 'Logística no tiene permiso para realizar esta acción.';
  }
  return 'El supervisor no tiene permiso para realizar esta acción.';
}
