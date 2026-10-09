import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import {
  ActorDirectoryPort,
  FacilityDirectoryPort,
} from './actor-directory.port';
import { configuredOidcActors } from './oidc-authentication';
import {
  AccessFieldsDto,
  CreateAccessDto,
  UpdateAccessDto,
} from './user-access.dto';
import {
  AccessSnapshot,
  UserAccess,
  UserAccessAudit,
} from './user-access.entity';
import { Rol } from './roles.enum';
import { TrustedActor, validateActor } from './trusted-actor';

@Injectable()
export class UserAccessService
  extends ActorDirectoryPort
  implements OnModuleInit
{
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly facilities: FacilityDirectoryPort,
  ) {
    super();
  }
  private get issuer() {
    return this.config.get<string>('AUTH_OIDC_ISSUER', '').trim();
  }
  private enabled() {
    if (
      this.config.get('AUTH_ACTOR_STORE') !== 'DATABASE' ||
      this.config.get('AUTH_MODE') !== 'OIDC'
    )
      throw new ServiceUnavailableException({
        code: 'USER_DIRECTORY_CONFIGURATION_REQUIRED',
        message:
          'La administración de usuarios requiere habilitar el directorio de accesos.',
        details: {},
      });
  }
  // A transaction-level lock serializes bootstrap, role changes and last-admin checks.
  private async lock(manager: EntityManager) {
    await manager.query('SELECT pg_advisory_xact_lock(825025)');
  }
  private snapshot(user: UserAccess): AccessSnapshot {
    return {
      subject: user.subject,
      displayName: user.displayName,
      roles: [...user.roles],
      facilityScopes: [...user.facilityScopes],
      active: user.active,
      version: user.version,
    };
  }
  private async fields(input: AccessFieldsDto) {
    if (input.active !== undefined && typeof input.active !== 'boolean')
      throw new BadRequestException(
        'El acceso activo debe ser verdadero o falso.',
      );
    const displayName = input.displayName?.trim();
    if (
      !displayName ||
      displayName.length > 120 ||
      !Array.isArray(input.roles) ||
      !Array.isArray(input.facilityScopes)
    )
      throw new BadRequestException('Revisa el nombre, roles y patios.');
    const actor = validateActor(
      {
        subject: 'validation',
        displayName,
        roles: input.roles,
        facilityScopes: input.facilityScopes,
        authMode: 'TRUSTED',
        attributionLevel: 'SERVER_VERIFIED',
      },
      'production',
    );
    if (actor.roles.includes('SYSTEM'))
      throw new BadRequestException('El rol indicado no se puede asignar.');
    const known = new Set((await this.facilities.list()).map((f) => f.id));
    if (input.facilityScopes.some((id) => !known.has(id)))
      throw new BadRequestException('Selecciona patios existentes.');
    return {
      displayName,
      roles: [...new Set(input.roles)],
      facilityScopes: [...new Set(input.facilityScopes)],
      active: input.active ?? true,
    };
  }
  private async audit(
    manager: EntityManager,
    user: UserAccess,
    actorSubject: string,
    action: UserAccessAudit['action'],
    before: AccessSnapshot | null,
  ) {
    await manager.save(
      UserAccessAudit,
      manager.create(UserAccessAudit, {
        userId: user.id,
        issuer: this.issuer,
        actorSubject,
        action,
        before,
        after: this.snapshot(user),
      }),
    );
  }
  async onModuleInit() {
    if (this.config.get('AUTH_ACTOR_STORE') !== 'DATABASE') return;
    this.enabled();
    await this.db.transaction(async (manager) => {
      await this.lock(manager);
      // Do not resurrect an inactive account or import a second source on restart.
      if (await manager.count(UserAccess, { where: { issuer: this.issuer } }))
        return;
      const actors = Object.values(configuredOidcActors(this.config));
      if (!actors.some((a) => a.roles.includes(Rol.ADMIN_DIRECTIVO)))
        throw new Error(
          'Empty user directory requires an explicitly configured bootstrap administrator.',
        );
      for (const actor of actors) {
        if (
          actor.subject.length > 255 ||
          actor.subject !== actor.subject.trim()
        )
          throw new Error('Invalid bootstrap subject.');
        const fields = await this.fields({
          displayName: actor.displayName,
          roles: actor.roles as Rol[],
          facilityScopes: actor.facilityScopes,
        });
        const user = await manager.save(
          UserAccess,
          manager.create(UserAccess, {
            issuer: this.issuer,
            subject: actor.subject,
            ...fields,
          }),
        );
        await this.audit(manager, user, 'SYSTEM:bootstrap', 'BOOTSTRAP', null);
      }
    });
  }
  async resolve(issuer: string, subject: string): Promise<TrustedActor | null> {
    this.enabled();
    const user = await this.db
      .getRepository(UserAccess)
      .findOneBy({ issuer, subject, active: true });
    return user
      ? validateActor(
          {
            subject: user.subject,
            displayName: user.displayName,
            roles: user.roles,
            facilityScopes: user.facilityScopes,
            authMode: 'TRUSTED',
            attributionLevel: 'SERVER_VERIFIED',
          },
          'production',
        )
      : null;
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
        'No tienes permiso para administrar usuarios.',
      );
  }
  async list() {
    this.enabled();
    return this.db.getRepository(UserAccess).find({
      where: { issuer: this.issuer },
      order: { displayName: 'ASC', id: 'ASC' },
    });
  }
  async options() {
    this.enabled();
    return {
      roles: Object.values(Rol),
      facilities: await this.facilities.list(),
    };
  }
  async create(input: CreateAccessDto, actor: TrustedActor) {
    this.enabled();
    const subject = input.subject?.trim();
    if (!subject || subject !== input.subject || subject.length > 255)
      throw new BadRequestException(
        'Indica el identificador exacto de la cuenta del proveedor.',
      );
    return this.db.transaction(async (manager) => {
      await this.lock(manager);
      await this.assertAdmin(manager, actor);
      if (
        await manager.exists(UserAccess, {
          where: { issuer: this.issuer, subject },
        })
      )
        throw new ConflictException({
          code: 'USER_ALREADY_EXISTS',
          message: 'Esta cuenta ya tiene un usuario registrado.',
          details: {},
        });
      const fields = await this.fields(input);
      const user = await manager.save(
        UserAccess,
        manager.create(UserAccess, { issuer: this.issuer, subject, ...fields }),
      );
      await this.audit(manager, user, actor.subject, 'CREATE', null);
      return user;
    });
  }
  async update(id: string, input: UpdateAccessDto, actor: TrustedActor) {
    this.enabled();
    if (typeof input.active !== 'boolean')
      throw new BadRequestException('Indica si el acceso está activo.');
    return this.db.transaction(async (manager) => {
      await this.lock(manager);
      await this.assertAdmin(manager, actor);
      const user = await manager.findOneBy(UserAccess, {
        id,
        issuer: this.issuer,
      });
      if (!user) throw new NotFoundException('No se encontró el usuario.');
      if (user.version !== input.version)
        throw new ConflictException({
          code: 'USER_VERSION_CONFLICT',
          message:
            'Otro administrador modificó este usuario. Recarga la lista antes de editar.',
          details: {},
        });
      const fields = await this.fields(input);
      if (
        user.active &&
        user.roles.includes(Rol.ADMIN_DIRECTIVO) &&
        (!fields.active || !fields.roles.includes(Rol.ADMIN_DIRECTIVO))
      ) {
        const admins = await manager.find(UserAccess, {
          where: { issuer: this.issuer, active: true },
        });
        if (
          admins.filter((u) => u.roles.includes(Rol.ADMIN_DIRECTIVO)).length <=
          1
        )
          throw new ConflictException({
            code: 'LAST_ACTIVE_ADMIN',
            message: 'Debe permanecer al menos un administrador activo.',
            details: {},
          });
      }
      const before = this.snapshot(user);
      Object.assign(user, fields, { version: user.version + 1 });
      await manager.save(UserAccess, user);
      await this.audit(manager, user, actor.subject, 'UPDATE', before);
      return user;
    });
  }
  async history(id: string) {
    this.enabled();
    if (
      !(await this.db
        .getRepository(UserAccess)
        .existsBy({ id, issuer: this.issuer }))
    )
      throw new NotFoundException('No se encontró el usuario.');
    return this.db.getRepository(UserAccessAudit).find({
      where: { userId: id, issuer: this.issuer },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 100,
    });
  }
}
