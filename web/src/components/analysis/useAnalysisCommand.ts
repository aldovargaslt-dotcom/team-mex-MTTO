"use client";
import { useCallback, useEffect, useState } from "react";
import { HttpError } from "@/lib/api";
import { analysisApi } from "@/lib/maintenance-analysis";
import type { Role } from "@/lib/types";
type Pending = { key: string; body: unknown; path: string };
export function useAnalysisCommand(
  role: Role | null,
  userId: string,
  path: string,
) {
  const storageKey = `team-mex-analysis-command:${userId}:${path}`;
  const [pending, setPending] = useState<Pending | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      setPending(saved ? (JSON.parse(saved) as Pending) : null);
    } catch {
      setPending(null);
    }
  }, [storageKey]);
  const execute = useCallback(
    async (body?: unknown) => {
      if (!role || busy) return null;
      const restored = pending !== null;
      const command = pending ?? { key: crypto.randomUUID(), body, path };
      if (command.path !== path)
        throw new Error("La operación pendiente corresponde a otra acción.");
      setBusy(true);
      setError("");
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(command));
      } catch {
        setError(
          "Habilita el almacenamiento de esta sesión para guardar y recuperar la operación.",
        );
        setBusy(false);
        return null;
      }
      setPending(command);
      try {
        const result = await analysisApi<Record<string, unknown>>(
          role,
          userId,
          path,
          {
            method: "POST",
            signal: AbortSignal.timeout(30000),
            headers: { "Idempotency-Key": command.key },
            body: JSON.stringify(command.body),
          },
        );
        sessionStorage.removeItem(storageKey);
        setPending(null);
        return result;
      } catch (e) {
        const definitive =
          e instanceof HttpError &&
          e.status < 500 &&
          !(restored && [401, 403, 404].includes(e.status));
        if (definitive) {
          sessionStorage.removeItem(storageKey);
          setPending(null);
        }
        setError(
          e instanceof Error
            ? e.message
            : "No pudimos confirmar la operación. Reintenta la misma operación.",
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [role, userId, busy, pending, path, storageKey],
  );
  return { execute, pending, busy, error, clearError: () => setError("") };
}
