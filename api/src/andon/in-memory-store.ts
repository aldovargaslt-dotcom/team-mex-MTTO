/* eslint-disable @typescript-eslint/require-await */
import { Aviso, LastClosedVisit, UmbralTipo } from './andon-types';
import { EstadoAviso } from './enums';
import { AndonStore } from './ports';

export class InMemoryAndonStore implements AndonStore {
  readonly avisos: Aviso[] = [];
  readonly lastClosed = new Map<string, LastClosedVisit>();
  readonly umbrales = new Map<string, UmbralTipo>();
  readonly processed = new Set<string>();

  async getLastClosed(unidadId: string) {
    return this.lastClosed.get(unidadId) ?? null;
  }

  async setLastClosed(row: LastClosedVisit) {
    this.lastClosed.set(row.unidadId, { ...row });
  }

  async getNoResuelto(unidadId: string) {
    return (
      this.avisos.find(
        (a) => a.unidadId === unidadId && a.estado !== EstadoAviso.RESUELTO,
      ) ?? null
    );
  }

  async getAviso(id: string) {
    return this.avisos.find((a) => a.id === id) ?? null;
  }

  async insertAviso(aviso: Aviso) {
    this.avisos.push({ ...aviso });
  }

  async updateAviso(aviso: Aviso) {
    const idx = this.avisos.findIndex((a) => a.id === aviso.id);
    if (idx >= 0) {
      this.avisos[idx] = { ...aviso };
    }
  }

  async listNoResueltos() {
    return this.avisos
      .filter((a) => a.estado !== EstadoAviso.RESUELTO)
      .map((a) => ({ ...a }));
  }

  async getUmbral(tipoVehiculoId: string) {
    return this.umbrales.get(tipoVehiculoId) ?? null;
  }

  async setUmbral(umbral: UmbralTipo) {
    this.umbrales.set(umbral.tipoVehiculoId, { ...umbral });
  }

  async listUmbrales() {
    return [...this.umbrales.values()].map((u) => ({ ...u }));
  }

  async hasProcessed(eventId: string) {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string) {
    this.processed.add(eventId);
  }
}
