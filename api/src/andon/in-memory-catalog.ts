/* eslint-disable @typescript-eslint/require-await */
import { UnidadVista } from './andon-types';
import { UnidadCatalog } from './ports';

export class InMemoryUnidadCatalog implements UnidadCatalog {
  readonly unidades = new Map<string, UnidadVista>();

  put(unidad: UnidadVista) {
    this.unidades.set(unidad.unidadId, { ...unidad });
    return this;
  }

  async get(unidadId: string) {
    return this.unidades.get(unidadId) ?? null;
  }

  async list() {
    return [...this.unidades.values()].map((u) => ({ ...u }));
  }
}
