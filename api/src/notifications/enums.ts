export const NOTIFICATIONS_SCHEMA = 'notifications';

export enum SourceModule {
  ANDON = 'ANDON',
  INVENTARIO = 'INVENTARIO',
  SALUD = 'SALUD',
  LOGISTICA = 'LOGISTICA',
}

export enum SourceEvent {
  AVISO_ABIERTO = 'AvisoAbierto',
  AVISO_RESUELTO = 'AvisoResuelto',
  STOCK_BAJO = 'StockBajo',
  STOCK_REABASTECIDO = 'StockReabastecido',
  PENDIENTE_COMPROBANTE = 'PendienteComprobante',
  HEALTH_BELOW_THRESHOLD = 'HealthBelowThreshold',
  HEALTH_RECOVERED = 'HealthRecovered',
  FLOTA_SIN_REGRESO = 'FLOTA_SIN_REGRESO',
}

export enum SubjectType {
  UNIDAD = 'UNIDAD',
  ITEM = 'ITEM',
  NONE = 'NONE',
}

export enum Severity {
  LOW = 'LOW',
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export type InboxFilter = 'unread' | 'all';
