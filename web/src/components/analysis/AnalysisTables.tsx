"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { MaintenanceTypeBadge } from "@/components/MaintenanceTypeBadge";
import {
  analysisApi,
  cents,
  hours,
  SYSTEM_LABELS,
  WORK_LABELS,
  type UnitMetric,
  type CostRecord,
  type Intervention,
} from "@/lib/maintenance-analysis";
import { useRole } from "@/lib/role";

function useRows<T>(snapshotId: string, metric: string) {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<T[] | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (next?: string, signal?: AbortSignal) => {
      if (!role) return;
      setBusy(true);
      setError("");
      try {
        const data = await analysisApi<{
          rows: T[];
          nextCursor: string | null;
          total: number;
        }>(
          role,
          userId,
          `/consultas/${snapshotId}/registros?metricId=${metric}&limit=50${next ? `&cursor=${encodeURIComponent(next)}` : ""}`,
          { signal },
        );
        if (!signal?.aborted) {
          setRows((previous) =>
            next ? [...(previous ?? []), ...data.rows] : data.rows,
          );
          setCursor(data.nextCursor);
          setTotal(data.total);
        }
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos cargar los registros.",
          );
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [role, userId, snapshotId, metric],
  );
  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setCursor(null);
    void load(undefined, controller.signal);
    return () => controller.abort();
  }, [load]);
  return { rows, cursor, total, error, busy, load };
}
export function UnitTable({
  rows,
  utilization = false,
  onUnit,
}: {
  rows: UnitMetric[];
  utilization?: boolean;
  onUnit?: (id: string) => void;
}) {
  return (
    <div className="analysis-table-scroll">
      <table>
        <caption>
          {utilization
            ? "Viajes registrados y cobertura temporal por unidad"
            : "Costo conocido y mantenimiento por unidad"}
        </caption>
        <thead>
          <tr>
            <th>Unidad</th>
            {utilization ? (
              <>
                <th>Viaje registrado</th>
                <th>Horario esperado</th>
                <th>Sin clasificar</th>
                <th>Utilización</th>
              </>
            ) : (
              <>
                <th>Costo conocido</th>
                <th>Correctivos</th>
                <th>Costo conocido/km</th>
                <th>Motivo</th>
              </>
            )}
            <th>Consulta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th>
                <Link className="analysis-link" href={`/unidades/${row.id}`}>
                  {row.label}
                </Link>
                <span className="analysis-cell-meta">{row.typeName}</span>
              </th>
              {utilization ? (
                <>
                  <td>{hours(row.registeredTripSeconds)}</td>
                  <td>{hours(row.expectedSeconds)}</td>
                  <td>{hours(row.unclassifiedSeconds)}</td>
                  <td>
                    <span className="muted">No disponible</span>
                  </td>
                </>
              ) : (
                <>
                  <td>
                    {cents(row.netCents)}
                    {row.partial ? "*" : ""}
                  </td>
                  <td>{row.correctiveCount}</td>
                  <td>
                    {row.knownCostPerKmCents !== null ? (
                      `${cents(row.knownCostPerKmCents)}${row.costPerKmPartial ? "*" : ""}`
                    ) : (
                      <span className="muted">Sin km suficientes</span>
                    )}
                  </td>
                  <td>
                    {row.attention === "Mantenimiento vencido" ? (
                      <span className="analysis-warning-text">
                        {row.attention}
                      </span>
                    ) : (
                      row.attention
                    )}
                  </td>
                </>
              )}
              <td>
                {onUnit ? (
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => onUnit(row.id)}
                    aria-label={`Analizar ${row.label}`}
                  >
                    Analizar
                  </Button>
                ) : (
                  <Link className="analysis-link" href={`/unidades/${row.id}`}>
                    Ficha
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="analysis-empty">
          No hay unidades con estos filtros. Prueba otro alcance.
        </p>
      )}
    </div>
  );
}
export function UnitListSection({
  snapshotId,
  utilization,
  onUnit,
}: {
  snapshotId: string;
  utilization?: boolean;
  onUnit: (id: string) => void;
}) {
  const page = useRows<UnitMetric>(snapshotId, "UNITS");
  return (
    <section className="analysis-panel">
      <div className="analysis-section-heading">
        <div>
          <h2>
            {utilization
              ? "Tiempo registrado por unidad"
              : "Unidades y costo del periodo"}
          </h2>
          <p>Filtros actuales · {page.total} unidades</p>
        </div>
      </div>
      <FormAlert>{page.error}</FormAlert>
      {page.rows ? (
        <UnitTable rows={page.rows} utilization={utilization} onUnit={onUnit} />
      ) : (
        <p className="muted" role="status">
          Cargando unidades…
        </p>
      )}
      <PageMore {...page} />
    </section>
  );
}
export function CostRecordsSection({
  snapshotId,
  onSelect,
}: {
  snapshotId: string;
  onSelect: (record: CostRecord) => void;
}) {
  const page = useRows<CostRecord>(snapshotId, "COSTS");
  return (
    <section className="analysis-panel">
      <div className="analysis-section-heading">
        <div>
          <h2>Registros que explican el costo</h2>
          <p>Refacciones y servicios externos · sin IVA</p>
        </div>
      </div>
      <FormAlert>{page.error}</FormAlert>
      {page.rows ? (
        <div className="analysis-table-scroll">
          <table>
            <caption>Registros fuente del costo conocido</caption>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Unidad</th>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Sistema</th>
                <th>Neto conocido</th>
                <th>Consulta</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <th>
                    <Link
                      className="analysis-link"
                      href={`/unidades/${row.unitId}`}
                    >
                      {row.unitLabel}
                    </Link>
                  </th>
                  <td>
                    {row.concept === "PARTS" ? "Refacción" : "Servicio externo"}
                    <span className="analysis-cell-meta">{row.label}</span>
                  </td>
                  <td>
                    <MaintenanceTypeBadge type={row.maintenanceType} />
                  </td>
                  <td>{SYSTEM_LABELS[row.system ?? "UNKNOWN"]}</td>
                  <td>
                    {row.state === "PENDING" ? (
                      <span className="analysis-warning-text">Pendiente</span>
                    ) : row.state === "RECONCILIATION" ? (
                      <span className="analysis-warning-text">
                        En conciliación
                      </span>
                    ) : (
                      cents(
                        row.netCents === null
                          ? null
                          : (
                              BigInt(row.netCents) * BigInt(row.sign)
                            ).toString(),
                      )
                    )}
                    {row.includedByService && (
                      <span className="analysis-cell-meta">
                        Incluida en servicio
                      </span>
                    )}
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => onSelect(row)}
                      aria-label={`Consultar ${row.concept === "PARTS" ? "refacción" : "servicio"} de ${row.unitLabel} del ${row.date}`}
                    >
                      Consultar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page.rows.length && (
            <p className="analysis-empty">
              No hay costos registrados para este periodo y alcance.
            </p>
          )}
        </div>
      ) : (
        <p role="status" className="muted">
          Cargando registros…
        </p>
      )}
      <PageMore {...page} />
    </section>
  );
}
export function InterventionRecordsSection({
  snapshotId,
}: {
  snapshotId: string;
}) {
  const page = useRows<Intervention>(snapshotId, "INTERVENTIONS");
  return (
    <section className="analysis-panel">
      <div className="analysis-section-heading">
        <div>
          <h2>Intervenciones concluidas</h2>
          <p>
            Una intervención puede incluir varios sistemas; el detalle conserva
            su origen.
          </p>
        </div>
      </div>
      <FormAlert>{page.error}</FormAlert>
      {page.rows ? (
        <div className="analysis-table-scroll">
          <table>
            <caption>
              Intervenciones por sistema y naturaleza del trabajo
            </caption>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Unidad</th>
                <th>Sistema</th>
                <th>Intervención</th>
                <th>Tipo</th>
                <th>Kilometraje</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={`${row.id}:${row.system}:${row.workKind}`}>
                  <td>{row.date}</td>
                  <th>
                    <Link
                      className="analysis-link"
                      href={`/unidades/${row.unitId}`}
                    >
                      {row.unitLabel}
                    </Link>
                  </th>
                  <td>{SYSTEM_LABELS[row.system ?? "UNKNOWN"]}</td>
                  <td>{WORK_LABELS[row.workKind]}</td>
                  <td>
                    <MaintenanceTypeBadge type={row.maintenanceType} />
                  </td>
                  <td>
                    {row.km === null
                      ? "Sin lectura"
                      : `${row.km.toLocaleString("es-MX")} km`}
                  </td>
                  <td>
                    {row.orderId ? (
                      <Link
                        className="analysis-link"
                        href={`/ordenes?orden=${row.orderId}`}
                      >
                        Orden
                      </Link>
                    ) : (
                      "Servicio externo"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page.rows.length && (
            <p className="analysis-empty">
              No hay intervenciones concluidas con estos filtros.
            </p>
          )}
        </div>
      ) : (
        <p role="status" className="muted">
          Cargando intervenciones…
        </p>
      )}
      <PageMore {...page} />
    </section>
  );
}
export function InterventionPairsSection({
  snapshotId,
}: {
  snapshotId: string;
}) {
  type Pair = {
    unitId: string;
    system: string;
    workKind: string;
    previous: string;
    current: string;
    distanceKm: number;
  };
  const page = useRows<Pair>(snapshotId, "PAIRS");
  return (
    <section className="analysis-panel">
      <div className="analysis-section-heading">
        <div>
          <h2>Kilómetros entre reparaciones o cambios</h2>
          <p>
            Misma unidad, sistema y tipo de trabajo; solo pares con lecturas
            válidas.
          </p>
        </div>
      </div>
      <FormAlert>{page.error}</FormAlert>
      {page.rows?.length ? (
        <div className="analysis-table-scroll">
          <table>
            <caption>
              Pares de intervenciones con kilometraje comparable
            </caption>
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Trabajo</th>
                <th>Anterior</th>
                <th>Actual</th>
                <th>Distancia</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr
                  key={`${row.unitId}:${row.system}:${row.workKind}:${row.previous}:${row.current}`}
                >
                  <th>{SYSTEM_LABELS[row.system]}</th>
                  <td>{WORK_LABELS[row.workKind]}</td>
                  <td>{row.previous}</td>
                  <td>{row.current}</td>
                  <td>{row.distanceKm.toLocaleString("es-MX")} km</td>
                  <td>
                    <Link
                      className="analysis-link"
                      href={`/unidades/${row.unitId}`}
                    >
                      Ficha de unidad
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="analysis-empty">
          {page.busy
            ? "Consultando pares…"
            : "No hay pares con kilometraje suficiente. No se estima la vida útil de una pieza."}
        </p>
      )}
      <PageMore {...page} />
    </section>
  );
}
function PageMore({
  cursor,
  total,
  rows,
  busy,
  error,
  load,
}: {
  cursor: string | null;
  total: number;
  rows: unknown[] | null;
  busy: boolean;
  error: string;
  load: (cursor?: string) => Promise<void>;
}) {
  return (
    <div className="analysis-table-footer">
      <span className="muted">
        {rows ? `${rows.length} de ${total} registros` : ""}
      </span>
      {error ? (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void load(cursor ?? undefined)}
        >
          Reintentar
        </Button>
      ) : (
        cursor && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void load(cursor)}
          >
            {busy ? "Cargando…" : "Cargar más"}
          </Button>
        )
      )}
    </div>
  );
}
