import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { FACILITY_TIMEZONE, operationalDay } from './facility-calendar';
import { VehicleFacility } from './facility.entity';

export abstract class FacilityCalendarPort {
  abstract resolve(
    unidadId: string,
    manager: EntityManager,
    now: Date,
  ): Promise<{
    mapping: VehicleFacility;
    day: ReturnType<typeof operationalDay>;
  }>;
  abstract resolveBatch(
    unidadIds: string[],
    manager: EntityManager,
    now: Date,
  ): Promise<
    Map<
      string,
      { mapping: VehicleFacility; day: ReturnType<typeof operationalDay> }
    >
  >;
}

@Injectable()
export class ConfiguredFacilityCalendar extends FacilityCalendarPort {
  async resolve(unidadId: string, manager: EntityManager, now: Date) {
    const mapping = await manager.findOne(VehicleFacility, {
      where: { unidadId },
      relations: { facility: true },
      ...(manager.queryRunner?.isTransactionActive
        ? {
            lock: {
              mode: 'pessimistic_read' as const,
              tables: ['vehicle_facilities'],
            },
          }
        : {}),
    });
    if (!mapping || mapping.facility.timezone !== FACILITY_TIMEZONE)
      throw new UnprocessableEntityException({
        code: 'FACILITY_CONFIGURATION_REQUIRED',
        message: 'Configure el facility y calendario de la unidad.',
        details: { unidadId },
      });
    return { mapping, day: operationalDay(now) };
  }

  async resolveBatch(unidadIds: string[], manager: EntityManager, now: Date) {
    const mappings = await manager.find(VehicleFacility, {
      where: { unidadId: In(unidadIds) },
      relations: { facility: true },
    });
    const result = new Map<
      string,
      { mapping: VehicleFacility; day: ReturnType<typeof operationalDay> }
    >();
    const day = operationalDay(now);
    for (const mapping of mappings) {
      if (mapping.facility.timezone === FACILITY_TIMEZONE) {
        result.set(mapping.unidadId, { mapping, day });
      }
    }
    return result;
  }
}
