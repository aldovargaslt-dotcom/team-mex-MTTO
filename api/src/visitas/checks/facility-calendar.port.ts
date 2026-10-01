import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
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
}
