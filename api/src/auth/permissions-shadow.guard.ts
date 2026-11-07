import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CurrentUser } from './current-user';
import { PermissionMatrixService } from './permission-matrix.service';
import {
  DiscrepancyEntry,
  DiscrepancyLog,
  permissionDecision,
  roleDecision,
} from './permissions-shadow.rules';
import { PERMISO_POR_ENDPOINT, PERMISOS_POR_ROL } from './permissions';
import { ROLES_KEY } from './roles.decorator';
import { Rol } from './roles.enum';
import { TrustedActor } from './trusted-actor';

type ShadowRequest = { user?: CurrentUser | null; actor?: TrustedActor | null };

/**
 * EWO-069 · Guard de permisos en modo sombra. SOLO OBSERVA: compara la decisión por rol
 * (@Roles, la vigente) con la decisión por permisos y registra discrepancias. Siempre devuelve
 * true, no muta la petición y captura todo error. Va entre AuthGuard y RolesGuard para ver
 * también las denegaciones. Apagado por defecto (PERMISSIONS_SHADOW=off).
 */
@Injectable()
export class PermissionsShadowGuard implements CanActivate {
  private readonly logger = new Logger('PermissionsShadow');
  private readonly discrepancies = new DiscrepancyLog(500);
  private readonly covered = new Set<string>();

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly matrix: PermissionMatrixService,
  ) {}

  private get enabled() {
    return this.config.get<string>('PERMISSIONS_SHADOW', 'off') === 'log';
  }
  private get sample() {
    const raw = Number(
      this.config.get<string>('PERMISSIONS_SHADOW_SAMPLE', '1'),
    );
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 1;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) return true;
    try {
      await this.compare(context);
    } catch {
      this.report({
        kind: 'NO_COMPARISON',
        endpoint: 'guard',
        roles: [],
        detail: 'error-interno',
      });
    }
    return true;
  }

  private report(entry: DiscrepancyEntry) {
    const result = this.discrepancies.record(entry);
    if (result.emit)
      this.logger.warn(
        JSON.stringify({ event: 'permissions-shadow', ...result.line }),
      );
  }

  private async compare(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return;
    const request = context
      .switchToHttp()
      .getRequest<ShadowRequest | undefined>();
    const user = request?.user;
    if (!user) return;
    const endpoint = `${context.getClass().name}.${context.getHandler().name}`;
    const permission = PERMISO_POR_ENDPOINT[endpoint];
    if (!permission) {
      this.report({
        kind: 'ENDPOINT_UNMAPPED',
        endpoint,
        roles: [user.rol],
        detail: 'sin-permiso-mapeado',
      });
      return;
    }
    if (this.sample < 1 && Math.random() >= this.sample) return;
    const actorRoles = request?.actor?.roles?.length
      ? [...request.actor.roles]
      : [user.rol];
    let view;
    try {
      view = await this.matrix.read();
    } catch {
      this.report({
        kind: 'NO_COMPARISON',
        endpoint,
        roles: actorRoles,
        detail: 'matriz-no-disponible',
      });
      return;
    }
    const matrix = Object.fromEntries(
      Object.entries(view.roles).map(([rol, v]) => [rol, v.permissions]),
    );
    const byRole = roleDecision(required, user.rol);
    const byPermission = permissionDecision(permission, actorRoles, matrix);
    if (byRole === byPermission) {
      const combo = `${endpoint}|${[...actorRoles].sort().join('+')}`;
      if (this.covered.size < 2000 && !this.covered.has(combo)) {
        this.covered.add(combo);
        this.logger.debug(
          JSON.stringify({
            event: 'permissions-shadow-compared',
            endpoint,
            roles: [...actorRoles].sort(),
            decision: byRole ? 'allow' : 'deny',
          }),
        );
      }
      return;
    }
    const differsFromSeed = Object.values(Rol).some(
      (rol) =>
        JSON.stringify([...(matrix[rol] ?? [])].sort()) !==
        JSON.stringify([...PERMISOS_POR_ROL[rol]].sort()),
    );
    this.report({
      kind: 'DECISION_DIFFERS',
      endpoint,
      roles: actorRoles,
      detail: `role=${byRole ? 'allow' : 'deny'} permission=${byPermission ? 'allow' : 'deny'} matrixDiffersFromSeed=${differsFromSeed}`,
    });
  }
}
