import { StockAlertEvent } from './stock-alert.event';

/**
 * Seam Inventario → Notifications (ADR-007).
 * Inventario emite el envelope; no escribe `notifications.*` ni `andon.*`.
 */
export interface StockAlertPort {
  onStockBajo(event: StockAlertEvent): Promise<void>;
  onStockReabastecido(event: StockAlertEvent): Promise<void>;
}

export const STOCK_ALERT_PORT = Symbol('StockAlertPort');
