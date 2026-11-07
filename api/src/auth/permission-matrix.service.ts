import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import {
  normalizeMatrixUpdate,
  MatrixUpdateInput,
} from './permission-matrix.rules';
import { PERMISOS, PERMISOS_POR_ROL } from './permissions';
import {
  RolePermission,
  RolePermissionAudit,
  RolePermissionVersion,
} from './role-permission.entity';
import { Rol } from './roles.enum';
import { TrustedActor } from './trusted-actor';
import { UserAccess } from './user-access.entity';

export type RoleView = { version: number | null; permissions: string[] };
export type MatrixView = {
  mode: 'DATABASE' | 'CONFIG';
  editable: boolean;
  /** EWO-068: la matriz es sombra; ningún endpoint la usa aún para decidir acceso. */
  enforced: false;
  catalog: readonly string[];
  roles: Record<string, RoleView>;
};

const known = new Set<string>(PERMISOS);

/**
 * Matriz rol→permisos (SPEC-AUTH-003 F-02). Modo sombra: se guarda, audita y lee en cada
 * solicitud (sin caché), pero no gobierna acceso. Fallo cerrado ante cualquier inconsistencia.
 */
@Injectable()
export class PermissionMatrixService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  private get issuer() {
    return this.config.get<string>('AUTH_OIDC_ISSUER', '').trim();
  }
  private get databaseMode() {
    return (
      this.config.get('AUTH_ACTOR_STORE') === 'DATABASE' &&
      this.config.get('AUTH_MODE') === 'OIDC'
    );
  }
  private unavailable(): never {
    throw new ServiceUnavailableException({
      code: 'PERMISSION_MATRIX_UNAVAILABLE',
      message:
        'La matriz de permisos no está disponible. No se concede ningún permiso adicional.',
      details: {},
    });
  }
  // Lock propio (distinto de 825025 de accesos) para serializar ediciones de la matriz.
  private async lock(manager: EntityManager) {
    await manager.query('SELECT pg_advisory_xact_lock(825026)');
  }
  private async assertAdmin(manager: EntityManager, actor: TrustedActor) {
    const user = await manager.findOneBy(UserAccess, {
      issuer: this.issuer,
      subject: actor.subject,
      active: true,
    });
    if (
      actor.authMode !== 'TRUSTED' ||
      !user?.roles.includes(Rol.ADMIN_DIRECTIVO)
    )
      throw new ForbiddenException(
        'No tienes permiso para administrar permisos.',
      );
  }

  private defaults(): MatrixView {
    const roles: Record<string, RoleView> = {};
    for (const rol of Object.values(Rol))
      roles[rol] = { version: null, permissions: [...PERMISOS_POR_ROL[rol]] };
    return {
      mode: 'CONFIG',
      editable: false,
      enforced: false,
      catalog: PERMISOS,
      roles,
    };
  }

  private async load(manager: EntityManager) {
    try {
      const versions = await manager.find(RolePermissionVersion);
      const grants = await manager.find(RolePermission);
      const roles: Record<string, RoleView> = {};
      for (const rol of Object.values(Rol)) {
        const v = versions.find((x) => x.role === (rol as string));
        if (!v) this.unavailable();
        roles[rol] = {
          version: v.version,
          permissions: grants
            .filter((g) => g.role === (rol as string))
            .map((g) => g.permission)
            .sort(),
        };
      }
      // Permiso almacenado fuera del catálogo ⇒ datos ilegibles ⇒ fallo cerrado (AC-P12).
      if (grants.some((g) => !known.has(g.permission))) this.unavailable();
      return roles;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (error instanceof QueryFailedError) this.unavailable();
      throw error;
    }
  }

  async read(): Promise<MatrixView> {
    if (!this.databaseMode) return this.defaults();
    const roles = await this.load(this.db.manager);
    return {
      mode: 'DATABASE',
      editable: true,
      enforced: false,
      catalog: PERMISOS,
      roles,
    };
  }

  async update(rol: string, input: MatrixUpdateInput, actor: TrustedActor) {
    const next = normalizeMatrixUpdate(rol, input);
    if (!this.databaseMode)
      throw new ConflictException({
        code: 'PERMISSION_MATRIX_READ_ONLY',
        message:
          'La matriz de permisos solo se puede editar con el directorio de accesos habilitado.',
        details: {},
      });
    return this.db.transaction(async (manager) => {
      await this.lock(manager);
      await this.assertAdmin(manager, actor);
      const current = (await this.load(manager))[next.rol];
      if (current.version !== next.expectedVersion)
        throw new ConflictException({
          code: 'PERMISSION_MATRIX_VERSION_CONFLICT',
          message:
            'Otra persona modificó este rol. Revisa la versión vigente e inténtalo de nuevo.',
          details: { currentVersion: current.version },
        });
      const before = current.permissions;
      if (JSON.stringify(before) === JSON.stringify(next.permissions))
        return {
          rol: next.rol,
          version: current.version,
          permissions: before,
          enforced: false as const,
          changed: false,
        };
      const version = next.expectedVersion + 1;
      await manager.delete(RolePermission, { role: next.rol });
      if (next.permissions.length)
        await manager.insert(
          RolePermission,
          next.permissions.map((permission) => ({
            role: next.rol,
            permission,
          })),
        );
      await manager.update(
        RolePermissionVersion,
        { role: next.rol },
        { version, updatedAt: new Date() },
      );
      await manager.save(
        RolePermissionAudit,
        manager.create(RolePermissionAudit, {
          role: next.rol,
          actorSubject: actor.subject,
          action: 'UPDATE',
          reason: next.motivo,
          before,
          after: next.permissions,
          versionAfter: version,
        }),
      );
      return {
        rol: next.rol,
        version,
        permissions: next.permissions,
        enforced: false as const,
        changed: true,
      };
    });
  }
}
