import { ForbiddenException, GoneException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TrustedActor, validateActor } from '../../auth/trusted-actor';
import { Rol } from '../../auth/roles.enum';
import { Unidad } from '../../unidades/unidad.entity';
import { ReadinessSettings } from './readiness-settings.entity';
import { resolveReadinessSettings } from './readiness-policy';
import { UpdateReadinessSettingsDto } from './unit-readiness.dto';

@Injectable()
export class ReadinessSettingsService {
  constructor(private readonly db: DataSource) {}
  async lock(manager: EntityManager, facilityId: string) {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`readiness-settings:${facilityId}`],
    );
  }
  async resolve(manager: EntityManager, unit: Unidad, facilityId: string) {
    const rows = await manager.find(ReadinessSettings, {
      where: { facilityId },
    });
    return resolveReadinessSettings(rows, facilityId, unit.id, unit.tipo.id);
  }
  async update(dto: UpdateReadinessSettingsDto, actor: TrustedActor) {
    validateActor(actor, process.env.NODE_ENV);
    if (
      !actor.roles.includes(Rol.ADMIN_DIRECTIVO) ||
      !actor.facilityScopes.includes(dto.facilityId)
    )
      throw new ForbiddenException(
        'Sin permiso para configurar este facility.',
      );
    throw new GoneException(
      'La programación es diaria para todas las unidades. Daily/Stock e intervalos personalizados están desactivados.',
    );
  }
}
