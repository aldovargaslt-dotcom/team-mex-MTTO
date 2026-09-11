import { Injectable } from '@nestjs/common';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { UnidadesService } from '../unidades/unidades.service';
import { UnidadVista } from './andon-types';
import { UnidadCatalog } from './ports';

@Injectable()
export class NestUnidadCatalog implements UnidadCatalog {
  constructor(private readonly unidades: UnidadesService) {}

  async get(unidadId: string): Promise<UnidadVista | null> {
    try {
      const unidad = await this.unidades.findOne(unidadId);
      return this.toVista(unidad);
    } catch {
      return null;
    }
  }

  async list(): Promise<UnidadVista[]> {
    const unidades = await this.unidades.findAll({});
    return unidades.map((u) => this.toVista(u));
  }

  private toVista(unidad: {
    id: string;
    estado: EstadoUnidad;
    tipo: { id: string; nombre: string };
    numeroInterno: string;
    placas: string;
  }): UnidadVista {
    return {
      unidadId: unidad.id,
      tipoVehiculoId: unidad.tipo.id,
      activa: unidad.estado === EstadoUnidad.ACTIVA,
      numeroInterno: unidad.numeroInterno,
      placas: unidad.placas,
      tipoNombre: unidad.tipo.nombre,
    };
  }
}
