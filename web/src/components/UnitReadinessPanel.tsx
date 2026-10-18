"use client";
import Link from "next/link";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { MaintenanceAssignment } from "@/components/MaintenanceAssignment";
import { ReadStatus } from "@/components/ReadStatus";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";
import { api } from "@/lib/api";
import { useReadResource } from "@/lib/use-read-resource";
import {
  readinessLabel,
  readinessTime,
  checkStateLabel,
  orderTypeLabel,
  orderStatusLabel,
  type ReadinessSnapshot,
} from "@/lib/unit-readiness";

export function UnitReadinessPanel({
  unitId,
  showOrders = true,
}: {
  unitId: string;
  showOrders?: boolean;
}) {
  const { role, userId } = useRole();
  const read = useReadResource<ReadinessSnapshot>(
    role ? JSON.stringify([role, userId, unitId, "readiness"]) : null,
    () => api(`/unit-readiness/${unitId}`, { role: role!, userId }),
  );
  const snapshot = read.data,
    row = snapshot?.items[0];
  return (
    <section
      className="readiness-detail readiness-overview"
      data-priority={row?.attention}
      aria-label="Situación operativa de la unidad"
    >
      <div className="readiness-section-head">
        <div>
          <h2>Situación de la unidad</h2>
        </div>
        <Button variant="quiet" onClick={read.retry}>
          Actualizar
        </Button>
      </div>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Cargando situación de la unidad…"
        errorText="No pudimos confirmar la operabilidad. No utilice datos anteriores como autorización de salida."
        retry={read.retry}
      />
      {row && snapshot ? (
        <>
          <div className="readiness-status-line">
            <strong className="readiness-verdict" data-critical={row.attention === "CRITICAL" || undefined}>
              {readinessLabel(row)}
            </strong>
            <span>
              {row.inUse ? "En uso · viaje activo" : "Sin viaje activo"}
            </span>

          </div>
          {row.reasons.length ? (
            <div className="readiness-reasons">
              <h3>Qué necesita atención</h3>
              <ul>
                {row.reasons.map((reason) => (
                  <li key={reason}>
                    {reason === "Revisión vencida" && row.inUse
                      ? "En uso con revisión vencida. Requiere revisión antes del siguiente despacho."
                      : reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="readiness-caption">
              Sin pendientes conocidos en las fuentes consultadas.
            </p>
          )}
          <dl className="readiness-facts">
            <div>
              <dt>Último dictamen ABC</dt>
              <dd>
                {row.lastCheck
                  ? row.lastCheck.result === "UNFIT"
                    ? "No apta"
                    : row.lastCheck.result === "FIT_WITH_OBSERVATION"
                      ? "Apta con observaciones"
                      : "Apta"
                  : "Sin revisión firmada"}
              </dd>
              <small>{readinessTime(row.lastCheck?.reviewedAt)}</small>
            </div>
            <div>
              <dt>Vigencia</dt>
              <dd>{checkStateLabel[row.checkState]}</dd>
              <small>
                {row.lastCheck
                  ? `Vence ${readinessTime(row.lastCheck.dayEndInstant)}`
                  : "Requiere evaluación"}
              </small>
            </div>
            <div>
              <dt>Próximas revisiones</dt>
              <dd>Chequeo diario</dd>
              <small>Una revisión por jornada operativa</small>
            </div>
          </dl>
          <div className="readiness-detail-actions">
            {row.activeCheck || row.lastCheck ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/checks/${row.activeCheck?.checkId || row.lastCheck?.checkId}`}
                >
                  <ClipboardCheck className="size-4" aria-hidden />
                  {row.activeCheck
                    ? "Ver revisión pendiente"
                    : "Ver revisión firmada"}
                </Link>
              </Button>
            ) : (
              <span className="muted">
                Solicite la revisión a Logística o Administración.
              </span>
            )}

          </div>
          {showOrders ? (
            <section className="readiness-order-section">
              <div className="readiness-section-head">
                <div>
                  <h3>
                    Órdenes abiertas{" "}
                    <span className="readiness-count">{row.orders.length}</span>
                  </h3>
                </div>
              </div>
              {row.orders.length ? (
                <ul className="readiness-orders">
                  {row.orders.map((order) => (
                    <li key={order.id}>
                      <div>
                        <strong>{orderTypeLabel(order.type)}</strong>
                        <p>
                          {order.problem ||
                            "Consulte el trabajo y la evidencia en la orden."}
                        </p>
                        <small>
                          {orderStatusLabel(order.status)} ·{" "}
                          {readinessTime(order.createdAt)}
                        </small>
                        <MaintenanceAssignment
                          unitId={unitId}
                          order={order}
                          onSaved={read.retry}
                        />
                      </div>
                      <Button variant="outline" asChild>
                        <Link href={order.href}>
                          Abrir orden{" "}
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  No hay órdenes abiertas registradas. Esto no sustituye una
                  revisión vigente.
                </p>
              )}
            </section>
          ) : null}
          <p className="readiness-caption">
            Fuentes: ABC firmado, órdenes y Logística ·{" "}
            {readinessTime(snapshot.asOf)} (CDMX). El despacho valida además los
            requisitos de salida.
          </p>
        </>
      ) : null}
    </section>
  );
}
