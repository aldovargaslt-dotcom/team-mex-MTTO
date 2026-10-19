import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { TrustedActor, validateActor } from '../auth/trusted-actor';
import { Rol } from '../auth/roles.enum';
import { Unidad } from '../unidades/unidad.entity';
import { VehicleFacility } from '../visitas/checks/facility.entity';
function invalid(message: string, code = 'INVALID_ANALYSIS_INPUT'): never {
  throw new BadRequestException({ code, message, details: {} });
}
function uuid(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalid('Referencia inválida.');
}

export type AnalysisUnit = {
  id: string;
  label: string;
  plates: string;
  typeId: string;
  typeName: string;
  facilityId: string;
  mappingVersion: number;
};
export type ScopeFilters = {
  unitIds?: string[];
  facilityIds?: string[];
  unitTypeIds?: string[];
};
@Injectable()
export class MaintenanceAnalysisScope {
  authorize(actor: TrustedActor, admin = false) {
    validateActor(actor, process.env.NODE_ENV);
    if (
      !actor.roles.some(
        (r) => r === Rol.ADMIN_DIRECTIVO || (!admin && r === Rol.SUPERVISOR),
      )
    )
      throw new ForbiddenException({
        code: 'ANALYSIS_FORBIDDEN',
        message: 'No tiene permiso para esta operación.',
        details: {},
      });
  }
  async units(
    m: EntityManager,
    actor: TrustedActor,
    filters: ScopeFilters = {},
  ): Promise<AnalysisUnit[]> {
    this.authorize(actor);
    for (const values of [filters.unitIds, filters.unitTypeIds])
      if (values !== undefined) {
        if (!Array.isArray(values) || values.length > 100)
          invalid('Filtro de unidades inválido.');
        values.forEach(uuid);
      }
    const facilities = filters.facilityIds ?? actor.facilityScopes;
    if (
      !Array.isArray(facilities) ||
      facilities.some((f) => !actor.facilityScopes.includes(f))
    )
      throw new ForbiddenException('Instalación fuera de alcance.');
    if (
      !facilities.length ||
      filters.unitIds?.length === 0 ||
      filters.unitTypeIds?.length === 0
    )
      return [];
    const mappings = await m.find(VehicleFacility, {
      where: {
        facilityId: In(facilities),
        ...(filters.unitIds ? { unidadId: In(filters.unitIds) } : {}),
      },
      take: 100001,
    });
    if (mappings.length > 100000)
      invalid('Reduzca el alcance de unidades.', 'QUERY_TOO_LARGE');
    if (
      filters.unitIds &&
      filters.unitIds.some((id) => !mappings.some((x) => x.unidadId === id))
    )
      throw new NotFoundException('Unidad no disponible en su alcance.');
    if (!mappings.length) return [];
    const units = await m.find(Unidad, {
      where: { id: In(mappings.map((x) => x.unidadId)) },
    });
    return units
      .filter(
        (u) => !filters.unitTypeIds || filters.unitTypeIds.includes(u.tipo.id),
      )
      .map((u) => {
        const mapping = mappings.find((x) => x.unidadId === u.id)!;
        return {
          id: u.id,
          label: u.numeroInterno,
          plates: u.placas,
          typeId: u.tipo.id,
          typeName: u.tipo.nombre,
          facilityId: mapping.facilityId,
          mappingVersion: mapping.version,
        };
      });
  }
  async assertUnits(m: EntityManager, actor: TrustedActor, ids: string[]) {
    const result: AnalysisUnit[] = [],
      unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i += 100)
      result.push(
        ...(await this.units(m, actor, { unitIds: unique.slice(i, i + 100) })),
      );
    return result;
  }
}
