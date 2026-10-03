import type { ApiError } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/backend";

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(
    status: number,
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEPARTURE_REASON_LABELS: Record<string, string> = {
  UNIT_INACTIVE: "Reactiva la unidad antes de despacharla.",
  JOURNEY_ALREADY_IN_ROUTE: "La unidad ya tiene un viaje en ruta.",
  PHYSICAL_STATE_REQUIRED: "Registra la unidad como EN PATIO.",
  PHYSICAL_STATE_NOT_READY: "La unidad debe estar EN PATIO.",
  INSURANCE_REQUIRED: "Carga una póliza de seguro vigente.",
  INSURANCE_EXPIRED: "Renueva la póliza de seguro.",
  CHECK_REQUIRED: "Completa y firma el CHECK operativo de hoy.",
  CHECK_EXPIRED: "El CHECK venció; realiza uno nuevo.",
  CHECK_INVALIDATED: "El CHECK fue invalidado; realiza uno nuevo.",
  CHECK_UNSIGNED: "El CHECK debe estar firmado.",
  CHECK_UNFIT: "El CHECK marcó la unidad como no apta.",
  MAINTENANCE_BLOCKING: "Resuelve el bloqueo de mantenimiento.",
};

export function departureErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError)) return "No se pudo registrar la salida.";
  if (error.code === "DEPARTURE_POLICY_UNAVAILABLE") {
    return "No pudimos verificar los requisitos de salida. Intenta de nuevo.";
  }
  if (error.code !== "DEPARTURE_BLOCKED") return error.message;
  const reasons = Array.isArray(error.details?.reasons)
    ? error.details.reasons.filter(
        (reason): reason is string => typeof reason === "string",
      )
    : [];
  const actions = reasons
    .map((reason) => DEPARTURE_REASON_LABELS[reason])
    .filter(Boolean);
  return actions.length
    ? `No se puede registrar la salida. ${actions.join(" ")}`
    : error.message;
}

export async function api<T>(
  path: string,
  options: RequestInit & { role: string; userId?: string },
): Promise<T> {
  const { role, userId, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Role": role,
      ...(userId ? { "X-User-Id": userId } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let message = "No se pudo completar la solicitud.";
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
      }
      code = body?.code;
      details = body?.details;
    } catch {
      /* ignore */
    }
    throw new HttpError(res.status, message, code, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
