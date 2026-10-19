import { api, HttpError } from "./api";
import type { Role } from "./types";
export const ANALYSIS_NAV = [
  { href: "/analisis-mantenimiento/resumen", label: "Resumen", key: "resumen" },
  {
    href: "/analisis-mantenimiento/utilizacion",
    label: "Utilización",
    key: "utilizacion",
  },
  { href: "/analisis-mantenimiento/costos", label: "Costos", key: "costos" },
  {
    href: "/analisis-mantenimiento/tendencias",
    label: "Tendencias por sistema",
    key: "tendencias",
  },
] as const;
export type AnalysisView = (typeof ANALYSIS_NAV)[number]["key"];
export type AnalysisUnit = {
  id: string;
  label: string;
  plates: string;
  typeId: string;
  typeName: string;
  facilityId: string;
  mappingVersion: number;
};
export type CostSummary = {
  netCents: string | null;
  taxCents: string | null;
  totalCents: string | null;
  pending: number;
  fiscalUnknown: number;
};
export type UnitMetric = AnalysisUnit &
  CostSummary & {
    partial: boolean;
    correctiveCount: number;
    registeredTripSeconds: number | null;
    expectedSeconds: number | null;
    unclassifiedSeconds: number;
    utilization: number | null;
    distanceKm: number | null;
    knownCostPerKmCents: string | null;
    costPerKmPartial: boolean;
    attention: string;
    remainingKm: number | null;
    remainingDays: number | null;
  };
