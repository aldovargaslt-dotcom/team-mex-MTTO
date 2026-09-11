import {
  Aviso,
  LastClosedVisit,
  UmbralTipo,
  UnidadVista,
  WhatsAppMessage,
} from './andon-types';
import { EstadoAviso } from './enums';

export interface AndonStore {
  getLastClosed(unidadId: string): Promise<LastClosedVisit | null>;
  setLastClosed(row: LastClosedVisit): Promise<void>;
  getNoResuelto(unidadId: string): Promise<Aviso | null>;
  getAviso(id: string): Promise<Aviso | null>;
  insertAviso(aviso: Aviso): Promise<void>;
  updateAviso(aviso: Aviso): Promise<void>;
  listNoResueltos(): Promise<Aviso[]>;
  listAvisos(estados?: EstadoAviso[]): Promise<Aviso[]>;
  getUmbral(tipoVehiculoId: string): Promise<UmbralTipo | null>;
  setUmbral(umbral: UmbralTipo): Promise<void>;
  listUmbrales(): Promise<UmbralTipo[]>;
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export interface UnidadCatalog {
  get(unidadId: string): Promise<UnidadVista | null>;
  list(): Promise<UnidadVista[]>;
}

/** Outbound Andon (noop por defecto; adapters opcionales detrás del puerto). */
export interface AndonNotifier {
  send(message: WhatsAppMessage): Promise<void>;
}

export type NotifyPort = AndonNotifier;
export type WhatsAppPort = AndonNotifier;

export const ANDON_NOTIFIER = Symbol('AndonNotifier');
