export type ValueSource = { id: string; qty: string; value: string; unknown: boolean };
export type Balance = { qty: string; knownValue: string; unknownQty: string; sources?: ValueSource[] };
export type MaterialItem = { id: string; sku: string; nombre: string; uom: string; quantityScale: number };
export type Posting = {
  id: string; itemId: string; kind: string; qty: string; stockDelta: string;
  cost: string | null; knownCost: string; unknownQty: string;
  purchaseId?: string; lineId?: string; reverses?: string; reason?: string;
  actor: string; occurredAt: string;
  sources?: ValueSource[]; adjusts?: string; sourceId?: string; settlement?: string; unitCost?: string | null;
};
export type PurchaseLine = {
  id: string; itemId: string; purchased: string; paid: string;
  used: string; received: string; returned: string; lost: string;
  pending: string; pendingValue: string; conversion: string;
};
export type Purchase = {
  id: string; lines: PurchaseLine[]; receiptKey: string | null;
  receiptMime: string | null; createdAt: string;
};
export type MaterialState = {
  purchases: Purchase[]; postings: Posting[];
  audits: { id: string; actor: string; actorRole?: string; reason: string; before: unknown; after: unknown; occurredAt: string }[];
};
export const emptyMaterials = (): MaterialState => ({ purchases: [], postings: [], audits: [] });
export type MaterialCommand =
  | { type: 'USE'; itemId: string; qty: string }
  | { type: 'PURCHASE'; lines: { itemId: string; purchased: string; used: string; paid: string; conversion: string; received: string }[] }
  | { type: 'DESTINATION'; purchaseId: string; lineId: string; qty: string; destination: 'WAREHOUSE' | 'LOSS' | 'SUPPLIER'; source: 'PENDING' | 'USED' | 'WAREHOUSE'; reason?: string; settlement?: 'REFUND_PENDING' | 'REFUNDED' | 'REPLACEMENT_PENDING' | 'REPLACED' }
  | { type: 'CORRECT_USE'; postingId: string; destination: 'WAREHOUSE' | 'LOSS'; replacementQty: string; reason: string }
  | { type: 'COMPLETE_COST'; postingId: string; unitCost: string; reason: string }
  | { type: 'CORRECT_PRICE'; purchaseId: string; lineId: string; paid: string; reason: string }
  | { type: 'SETTLEMENT'; returnId: string; status: string; reason: string }
  | { type: 'REPLACEMENT_RECEIPT'; returnId: string; qty: string; reason: string }
  | { type: 'VALUE_STOCK'; itemId: string; unitCost: string; reason: string };
