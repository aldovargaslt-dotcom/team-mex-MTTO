export type StockBajoEmit = {
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
};

/**
 * Inbox de Notifications (ADR-006). Inventario no escribe schema `notifications`.
 * IDs opacos; sin FK cruzada.
 */
export interface StockInboxPort {
  onStockBajo(input: StockBajoEmit): Promise<void>;
  onStockReabastecido(itemId: string): Promise<void>;
}

export const STOCK_INBOX_PORT = Symbol('StockInboxPort');
