import { EstadoSitio, TipoMovimientoFlota } from './enums';
import { MovimientoFlota, Sitio, UnidadOperativa } from './flota-types';
import { FlotaStore } from './flota-store';

export class InMemoryFlotaStore implements FlotaStore {
  sitios = new Map<string, Sitio>();
  movimientos = new Map<string, MovimientoFlota>();
  operativas = new Map<string, UnidadOperativa>();

  async getSitio(id: string) {
    return this.sitios.get(id) ?? null;
  }

  async getOperativa(unidadId: string) {
    return this.operativas.get(unidadId) ?? null;
  }

  async listOperativas() {
    return [...this.operativas.values()];
  }

  async getMovimiento(id: string) {
    return this.movimientos.get(id) ?? null;
  }

  async listMovimientos(unidadId: string) {
    return [...this.movimientos.values()]
      .filter((m) => m.unidadId === unidadId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async choferTieneSalidaAbierta(choferId: string, exceptUnidadId?: string) {
    for (const op of this.operativas.values()) {
      if (!op.salidaAbiertaId) continue;
      if (exceptUnidadId && op.unidadId === exceptUnidadId) continue;
      const mov = this.movimientos.get(op.salidaAbiertaId);
      if (mov?.choferId === choferId) return true;
    }
    return false;
  }

  async insertMovimiento(mov: MovimientoFlota) {
    this.movimientos.set(mov.id, mov);
  }

  async upsertOperativa(row: UnidadOperativa) {
    this.operativas.set(row.unidadId, row);
  }

  async getLatestKm(unidadId: string) {
    const rows = await this.listMovimientos(unidadId);
    return rows[0]?.km ?? null;
  }

  putSitio(sitio: Sitio) {
    this.sitios.set(sitio.id, sitio);
  }
}

export function sitioPatio(id = 'sitio-patio'): Sitio {
  return { id, nombre: 'Patio', estado: EstadoSitio.ACTIVO };
}

export function sitioInactivo(id = 'sitio-x'): Sitio {
  return { id, nombre: 'Bodega', estado: EstadoSitio.INACTIVO };
}

export const TIPO_SALIDA = TipoMovimientoFlota.SALIDA;
export const TIPO_ENTRADA = TipoMovimientoFlota.ENTRADA;
