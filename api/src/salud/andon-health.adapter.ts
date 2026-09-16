import { Injectable } from '@nestjs/common';
import { AndonService } from '../andon/andon.service';
import { DEFAULT_T_DIAS, DEFAULT_T_KM } from '../andon/enums';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { UnidadesService } from '../unidades/unidades.service';
import { AndonHealthInput, AndonHealthInputPort } from './ports';

@Injectable()
export class AndonHealthInputAdapter implements AndonHealthInputPort {
  constructor(
    private readonly andon: AndonService,
    private readonly unidades: UnidadesService,
  ) {}

  async get(unidadId: string): Promise<AndonHealthInput> {
    const lastClosed = await this.andon.getLastClosed(unidadId);
    let tipoId = lastClosed?.tipoVehiculoId ?? null;
    try {
      const unidad = await this.unidades.findOne(unidadId);
      tipoId = unidad.tipo.id;
    } catch {
      /* unidad ausente: usar proyección Andon */
    }
    const umbral = tipoId ? await this.andon.getUmbral(tipoId) : null;
    return {
      lastClosed,
      tKm: umbral?.tKm ?? DEFAULT_T_KM,
      tDias: umbral?.tDias ?? DEFAULT_T_DIAS,
      tipoVehiculoId: tipoId,
      hasNoResuelto: await this.andon.hasNoResuelto(unidadId),
    };
  }
}

@Injectable()
export class SaludUnidadCatalog {
  constructor(private readonly unidades: UnidadesService) {}

  async get(unidadId: string) {
    try {
      const unidad = await this.unidades.findOne(unidadId);
      return {
        unidadId: unidad.id,
        tipoVehiculoId: unidad.tipo.id,
        numeroInterno: unidad.numeroInterno,
        activa: unidad.estado === EstadoUnidad.ACTIVA,
      };
    } catch {
      return null;
    }
  }

  async list() {
    const unidades = await this.unidades.findAll({});
    return unidades.map((unidad) => ({
      unidadId: unidad.id,
      tipoVehiculoId: unidad.tipo.id,
      numeroInterno: unidad.numeroInterno,
      activa: unidad.estado === EstadoUnidad.ACTIVA,
    }));
  }
}
