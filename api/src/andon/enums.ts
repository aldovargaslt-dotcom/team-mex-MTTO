export const ANDON_SCHEMA = 'andon';

export enum EstadoAviso {
  ABIERTO = 'ABIERTO',
  ENTERADO = 'ENTERADO',
  RESUELTO = 'RESUELTO',
}

export enum WhatsAppKind {
  AVISO = 'AVISO',
  RECORDATORIO = 'RECORDATORIO',
}

/** Umbrales por defecto (km / días) si Admin aún no configuró el tipo. */
export const DEFAULT_T_KM = 10000;
export const DEFAULT_T_DIAS = 90;
