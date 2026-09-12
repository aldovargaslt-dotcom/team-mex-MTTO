import { Rol } from '../auth/roles.enum';
import { EstadoSitio, TipoFirmaFlota, TipoMovimientoFlota } from './enums';

export type Sitio = {
  id: string;
  nombre: string;
  estado: EstadoSitio;
};

export type MovimientoFirma = {
  tipo: TipoFirmaFlota;
  dataUrl: string;
};

export type MovimientoFlota = {
  id: string;
  tipo: TipoMovimientoFlota;
  unidadId: string;
  choferId: string;
  sitioId: string;
  occurredAt: string;
  km: number;
  notas: string | null;
  createdBy: string | null;
  avalRol: Rol;
  firmas: MovimientoFirma[];
};

export type UnidadOperativa = {
  unidadId: string;
  sitioId: string | null;
  choferActualId: string | null;
  choferUltimoId: string | null;
  salidaAbiertaId: string | null;
  ultimoMovimientoAt: string | null;
};

export type RegistrarMovimientoInput = {
  tipo: TipoMovimientoFlota;
  unidadId: string;
  choferId: string;
  sitioId: string;
  occurredAt: string;
  km: number;
  notas: string | null;
  firmas: MovimientoFirma[];
  createdBy: string | null;
  avalRol: Rol;
};

export type CatalogoUnidad = {
  id: string;
  activa: boolean;
};

export type CatalogoChofer = {
  id: string;
  activo: boolean;
};
