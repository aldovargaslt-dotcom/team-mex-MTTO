import { EstadoAviso, WhatsAppKind } from './enums';

export type LastClosedVisit = {
  unidadId: string;
  visitaId: string;
  tipoVehiculoId: string;
  km: number;
  cerradoAt: string;
};

export type UmbralTipo = {
  tipoVehiculoId: string;
  tKm: number;
  tDias: number;
};

export type Aviso = {
  id: string;
  unidadId: string;
  tipoVehiculoId: string;
  estado: EstadoAviso;
  abiertaAt: string;
  enteradoAt: string | null;
  enteradoBy: string | null;
  resueltoAt: string | null;
  visitaResolutoriaId: string | null;
  kmAlAbrir: number;
  diasAlAbrir: number;
  umbralKm: number;
  umbralDias: number;
};

export type UnidadVista = {
  unidadId: string;
  tipoVehiculoId: string;
  activa: boolean;
  numeroInterno?: string;
  placas?: string;
  tipoNombre?: string;
};

export type WhatsAppMessage = {
  avisoId: string;
  unidadId: string;
  kind: WhatsAppKind;
};

export type VisitaWriter = { write: (payload: unknown) => void };
export type StockWriter = { write: (payload: unknown) => void };
