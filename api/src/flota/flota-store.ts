import { MovimientoFlota, Sitio, UnidadOperativa } from './flota-types';

export interface FlotaStore {
  getSitio(id: string): Promise<Sitio | null>;
  getOperativa(unidadId: string): Promise<UnidadOperativa | null>;
  listOperativas(): Promise<UnidadOperativa[]>;
  getMovimiento(id: string): Promise<MovimientoFlota | null>;
  listMovimientos(unidadId: string): Promise<MovimientoFlota[]>;
  choferTieneSalidaAbierta(
    choferId: string,
    exceptUnidadId?: string,
  ): Promise<boolean>;
  insertMovimiento(mov: MovimientoFlota): Promise<void>;
  upsertOperativa(row: UnidadOperativa): Promise<void>;
}
