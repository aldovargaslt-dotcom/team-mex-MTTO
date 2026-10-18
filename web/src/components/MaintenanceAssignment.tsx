"use client";
import { useState } from "react";
import { NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { ReadStatus } from "@/components/ReadStatus";
import { useRole } from "@/lib/role";
import { useReadResource } from "@/lib/use-read-resource";
import { api } from "@/lib/api";
import { type ReadinessOrder } from "@/lib/unit-readiness";

export function MaintenanceAssignment({
  unitId,
  order,
  onSaved,
}: {
  unitId: string;
  order: ReadinessOrder;
  onSaved: () => void;
}) {
  const { role, userId } = useRole();
  const [open, setOpen] = useState(false),
    [subject, setSubject] = useState(order.assignedTo || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const read = useReadResource<{
    items: { subject: string; displayName: string }[];
  }>(
    open && role === "SUPERVISOR"
      ? JSON.stringify([role, userId, unitId, "assignees"])
      : null,
    () => api(`/unit-readiness/${unitId}/assignees`, { role: role!, userId }),
  );
  if (role !== "SUPERVISOR" || order.type === "CHECK") return null;
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(`/unit-readiness/${unitId}/orders/${order.id}/assign`, {
        role: role!,
        userId,
        method: "POST",
        body: JSON.stringify({
          assignedActorId: subject,
          expectedVersion: order.version,
        }),
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="readiness-assignment">
      {!open ? (
        <Button variant="quiet" onClick={() => setOpen(true)}>
          {order.assignedTo ? "Cambiar asignación" : "Asignar mecánico"}
        </Button>
      ) : (
        <>
          <ReadStatus
            loading={read.loading}
            error={read.error}
            loadingText="Consultando mecánicos autorizados…"
            errorText="No se pudo consultar el directorio."
            retry={read.retry}
          />
          {read.data ? (
            read.data.items.length ? (
              <>
                <NativeSelect
                  aria-label="Mecánico asignado a esta orden"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">Seleccione un mecánico</option>
                  {read.data.items.map((m) => (
                    <option key={m.subject} value={m.subject}>
                      {m.displayName}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  variant="outline"
                  disabled={busy || !subject}
                  onClick={() => void save()}
                >
                  {busy ? "Guardando…" : "Guardar asignación"}
                </Button>
              </>
            ) : (
              <p className="muted">
                No hay mecánicos activos registrados en el directorio de este
                facility.
              </p>
            )
          ) : null}
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <FormAlert>{error}</FormAlert>
        </>
      )}
    </div>
  );
}
