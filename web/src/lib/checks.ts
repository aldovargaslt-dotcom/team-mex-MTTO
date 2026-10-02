import { HttpError } from "./api";

export type CheckSummary = {
  id: string;
  folio: string;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  unidad?: { numeroInterno: string; placas: string | null };
  unidadId?: string;
  assignedActor: string | null;
  startedAt: string | null;
  step: number | null;
  anomalySummary: string | null;
  createdAt?: string;
  source?: string;
  operationalDate?: string;
  timezone?: string;
  deeplink?: string;
};
export type CheckList = {
  items: CheckSummary[];
  counts: { total: number; active: number };
  nextCursor: string | null;
};
export const checkStatus: Record<CheckSummary["status"], string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};
export const checkSources: Record<string, string> = {
  DAILY_AUTOMATIC: "Chequeo diario",
  LOGISTICS_MANUAL: "Solicitado por Logística",
  CHECK_OUT: "Chequeo de salida",
  CHECK_IN: "Chequeo de retorno",
  REINSPECTION: "Reinspección",
};
export function conflictCheck(value: unknown): CheckSummary | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<CheckSummary>;
  if (
    typeof v.id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(v.id) ||
    typeof v.folio !== "string" ||
    !v.status ||
    !Object.prototype.hasOwnProperty.call(checkStatus, v.status)
  )
    return null;
  return v as CheckSummary;
}

export function checkErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return fallback;
  if (error.status === 401)
    return "No pudimos verificar tu acceso. Vuelve a iniciar sesión e inténtalo de nuevo.";
  if (error.status === 403)
    return "No tienes permiso para consultar o solicitar este chequeo. Contacta al administrador.";
  return error.message;
}
