export type CheckInterval = {
  mode: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  hours?: number;
};
export type ReadinessSettings = {
  facilityId: string;
  scope: "FLEET" | "CATEGORY" | "UNIT";
  targetId: string;
  version: number;
  interval: CheckInterval | null;
  usage: "DAILY" | "STOCK" | null;
};
export type ReadinessOrder = {
  id: string;
  version: number;
  type: string;
  status: string;
  createdAt: string;
  openedAt: string | null;
  assignedTo: string | null;
  problem: string | null;
  href: string;
};
export type ReadinessRow = {
  id: string;
  numeroInterno: string;
  placas: string;
  fotoDataUrl?: string | null;
  estado: string;
  facilityId: string;
  tipo: { id: string; nombre: string; icono?: string | null };
  usage: "DAILY" | "STOCK" | null;
  policy: {
    interval: CheckInterval;
    origin: "FLEET" | "CATEGORY" | "UNIT" | "LEGACY";
    fingerprint: string;
  };
  attention: "CRITICAL" | "UNKNOWN" | "ATTENTION" | "CLEAR";
  reasons: string[];
  technicalReady: boolean;
  inUse: boolean;
  operationAsOf: string;
  checkState: "VALID" | "EXPIRED" | "MISSING" | "UNKNOWN";
  lastCheck: {
    checkId: string;
    result: string;
    valid: boolean;
    reason: string | null;
    dayEndInstant: string;
    reviewedAt: string | null;
  } | null;
  activeCheck: { checkId: string; status: string } | null;
  orders: ReadinessOrder[];
  holds: {
    id: string;
    orderId: string;
    reason: string;
    actorName: string;
    createdAt: string;
  }[];
};
export type ReadinessSnapshot = {
  items: ReadinessRow[];
  total: number;
  counts: {
    DAILY: number;
    STOCK: number;
    UNCLASSIFIED: number;
    ALL: number;
    stockCritical: number;
  };
  asOf: string;
  sources: { checks: boolean; maintenance: boolean };
  settings: ReadinessSettings[];
  types: ReadinessRow["tipo"][];
  nextOffset: number | null;
};
export const checkStateLabel = {
  VALID: "Revisión vigente",
  EXPIRED: "Revisión vencida",
  MISSING: "Sin revisión firmada",
  UNKNOWN: "Revisión sin confirmar",
};
export const originLabel = {
  FLEET: "Flota",
  CATEGORY: "Categoría",
  UNIT: "Unidad",
  LEGACY: "Diaria heredada",
};
export function intervalLabel(interval: CheckInterval) {
  return interval.mode === "CUSTOM"
    ? `Cada ${interval.hours} horas`
    : { DAILY: "Diaria", WEEKLY: "Semanal", MONTHLY: "Mensual" }[interval.mode];
}
export function readinessLabel(row: ReadinessRow) {
  if (row.holds.length) return "Retenida por seguridad";
  if (row.lastCheck?.result === "UNFIT") return "No apta";
  if (row.attention === "CRITICAL") return "Operación bloqueada";
  return row.technicalReady
    ? row.lastCheck?.result === "FIT_WITH_OBSERVATION"
      ? "Apta con observaciones"
      : "Apta"
    : "Operabilidad sin confirmar";
}
export function readinessTime(value?: string | null) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha sin confirmar";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
export function orderTypeLabel(type: string) {
  return type === "CHECK"
    ? "Revisión ABC"
    : type === "CORRECTIVE"
      ? "Correctivo"
      : "Preventivo";
}
export function orderStatusLabel(status: string) {
  return (
    (
      {
        PENDING: "Pendiente",
        ASSIGNED: "Asignada",
        IN_PROGRESS: "En progreso",
        COMPLETED: "Cerrada",
        CANCELLED: "Cancelada",
      } as Record<string, string>
    )[status] || status
  );
}
