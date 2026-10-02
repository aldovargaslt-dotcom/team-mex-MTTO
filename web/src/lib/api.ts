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

export async function api<T>(
  path: string,
  options: RequestInit & { role: string; userId?: string },
): Promise<T> {
  const { role, userId, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Role": role,
      ...(userId ? { "X-User-Id": userId } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;
    let message = "No se pudo completar la solicitud.";
    try {
      const body = (await res.json()) as ApiError;
      if (typeof body?.code === "string") code = body.code;
      if (body?.details && typeof body.details === "object")
        details = body.details;
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(" ")
          : body.message;
      }
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
