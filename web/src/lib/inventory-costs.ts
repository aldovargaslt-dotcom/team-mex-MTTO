export type CostInput = {
  state: "PENDING" | "RECORDED";
  inputTotalCents?: string;
  taxMode?: "INCLUDED" | "EXCLUDED";
  taxTreatment?: "TAXED" | "NO_TAX";
  rateBps?: number;
  currency?: "MXN";
};
export type CostMoney = {
  netCents: string;
  taxCents: string;
  totalCents: string;
  rateBps: number;
  taxMode: string;
  taxTreatment: string;
};
export type CostOperation = {
  id: string;
  itemId: string;
  kind: string;
  qty: number;
  visitaId: string | null;
  unidadId: string | null;
  sourceId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  netCents: string | null;
  money: CostMoney | null;
  version: number;
  reason: string | null;
  effectiveAt: string;
  createdAt: string;
  revisions: {
    actor: string;
    at: string;
    reason: string;
    netBefore: string | null;
    netAfter: string | null;
  }[];
};
export type ItemCosts = {
  quantity: number;
  valuation: {
    valueCents: string | null;
    version: number;
    cutAt: string | null;
  };
  operations: CostOperation[];
};
export function money(value: string | null | undefined) {
  if (value == null) return "Sin costo registrado";
  const n = BigInt(value),
    sign = n < BigInt(0) ? "-" : "";
  const abs = n < BigInt(0) ? -n : n;
  return `${sign}$${new Intl.NumberFormat("es-MX").format(abs / BigInt(100))}.${String(abs % BigInt(100)).padStart(2, "0")}`;
}
export function toCents(value: string) {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value)) return null;
  const [a, b = ""] = value.split(".");
  return (BigInt(a) * BigInt(100) + BigInt(b.padEnd(2, "0"))).toString();
}
export function previewCost(cost: CostInput) {
  if (cost.state !== "RECORDED" || !cost.inputTotalCents) return null;
  const a = BigInt(cost.inputTotalCents),
    r = BigInt(cost.taxTreatment === "NO_TAX" ? 0 : (cost.rateBps ?? 1600)),
    b = BigInt(10000);
  const round = (n: bigint, d: bigint) => (BigInt(2) * n + d) / (BigInt(2) * d);
  const net = cost.taxMode === "INCLUDED" ? round(a * b, b + r) : a;
  const tax = cost.taxMode === "INCLUDED" ? a - net : round(net * r, b);
  return {
    netCents: net.toString(),
    taxCents: tax.toString(),
    totalCents: (net + tax).toString(),
  };
}
export const costKind: Record<string, string> = {
  RECEIPT: "Entrada",
  OPENING: "Valoración",
  CONSUMPTION: "Consumo de orden",
  EXTERNAL: "Compra externa",
  ADJUSTMENT: "Ajuste",
  RETURN: "Retorno de orden",
};
