import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unidad } from '../unidades/unidad.entity';

export abstract class UnitReferencePort {
  abstract exists(unidadId: string): Promise<boolean>;
}

@Injectable()
export class KernelUnitReferenceAdapter extends UnitReferencePort {
  constructor(
    @InjectRepository(Unidad) private readonly units: Repository<Unidad>,
  ) {
    super();
  }

  async exists(unidadId: string) {
    return (await this.units.count({ where: { id: unidadId } })) === 1;
  }
}
