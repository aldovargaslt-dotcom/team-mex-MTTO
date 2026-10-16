import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VehicleFacility } from './facility.entity';

export abstract class FacilityResourceReadPort {
  abstract resolve(
    unidadId: string,
    manager: EntityManager,
  ): Promise<VehicleFacility>;
}
@Injectable()
export class ConfiguredFacilityResource extends FacilityResourceReadPort {
  async resolve(
    unidadId: string,
    manager: EntityManager,
  ): Promise<VehicleFacility> {
    const mapping = await manager.findOne(VehicleFacility, {
      where: { unidadId },
      relations: { facility: true },
      lock: { mode: 'pessimistic_read', tables: ['vehicle_facilities'] },
    });
    if (!mapping)
      throw new UnprocessableEntityException({
        code: 'FACILITY_CONFIGURATION_REQUIRED',
        message: 'Configure el facility de la unidad.',
        details: { unidadId },
      });
    return mapping;
  }
}
