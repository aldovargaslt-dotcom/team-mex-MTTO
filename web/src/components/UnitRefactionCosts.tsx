"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { CostOperation, money } from "@/lib/inventory-costs";
import { etiquetaTipoVisita } from "@/lib/format";
import { useRole } from "@/lib/role";
import type { VisitaResumen } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
export function UnitRefactionCosts({
  unidadId,
  history,
}: {
  unidadId: string;
  history: VisitaResumen[];
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const period =
    params.get("periodo") === "custom"
      ? "custom"
      : params.get("periodo") === "12"
        ? "12"
        : "6";
  const months = period === "12" ? 12 : 6,
    selected = params.get("mes") ?? "";
  const [from, setFrom] = useState(params.get("desde") ?? ""),
    [to, setTo] = useState(params.get("hasta") ?? "");
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  const { role, userId } = useRole();
  const [rows, setRows] = useState<CostOperation[] | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setError("");
    if (role)
      void api<{ operations: CostOperation[] }>(
        `/inventario/costos/consumos?unidadId=${unidadId}`,
        { role, userId, signal: controller.signal },
      )
        .then((r) => {
          if (!controller.signal.aborted) setRows(r.operations);
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error
                ? e.message
                : "No se pudieron cargar los costos.",
            );
        });
    return () => controller.abort();
  }, [unidadId, role, userId, attempt]);
  const monthKey = (date: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date(date))
      .replace("/", "-");
  const rangeStart = params.get("desde") ?? "",
    rangeEnd = params.get("hasta") ?? "";
  const rangeMonths =
    (Number(rangeEnd.slice(0, 4)) - Number(rangeStart.slice(0, 4))) * 12 +
    Number(rangeEnd.slice(5, 7)) -
    Number(rangeStart.slice(5, 7)) +
    1;
  const rangeValid =
    /^\d{4}-\d{2}-\d{2}$/.test(rangeStart) &&
    /^\d{4}-\d{2}-\d{2}$/.test(rangeEnd) &&
    rangeStart <= rangeEnd &&
    rangeMonths > 0 &&
    rangeMonths <= 24;
  const [rangeError, setRangeError] = useState("");
  const bins = useMemo(() => {
    const now = new Date(),
      year = Number(
        new Intl.DateTimeFormat("en", {
          timeZone: "America/Mexico_City",
          year: "numeric",
        }).format(now),
      ),
      month = Number(
        new Intl.DateTimeFormat("en", {
          timeZone: "America/Mexico_City",
          month: "numeric",
        }).format(now),
      );
    let count = months,
      start = new Date(Date.UTC(year, month - months, 1));
    if (
      period === "custom" &&
      /^\d{4}-\d{2}-\d{2}$/.test(params.get("desde") ?? "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(params.get("hasta") ?? "")
    ) {
      const a = new Date(`${params.get("desde")}T12:00:00Z`),
        b = new Date(`${params.get("hasta")}T12:00:00Z`);
      if (a <= b) {
        start = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
        count = Math.min(
          24,
          (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
            b.getUTCMonth() -
            a.getUTCMonth() +
            1,
        );
      }
    }
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
      );
      return {
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString("es-MX", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }),
        preventive: BigInt(0),
        corrective: BigInt(0),
        unclassified: BigInt(0),
        pending: 0,
        rows: [] as CostOperation[],
      };
    });
  }, [months, period, params]);
  const data = bins.map((b) => ({ ...b, rows: [] as CostOperation[] }));
  const dayKey = (date: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  const inRange = (date: string) =>
    period !== "custom" ||
    ((!params.get("desde") || dayKey(date) >= params.get("desde")!) &&
      (!params.get("hasta") || dayKey(date) <= params.get("hasta")!));
  for (const op of rows ?? []) {
    if (!inRange(op.effectiveAt)) continue;
    const bucket = data.find((b) => b.key === monthKey(op.effectiveAt));
    if (!bucket) continue;
    bucket.rows.push(op);
    if (op.netCents == null) {
      bucket.pending++;
      continue;
    }
    const net =
      BigInt(op.netCents) * (op.kind === "RETURN" ? -BigInt(1) : BigInt(1));
    const visit = history.find((v) => v.id === op.visitaId);
    if (visit?.tipo === "PREDICTIVO") bucket.preventive += net;
    else if (visit?.tipo === "CORRECTIVO") bucket.corrective += net;
    else bucket.unclassified += net;
  }
  for (const v of history) {
    if (!inRange(v.cerradoAt ?? v.updatedAt)) continue;
    if (v.piezas?.length && !(rows ?? []).some((op) => op.visitaId === v.id)) {
      const b = data.find(
        (x) => x.key === monthKey(v.cerradoAt ?? v.updatedAt),
      );
      if (b) b.pending += v.piezas.length;
    }
  }
  const total = data.reduce(
      (n, b) => n + b.preventive + b.corrective + b.unclassified,
      BigInt(0),
    ),
    pending = data.reduce((n, b) => n + b.pending, 0),
    preventive = data.reduce((n, b) => n + b.preventive, BigInt(0)),
    corrective = data.reduce((n, b) => n + b.corrective, BigInt(0));
  const max = Math.max(
    ...data.map(
      (b) => Math.abs(Number(b.preventive)) + Math.abs(Number(b.corrective)),
    ),
    1,
  );
  const detail =
    data.find((b) => b.key === selected) ??
    [...data].reverse().find((b) => b.rows.length) ??
    data[data.length - 1];
  return (
    <section className="inventory-unit-costs">
      <div className="hub-ops-card__head">
        <div>
          <h3>Costo de refacciones</h3>
          <p className="muted">
            MXN sin IVA · Uso confirmado en órdenes · Hasta{" "}
            {new Date().toLocaleDateString("es-MX")}
          </p>
        </div>
        <NativeSelect
          aria-label="Periodo de costos"
          value={period}
          onChange={(e) => update({ periodo: e.target.value, mes: "" })}
        >
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value="custom">Personalizado</option>
        </NativeSelect>
      </div>
      {period === "custom" ? (
        <form
          className="inventory-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const count =
              (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
              Number(to.slice(5, 7)) -
              Number(from.slice(5, 7)) +
              1;
            if (from && to && from <= to && count <= 24) {
              setRangeError("");
              update({ desde: from, hasta: to, mes: "" });
            } else
              setRangeError("Selecciona un rango válido de hasta 24 meses.");
          }}
        >
          <label>
            Desde
            <input
              aria-label="Desde"
              className="control"
              type="date"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              aria-label="Hasta"
              className="control"
              type="date"
              min={from}
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <Button variant="outline">Aplicar periodo</Button>
          <p className="muted">Máximo 24 meses visibles.</p>
        </form>
      ) : null}
      {rangeError ? <FormAlert>{rangeError}</FormAlert> : null}
      {period === "custom" && !rangeValid ? (
        <p role="status">
          Selecciona y aplica un rango de hasta 24 meses para consultar costos.
        </p>
      ) : error ? (
        <>
          <FormAlert>{error}</FormAlert>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar costos
          </Button>
        </>
      ) : rows == null ? (
        <p role="status" className="muted">
          Cargando costos de refacciones…
        </p>
      ) : (
        <>
          <div className="inventory-cost-summary">
            <div>
              <span>
                {pending ? "Costo conocido del periodo" : "Costo del periodo"}
              </span>
              <strong>
                {data.some((b) => b.rows.some((op) => op.netCents != null))
                  ? money(total.toString())
                  : "Sin costos registrados"}
              </strong>
            </div>
            <div>
              <span>Preventivo</span>
              <strong>{money(preventive.toString())}</strong>
            </div>
            <div>
              <span>Correctivo</span>
              <strong>{money(corrective.toString())}</strong>
            </div>
          </div>
          {pending ? (
            <p className="inventory-cost-warning" role="status">
              Registro de costos incompleto: {pending} línea(s) pendiente(s). El
              importe conocido no es el total completo.
            </p>
          ) : null}
          {data.some((b) => b.rows.length) ? (
            <>
              <div className="inventory-cost-legend">
                <span>
                  <i className="preventive" />
                  Preventivo
                </span>
                <span>
                  <i className="corrective" />
                  Correctivo
                </span>
              </div>
              <div
                className="inventory-months"
                style={{
                  gridTemplateColumns: `repeat(${data.length},minmax(${data.length <= 6 ? 44 : 58}px,1fr))`,
                }}
                role="group"
                aria-label="Costo mensual de refacciones"
              >
                <span className="sr-only">
                  Importes netos; selecciona un mes para ver las órdenes. Los
                  retornos reducen el importe del mes en que se reciben.
                </span>
                {data.map((b) => (
                  <button
                    type="button"
                    key={b.key}
                    aria-pressed={detail.key === b.key}
                    aria-label={`${b.label}: Preventivo ${money(b.preventive.toString())}, Correctivo ${money(b.corrective.toString())}, pendientes ${b.pending}`}
                    onClick={() => update({ mes: b.key })}
                  >
                    <span className="inventory-month-bar" aria-hidden="true">
                      <span
                        className="corrective"
                        style={{
                          height: `${(Math.abs(Number(b.corrective)) / max) * 100}%`,
                        }}
                      />
                      <span
                        className="preventive"
                        style={{
                          height: `${(Math.abs(Number(b.preventive)) / max) * 100}%`,
                        }}
                      />
                    </span>
                    <span>{b.label}</span>
                    <span className="inventory-month-total">
                      {money(
                        (
                          b.preventive +
                          b.corrective +
                          b.unclassified
                        ).toString(),
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-state">
              Sin costos registrados en este periodo.
            </p>
          )}
          <p className="muted">
            Las barras muestran la magnitud del importe neto; los valores
            negativos corresponden a retornos y llevan signo en la etiqueta y la
            tabla. Los costos regularizados se detallan por operación. Los tipos
            sin clasificación conocida no se asignan a Preventivo o Correctivo.
          </p>
          <div className="hub-ops-card__head mt-4">
            <h3>Operaciones de {detail.label}</h3>
            <span aria-live="polite">
              {money(
                (
                  detail.preventive +
                  detail.corrective +
                  detail.unclassified
                ).toString(),
              )}
              {detail.pending ? " · Incompleto" : ""}
            </span>
          </div>
          {detail.rows.length ? (
            <ul className="inventory-cost-operations">
              {detail.rows.map((op) => (
                <li key={op.id}>
                  <div>
                    <strong>
                      {op.kind === "RETURN"
                        ? "Retorno de refacciones"
                        : etiquetaTipoVisita(
                            history.find((v) => v.id === op.visitaId)?.tipo ??
                              null,
                          )}
                    </strong>
                    <p className="muted">
                      {op.qty} pza ·{" "}
                      {new Date(op.effectiveAt).toLocaleDateString("es-MX")}
                      {op.revisions.length ? " · Regularizado" : ""}
                    </p>
                    <span>
                      {op.kind === "RETURN" ? "− " : ""}
                      {money(op.netCents)}
                    </span>
                  </div>
                  {op.visitaId ? (
                    <Link href={`/unidades/${unidadId}/visitas/${op.visitaId}`}>
                      Ver orden
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Sin costos registrados en este mes.
              {detail.pending
                ? " Hay consumos cuyo costo aún no se conoce."
                : ""}
            </p>
          )}
          <details className="mt-3">
            <summary>Ver datos de la gráfica</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Preventivo</th>
                    <th>Correctivo</th>
                    <th>Sin clasificar</th>
                    <th>Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((b) => (
                    <tr key={b.key}>
                      <td>{b.label}</td>
                      <td>{money(b.preventive.toString())}</td>
                      <td>{money(b.corrective.toString())}</td>
                      <td>{money(b.unclassified.toString())}</td>
                      <td>{b.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
