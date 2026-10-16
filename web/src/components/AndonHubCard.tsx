"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, Note } from "@/components/ui/field";
import { api } from "@/lib/api";
import {
  explicacionAlertaAndon,
  formatFechaCorta,
  formatFechaHoraCorta,
  formatKm,
  etiquetaIntervaloMantenimiento,
} from "@/lib/format";
import { useRole } from "@/lib/role";
import type { AvisoAndon, UmbralAndon, UnidadHealth } from "@/lib/types";
export function AndonHubCard({
  unidadId,
  tipoId,
  onAvisoChange,
  ultimoServicioAt,
  ultimoServicioKm,
  health,
}: {
  unidadId: string;
  tipoId: string;
  onAvisoChange?: (aviso: AvisoAndon | null) => void;
  ultimoServicioAt?: string | null;
  ultimoServicioKm?: number | null;
  health?: UnidadHealth | null;
}) {
  const { role, userId, isAdmin } = useRole();
  const [aviso, setAviso] = useState<AvisoAndon | null>(null),
    [umbral, setUmbral] = useState<UmbralAndon | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      const [alerts, thresholds] = await Promise.allSettled([
        api<AvisoAndon[]>(
          `/andon/avisos?unidadId=${encodeURIComponent(unidadId)}`,
          { role: role!, userId, signal },
        ),
        api<UmbralAndon[]>("/andon/umbrales", { role: role!, userId, signal }),
      ]);
      if (signal?.aborted) return;
      if (alerts.status === "fulfilled") {
        const next = alerts.value.find((a) => a.estado !== "RESUELTO") ?? null;
        setAviso(next);
        onAvisoChange?.(next);
      }
      if (thresholds.status === "fulfilled")
        setUmbral(
          thresholds.value.find((t) => t.tipoVehiculoId === tipoId) ?? null,
        );
      if (alerts.status === "rejected" || thresholds.status === "rejected")
        setError(
          "No se pudo completar la evaluación preventiva. Los datos disponibles se conservaron.",
        );
      setLoading(false);
    },
    [role, userId, unidadId, tipoId, onAvisoChange],
  );
  useEffect(() => {
    const controller = new AbortController();
    setAviso(null);
    setUmbral(null);
    if (role) void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar, role]);
  async function enterado() {
    if (!aviso || busy) return;
    setBusy(true);
    try {
      await api(`/andon/avisos/${aviso.id}/enterado`, {
        role: role!,
        userId,
        method: "POST",
      });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar enterado.");
    } finally {
      setBusy(false);
    }
  }
  const explanation = aviso ? explicacionAlertaAndon(aviso) : null;
  const due = health?.drivers.find(
    (d) => d.type === "MAINTENANCE_OVERDUE" || d.type === "MAINTENANCE_DUE",
  );
  const at = aviso?.lastClosedAt ?? ultimoServicioAt;
  const km = aviso?.lastClosedKm ?? ultimoServicioKm;
  const interval = umbral
    ? etiquetaIntervaloMantenimiento(umbral.tKm, umbral.tDias)
    : aviso
      ? etiquetaIntervaloMantenimiento(aviso.umbralKm, aviso.umbralDias)
      : null;
  return (
    <section
      className={`card panel hub-preventive ${aviso ? "is-overdue" : ""}`}
    >
      <div className="hub-ops-card__head">
        <h2>Mantenimiento preventivo</h2>
        <Link href={`/unidades/${unidadId}?vista=mantenimiento`}>
          Ver mantenimiento
        </Link>
      </div>
      {loading ? (
        <p className="muted" role="status">
          Consultando mantenimiento…
        </p>
      ) : aviso ? (
        <>
          <p className="hub-ops-status text-destructive">
            {explanation?.titulo}
          </p>
          <p className="hub-ops-title">{explanation?.vencidoHace}</p>
          {explanation?.pasados.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </>
      ) : due ? (
        <p className="hub-ops-status">{due.message}</p>
      ) : (
        <p>
          {error
            ? "Estado preventivo no confirmado"
            : !at
              ? "No hay información suficiente para calcular el próximo servicio"
              : "Sin avisos preventivos activos"}
        </p>
      )}
      <dl className="dl mt-3">
        <dt>Último servicio cerrado</dt>
        <dd>
          {at ? formatFechaCorta(at) : "Sin registro"}
          {km != null ? ` · ${formatKm(km)}` : ""}
        </dd>
        <dt>Intervalo configurado</dt>
        <dd>{interval ?? "Sin información disponible"}</dd>
      </dl>
      {error ? (
        <>
          <FormAlert>{error}</FormAlert>
          <Button variant="outline" onClick={() => void cargar()}>
            Reintentar evaluación
          </Button>
        </>
      ) : null}
      {aviso?.estado === "ABIERTO" && !isAdmin ? (
        <Button
          className="mt-3"
          variant="outline"
          disabled={busy}
          onClick={() => void enterado()}
        >
          {busy ? "Marcando…" : "Marcar como enterado"}
        </Button>
      ) : null}
      {aviso?.estado === "ENTERADO" ? (
        <Note>
          Enterado
          {aviso.enteradoAt
            ? ` · ${formatFechaHoraCorta(aviso.enteradoAt)}`
            : ""}
          . El reconocimiento no resuelve la condición del aviso.
        </Note>
      ) : null}
    </section>
  );
}
