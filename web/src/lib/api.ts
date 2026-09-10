import type { ApiError } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/backend';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { role: string; userId?: string },
): Promise<T> {
  const { role, userId, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Role': role,
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let message = 'No se pudo completar la solicitud.';
    try {
      const body = (await res.json()) as ApiError;
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(' ')
          : body.message;
      }
    } catch {
      /* ignore */
    }
    throw new HttpError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
