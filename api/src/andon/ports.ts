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

/** Seam de outbound Andon. Default: noop/log. Adapters (Twilio/Evolution) se enchufan aquí. */
export interface NotifyPort {
  send(message: WhatsAppMessage): Promise<void>;
}

/**
 * Inbox de Notifications (ADR-006). No reemplaza NotifyPort/WA.
 * IDs opacos; Andon no escribe schema `notifications`.
 */
export interface AvisoInboxPort {
  onAbierto(aviso: Aviso, unidad: UnidadVista | null): Promise<void>;
  onResuelto(aviso: Aviso): Promise<void>;
}

export const AVISO_INBOX_PORT = Symbol('AvisoInboxPort');

/**
 * Lectura de aviso Andon abierto (ADR-008). Flota no abre el módulo Andon.
 */
export const ANDON_ABIERTO_PORT = Symbol('AndonAbiertoPort');

export interface AndonAbiertoPort {
  hasNoResuelto(unidadId: string): Promise<boolean>;
  unidadIdsNoResuelto(): Promise<string[]>;
}

export type AndonNotifier = NotifyPort;
export type WhatsAppPort = NotifyPort;

export const NOTIFY_PORT = Symbol('NotifyPort');
export const ANDON_NOTIFIER = NOTIFY_PORT;
