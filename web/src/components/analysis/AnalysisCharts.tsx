"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  cents,
  type Monthly,
  type Frequency,
} from "@/lib/maintenance-analysis";
import { MAINTENANCE_TYPES } from "@/lib/maintenance-type";

const TYPE_SERIES = [
  {
    key: "preventiveCents",
    label: "Preventivo",
    color: MAINTENANCE_TYPES.PREVENTIVE.color,
  },
  {
    key: "correctiveCents",
    label: "Correctivo",
    color: MAINTENANCE_TYPES.CORRECTIVE.color,
  },
  {
    key: "unclassifiedCents",
    label: "Sin clasificar",
    color: MAINTENANCE_TYPES.UNKNOWN.color,
  },
] as const;
const CONCEPT_SERIES = [
  { key: "partsCents", label: "Refacciones", color: "#68748A" },
  { key: "servicesCents", label: "Servicios externos", color: "#3D5054" },
] as const;
type Series = { key: string; label: string; color: string };
type ChartRow = Monthly & { raw: Monthly };
function CostTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: readonly { payload?: ChartRow }[];
  series: readonly Series[];
}) {
  const row = payload?.[0]?.payload?.raw;
  if (!active || !row) return null;
  const values = row as unknown as Record<string, string>;
  return (
    <div className="analysis-chart-tooltip">
      <strong>
        {row.month}
        {row.partial ? " · periodo parcial" : ""}
      </strong>
      <dl>
        {series.map((s) => (
          <div key={s.key}>
            <dt>
              <i style={{ background: s.color }} />
              {s.label}
            </dt>
            <dd>{cents(values[s.key])}</dd>
          </div>
        ))}
      </dl>
      {row.pending > 0 && <p>{row.pending} registros pendientes de costear</p>}
    </div>
  );
}
export function MonthlyCostChart({
  rows,
  onMonth,
  breakdown = "TYPE",
  onBreakdown,
  cutoff,
}: {
  rows: Monthly[];
  onMonth: (month: string) => void;
  breakdown?: "TYPE" | "CONCEPT";
  onBreakdown?: (mode: "TYPE" | "CONCEPT") => void;
  cutoff?: string;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const series = breakdown === "TYPE" ? TYPE_SERIES : CONCEPT_SERIES;
  const partial = rows.find((row) => row.partial);
  const cutLabel = cutoff
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Mexico_City",
      }).format(new Date(new Date(cutoff).getTime() - 1))
    : null;
  const visible = series.filter((x) => !hidden.includes(x.key));
  const chartRows = rows.map((x) => ({
    ...x,
    axisLabel: `${x.label}${x.partial ? "*" : ""}`,
    raw: x,
    ...Object.fromEntries(
      series.map((s) => [
        s.key,
        Number((x as unknown as Record<string, string>)[s.key]) / 100,
      ]),
    ),
  }));
  function select(entry: unknown) {
    const e = entry as { month?: string; payload?: { month?: string } };
    const month = e.month ?? e.payload?.month;
    if (month) onMonth(month);
  }
  return (
    <section
      className="analysis-chart"
      aria-label="Evolución del costo de mantenimiento"
    >
      <div className="analysis-section-heading">
        <div>
          <h2>Evolución del costo</h2>
          <p>Últimos 6 meses · MXN sin IVA · costo conocido</p>
          {partial && (
            <p>
              <strong>
                {partial.label}*: parcial{cutLabel ? ` al ${cutLabel}` : ""}
              </strong>
            </p>
          )}
        </div>
        {onBreakdown && (
          <div className="analysis-segmented" aria-label="Desglose del costo">
            <button
              type="button"
              aria-pressed={breakdown === "TYPE"}
              onClick={() => onBreakdown("TYPE")}
            >
              Por tipo
            </button>
            <button
              type="button"
              aria-pressed={breakdown === "CONCEPT"}
              onClick={() => onBreakdown("CONCEPT")}
            >
              Por concepto
            </button>
          </div>
        )}
      </div>
      {visible.length ? (
        <div className="analysis-chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              stackOffset="sign"
              data={chartRows}
              margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#e4e5ec" />
              <XAxis
                dataKey="axisLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#5c5f73" }}
              />
              <YAxis
                width={54}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#5c5f73" }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("es-MX", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <Tooltip
                content={<CostTooltip series={visible} />}
                cursor={{ fill: "#f0f0f4" }}
              />
              {visible.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="known"
                  fill={s.color}
                  maxBarSize={48}
                  isAnimationActive={false}
                  onClick={select}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="analysis-empty">
          Activa una serie para mostrar la gráfica.
        </p>
      )}
      <div className="analysis-chart-legend" aria-label="Series visibles">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={!hidden.includes(s.key)}
            onClick={() =>
              setHidden((old) =>
                old.includes(s.key)
                  ? old.filter((x) => x !== s.key)
                  : [...old, s.key],
              )
            }
          >
            <i style={{ background: s.color }} />
            {s.label}
            {hidden.includes(s.key) ? " (oculta)" : ""}
          </button>
        ))}
      </div>
      <p className="analysis-caption">
        {partial
          ? `* ${partial.label}: periodo parcial${cutLabel ? ` al ${cutLabel}` : ""}. `
          : ""}
        Selecciona un mes para ver sus registros. Ocultar series no modifica el
        total de la tabla.
      </p>
      <details className="analysis-chart-data">
        <summary>Ver datos de la gráfica</summary>
        <div className="analysis-table-scroll">
          <table>
            <caption>Costos conocidos por mes, sin IVA</caption>
            <thead>
              <tr>
                <th>Mes</th>
                {series.map((s) => (
                  <th key={s.key}>{s.label}</th>
                ))}
                <th>Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <th>
                    <button
                      type="button"
                      className="analysis-link"
                      onClick={() => onMonth(row.month)}
                    >
                      {row.month}
                      {row.partial ? " · parcial" : ""}
                    </button>
                  </th>
                  {series.map((s) => (
                    <td key={s.key}>
                      {cents((row as unknown as Record<string, string>)[s.key])}
                    </td>
                  ))}
                  <td>{row.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
export function SystemFrequencyChart({
  rows,
  onSystem,
}: {
  rows: Frequency[];
  onSystem: (system: string) => void;
}) {
  const [mode, setMode] = useState<"frequency" | "cost">("frequency");
  const data = rows.map((r) => ({
    ...r,
    value: mode === "frequency" ? r.count : Number(r.netCents ?? "0") / 100,
  }));
  function select(entry: unknown) {
    const e = entry as { system?: string; payload?: { system?: string } };
    const system = e.system ?? e.payload?.system;
    if (system) onSystem(system);
  }
  return (
    <section className="analysis-chart" aria-label="Intervenciones por sistema">
      <div className="analysis-section-heading">
        <div>
          <h2>Intervenciones por sistema</h2>
          <p>Periodo seleccionado · órdenes y servicios concluidos</p>
        </div>
        <div className="analysis-segmented" aria-label="Medida por sistema">
          <button
            type="button"
            aria-pressed={mode === "frequency"}
            onClick={() => setMode("frequency")}
          >
            Frecuencia
          </button>
          <button
            type="button"
            aria-pressed={mode === "cost"}
            onClick={() => setMode("cost")}
          >
            Costo
          </button>
        </div>
      </div>
      {data.some((x) => x.value !== 0) ? (
        <div className="analysis-chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid horizontal={false} stroke="#e4e5ec" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={mode !== "frequency"}
                tick={{ fontSize: 12, fill: "#5c5f73" }}
              />
              <YAxis
                type="category"
                dataKey="system"
                width={86}
                tickFormatter={(system: string) =>
                  ({
                    A: "Motor",
                    B: "Frenos",
                    C: "Suspensión",
                    D: "Llantas",
                    E: "Carrocería",
                  })[system] ?? system
                }
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#5c5f73" }}
              />
              <Tooltip
                cursor={{ fill: "#f0f0f4" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Frequency | undefined;
                  return active && row ? (
                    <div className="analysis-chart-tooltip">
                      <strong>{row.label}</strong>
                      <p>
                        {mode === "frequency"
                          ? `${row.count} intervenciones`
                          : `${cents(row.netCents)} sin IVA`}
                      </p>
                      {row.pending > 0 && (
                        <p>{row.pending} costos pendientes</p>
                      )}
                    </div>
                  ) : null;
                }}
              />
              <Bar
                dataKey="value"
                fill="#68748A"
                maxBarSize={26}
                isAnimationActive={false}
                onClick={select}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="analysis-empty">
          No hay{" "}
          {mode === "frequency"
            ? "intervenciones concluidas"
            : "costos atribuidos a sistemas"}{" "}
          con estos filtros.
        </p>
      )}
      <p className="analysis-caption">
        Una intervención puede incluir varios sistemas. Revisión/ajuste,
        reparación y cambio se distinguen en Tendencias. Costos sin desglose se
        conservan en el total.
      </p>
      <details className="analysis-chart-data">
        <summary>Ver datos por sistema</summary>
        <div className="analysis-table-scroll">
          <table>
            <caption>Intervenciones y costo conocido del periodo</caption>
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Intervenciones</th>
                <th>Costo sin IVA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.system}>
                  <th>
                    <Button
                      variant="quiet"
                      onClick={() => onSystem(row.system)}
                    >
                      {row.label}
                    </Button>
                  </th>
                  <td>{row.count}</td>
                  <td>{cents(row.netCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
