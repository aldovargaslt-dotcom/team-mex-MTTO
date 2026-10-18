"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Note } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { SignaturePad } from "@/components/SignaturePad";
import { ReadStatus } from "@/components/ReadStatus";
import { useRole } from "@/lib/role";
import { useReadResource } from "@/lib/use-read-resource";
import { api } from "@/lib/api";
import { type ReadinessSnapshot } from "@/lib/unit-readiness";

export function OrderSafetyControls({
  unitId,
  orderId,
  closed,
}: {
  unitId: string;
  orderId: string;
  closed: boolean;
}) {
  const { role, userId } = useRole();
  const read = useReadResource<ReadinessSnapshot>(
    role
      ? JSON.stringify([role, userId, unitId, orderId, closed, "safety"])
      : null,
    () => api(`/unit-readiness/${unitId}`, { role: role!, userId }),
  );
  const [reason, setReason] = useState(""),
    [observation, setObservation] = useState("");
  const [signature, setSignature] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [command, setCommand] = useState<{ body: string; key: string } | null>(
    null,
  );
  const row = read.data?.items[0];
  const eligible = row?.holds.filter((hold) => hold.orderId === orderId) ?? [];
  const canHold = role === "MECANICO" || role === "LOGISTICA";
  async function submit(kind: "holds" | "verifications") {
    const payload =
      kind === "holds"
        ? { orderId, reason }
        : {
            orderId,
            observation,
            signatureDataUrl: signature,
            holdIds: eligible.map((hold) => hold.id),
          };
    const body = JSON.stringify(payload),
      key = command?.body === body ? command.key : crypto.randomUUID();
    setCommand({ body, key });
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`/unit-readiness/${unitId}/${kind}`, {
        role: role!,
        userId,
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: key }),
      });
      setSuccess(
        kind === "holds"
          ? "Retención de seguridad registrada."
          : "Verificación firmada. Se conservan los demás bloqueos y requisitos de salida.",
      );
      setReason("");
      setObservation("");
      setSignature(null);
      setCommand(null);
      read.retry();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo confirmar el resultado. Consulta el registro antes de volver a intentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="readiness-detail"
      aria-label="Seguridad y verificación de reparación"
    >
      <div className="readiness-section-head">
        <div>
          <p className="readiness-eyebrow">Orden y liberación técnica</p>
          <h2>Bloqueos de seguridad</h2>
        </div>
        <Button variant="quiet" onClick={read.retry}>
          Actualizar
        </Button>
      </div>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Consultando bloqueos…"
        errorText="No se pudieron confirmar los bloqueos."
        retry={read.retry}
      />
      {row ? (
        <>
          <Badge variant={row.holds.length ? "danger" : "muted"}>
            {row.holds.length} retención(es) activa(s)
          </Badge>
          {row.holds.length ? (
            <ul className="readiness-hold-list">
              {row.holds.map((hold) => (
                <li key={hold.id}>
                  <strong>{hold.reason}</strong>
                  <span>
                    {hold.orderId === orderId
                      ? "De esta orden"
                      : "De otra orden; no se libera desde aquí"}{" "}
                    · {hold.actorName}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Sin retenciones de seguridad registradas. Los demás requisitos de
              revisión y salida siguen aplicando.
            </p>
          )}
          {closed && row.holds.length ? (
            <Note variant="warn">
              La orden está cerrada. La unidad conserva los bloqueos indicados
              hasta completar su verificación técnica.
            </Note>
          ) : null}
          {canHold && !closed ? (
            <div className="readiness-safety-form">
              <Field
                label="Reportar un problema de seguridad en esta orden"
                htmlFor={`hold-${orderId}`}
              >
                <Textarea
                  id={`hold-${orderId}`}
                  value={reason}
                  maxLength={2000}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describa por qué no puede operar."
                />
              </Field>
              <Button
                variant="dangerSoft"
                disabled={busy || !reason.trim()}
                onClick={() => void submit("holds")}
              >
                {busy ? "Guardando…" : "Retener por seguridad"}
              </Button>
            </div>
          ) : null}
          {role === "MECANICO" && eligible.length > 0 ? (
            closed ? (
              <div className="readiness-safety-form">
                <h3>Verificar reparación de esta orden</h3>
                <p>
                  Verifique personalmente:{" "}
                  {eligible.map((hold) => hold.reason).join("; ")}. La firma
                  solo resuelve estas retenciones.
                </p>
                <Field
                  label="Resultado de su verificación personal"
                  htmlFor={`verify-${orderId}`}
                >
                  <Textarea
                    id={`verify-${orderId}`}
                    value={observation}
                    maxLength={4000}
                    onChange={(e) => setObservation(e.target.value)}
                  />
                </Field>
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  disabled={busy}
                  label="Firma del mecánico que verificó la reparación"
                />
                <Button
                  disabled={busy || !observation.trim() || !signature}
                  onClick={() => void submit("verifications")}
                >
                  {busy ? "Firmando…" : "Firmar verificación"}
                </Button>
              </div>
            ) : (
              <p className="muted">
                Complete el cierre autorizado de esta orden antes de firmar la
                verificación.
              </p>
            )
          ) : null}
        </>
      ) : null}
      <FormAlert>{error}</FormAlert>
      {success ? (
        <p role="status" className="readiness-success">
          {success}
        </p>
      ) : null}
    </section>
  );
}