export type CostRecord = {
  id: string;
  sourceId: string;
  sourceVersion: number;
  unitId: string;
  unitLabel: string;
  orderId: string | null;
  serviceId: string | null;
  date: string;
  concept: "PARTS" | "EXTERNAL_SERVICE";
  maintenanceType: string;
  system: string | null;
  label: string;
  netCents: string | null;
  taxCents: string | null;
  sign: number;
  state: string;
  includedByService: boolean;
};
export type Monthly = {
  month: string;
  label: string;
  partial: boolean;
  partsCents: string;
  servicesCents: string;
  preventiveCents: string;
  correctiveCents: string;
  unclassifiedCents: string;
  pending: number;
};
export type Frequency = CostSummary & {
  system: string;
  label: string;
  count: number;
};
export type Intervention = {
  id: string;
  sourceId: string;
  unitId: string;
  unitLabel: string;
  date: string;
  system: string | null;
  workKind: string;
  maintenanceType: string;
  label: string;
  km: number | null;
  orderId: string | null;
  serviceId: string | null;
};
export type AnalysisOptions = {
  units: AnalysisUnit[];
  facilities: string[];
  catalogue: {
    code: string;
    system: string;
    label: string;
    kind: string;
    active: boolean;
    version: number;
  }[];
  capabilities: {
    configureSchedules: boolean;
    correctCosts: boolean;
    externalServices: boolean;
    schedules: boolean;
    downtimeHistory: boolean;
  };
};
export type AnalysisQuery = {
  from: string;
  to: string;
  unitIds?: string[];
  unitTypeIds?: string[];
  systems?: string[];
  maintenanceTypes?: string[];
  workKinds?: string[];
  sort?: string;
  direction?: string;
  breakdown?: string;
};
export type AnalysisData = {
  snapshotId: string;
  expiresAt: string;
  capturedAt: string;
  period: {
    from: string;
    to: string;
    requestedFrom: string;
    requestedTo: string;
    timezone: string;
  };
  query: AnalysisQuery;
  refreshPending?: boolean;
  status: string;
  currency: string;
  coverage: {
    pendingPartsCount: number;
    pendingServicesCount: number;
    reconciliationCount: number;
    fiscalUnknownCount: number;
    errors: string[];
    missingSources: string[];
    unclassifiedCount: number;
    undistributedCount: number;
  };
  summary: CostSummary & {
    pendingPartsCount: number;
    pendingServicesCount: number;
    reconciliationCount: number;
    openOrders: number | null;
    registeredTripSeconds: number | null;
    utilization: number | null;
    completedInterventions: number;
    knownCostPerKmCents: string | null;
    excludedUnitCount: number;
  };
  units: UnitMetric[];
  unitsTotal: number;
  monthly?: Monthly[];
  frequencies?: Frequency[];
  breakdown?: {
    type: (CostSummary & { key: string })[];
    concept: (CostSummary & { key: string })[];
  };
  interventions?: Intervention[];
  pairs?: {
    unitId: string;
    system: string;
    workKind: string;
    previous: string;
    current: string;
    distanceKm: number;
  }[];
  periods: {
    monthly: { from: string; to: string };
    planning: { asOf: string };
  };
};
export type Schedule = {
  id: string;
  scopeId: string;
  facilityId: string;
  scope: string;
  scopeRef: string;
  version: number;
  validFrom: string;
  validTo: string | null;
  reason: string;
  data: {
    weeklyDays: Record<
      string,
      { start: string; end: string; endDayOffset: number }[]
    >;
    dateOverrides: Record<
      string,
      { start: string; end: string; endDayOffset: number }[]
    >;
  };
};
export const SYSTEM_LABELS: Record<string, string> = {
  A: "Motor y auxiliares",
  B: "Frenos",
  C: "Suspensión y dirección",
  D: "Llantas",
  E: "Carrocería y luces",
  UNKNOWN: "Sin desglose",
};
export const WORK_LABELS: Record<string, string> = {
  REVIEW_ADJUSTMENT: "Revisión / ajuste",
  REPAIR: "Reparación",
  REPLACEMENT: "Cambio",
  UNSPECIFIED: "Sin clasificar",
};
export function cents(value: string | null | undefined) {
  if (value == null) return "No disponible";
  const n = BigInt(value),
    absolute = n < BigInt(0) ? -n : n;
  return `${n < BigInt(0) ? "−" : ""}$${new Intl.NumberFormat("es-MX").format(absolute / BigInt(100))}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}
export const hours = (seconds: number | null) =>
  seconds == null
    ? "No disponible"
    : `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(seconds / 3600)} h`;
export function localDay(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Mexico_City",
  }).format(date);
}
export function addDay(day: string, n: number) {
  const d = new Date(`${day}T12:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function initialQuery(): AnalysisQuery {
  const today = localDay(),
    weekday = new Date(`${today}T12:00Z`).getUTCDay() || 7,
    from = addDay(today, 1 - weekday);
  return { from, to: addDay(from, 7), sort: "COST", direction: "DESC" };
}
export function queryFromParams(params: URLSearchParams): AnalysisQuery {
  const q = initialQuery();
  return {
    ...q,
    from: params.get("from") ?? q.from,
    to: params.get("to") ?? q.to,
    ...(params.get("unit") ? { unitIds: [params.get("unit")!] } : {}),
    ...(params.get("unitType")
      ? { unitTypeIds: [params.get("unitType")!] }
      : {}),
    ...(params.get("system") ? { systems: [params.get("system")!] } : {}),
    ...(params.get("type") ? { maintenanceTypes: [params.get("type")!] } : {}),
    ...(params.get("workKind") ? { workKinds: [params.get("workKind")!] } : {}),
    sort: params.get("sort") ?? "COST",
    direction: params.get("direction") ?? "DESC",
  };
}
export function queryParams(q: AnalysisQuery) {
  const p = new URLSearchParams({ from: q.from, to: q.to });
  for (const [name, value] of Object.entries({
    unit: q.unitIds?.[0],
    unitType: q.unitTypeIds?.[0],
    system: q.systems?.[0],
    type: q.maintenanceTypes?.[0],
    workKind: q.workKinds?.[0],
    sort: q.sort,
    direction: q.direction,
  }))
    if (value) p.set(name, value);
  return p.toString();
}
export async function analysisApi<T>(
  role: Role,
  userId: string,
  path: string,
  options: RequestInit = {},
) {
  try {
    return await api<T>(`/analisis-mantenimiento${path}`, {
      ...options,
      role,
      userId,
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new Error("No se pudo conectar con el servicio. Intenta de nuevo.");
  }
}
