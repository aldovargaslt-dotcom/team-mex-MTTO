import { Injectable } from '@nestjs/common';
import { FlotaService } from '../flota/flota.service';
import { OdometerPort } from './ports';

@Injectable()
export class FlotaOdometerAdapter implements OdometerPort {
  constructor(private readonly flota: FlotaService) {}

  getLatestKm(unidadId: string) {
    return this.flota.getLatestKm(unidadId);
  }
}
