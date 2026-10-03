"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { ListFilter } from "@/components/ListFilter";
import { api, HttpError } from "@/lib/api";
import type {
  ControlTowerResponse,
  ControlTowerRow,
  Role,
  TowerCheckState,
  TowerPhysicalState,
  TowerReadiness,
  TowerUrgency,
} from "@/lib/types";

type Props = { role: Role; userId?: string };
type UrgencyFilter = "ALL" | TowerUrgency;

const URGENCY_OPTIONS: { id: UrgencyFilter; label: string }[] = [
  { id: "ALL", label: "Todas" },
  { id: "CRITICAL", label: "Críticas" },
  { id: "ATTENTION", label: "Atención" },
  { id: "NORMAL", label: "Normal" },
];

const LABELS = {
  physical: {
    EN_PATIO: "En patio",
    EN_RUTA: "En ruta",
    EN_TALLER: "En taller",
    INACTIVA: "Inactiva",
  } satisfies Record<TowerPhysicalState, string>,
  readiness: {
    LISTA: "Lista",
    PENDIENTE: "Pendiente",
    BLOQUEADA: "Bloqueada",
    DESPACHADA: "Despachada",
  } satisfies Record<TowerReadiness, string>,
  check: {
    APTA: "Apta",
    APTA_CON_OBSERVACION: "Apta con observación",
    NO_APTA: "No apta",
    EN_PROGRESO: "En progreso",
    REQUERIDO: "Requerido",
  } satisfies Record<TowerCheckState, string>,
};

function badgeForUrgency(value: TowerUrgency) {
  if (value === "CRITICAL") return <Badge variant="danger">Crítica</Badge>;
  if (value === "ATTENTION") return <Badge variant="warning">Atención</Badge>;
  return <Badge variant="muted">Normal</Badge>;
}

function badgeForReadiness(value: TowerReadiness) {
  if (value === "LISTA") return <Badge variant="success">Lista</Badge>;
  if (value === "BLOQUEADA") return <Badge variant="danger">Bloqueada</Badge>;
  if (value === "DESPACHADA") return <Badge variant="info">Despachada</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

function Causes({ row }: { row: ControlTowerRow }) {
  if (!row.activeCauses.length)
    return <span className="text-muted-foreground">Sin causas activas</span>;
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-sm py-2 text-xs font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <ChevronRight
          className="mr-1 size-3 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden
        />
        <span>
          {row.activeCauses[0].message}
          {row.activeCauses.length > 1
            ? ` · +${row.activeCauses.length - 1}`
            : ""}
        </span>
      </summary>
      <ul className="mt-2 grid gap-1 pl-4 text-xs text-muted-foreground">
        {row.activeCauses.map((cause) => (
          <li key={cause.code}>{cause.message}</li>
        ))}
      </ul>
    </details>
  );
}

export function ControlTowerPanel({ role, userId }: Props) {
  const [data, setData] = useState<ControlTowerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [urgency, setUrgency] = useState<UrgencyFilter>("ALL");
  const [physicalState, setPhysicalState] = useState("");
  const [readiness, setReadiness] = useState("");
  const [checkState, setCheckState] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (urgency !== "ALL") params.set("urgency", urgency);
    if (physicalState) params.set("physicalState", physicalState);
    if (readiness) params.set("readiness", readiness);
    if (checkState) params.set("checkState", checkState);
    try {
      setData(
        await api<ControlTowerResponse>(
          `/logistica/torre-control?${params.toString()}`,
          {
            role,
            userId,
          },
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof HttpError
          ? caught.message
          : "No pudimos actualizar la Torre de control.",
      );
    } finally {
      setLoading(false);
    }
  }, [checkState, physicalState, q, readiness, role, urgency, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const columns = useMemo<ColumnDef<ControlTowerRow, unknown>[]>(
    () => [
      {
        header: "Unidad",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-navy">
              {row.original.identification.numeroInterno}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.identification.placas}
            </p>
          </div>
        ),
      },
      {
        header: "Estado vehículo",
        cell: ({ row }) => (
          <div>
            <p>
              {row.original.physicalState
                ? LABELS.physical[row.original.physicalState]
                : "Sin fuente"}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.physicalSource === "FLOTA_TRANSITION"
                ? "Transición de patio"
                : row.original.physicalSource === "FLOTA_MOVEMENT"
                  ? "Movimiento de patio"
                  : "Fuente no inicializada"}
            </p>
          </div>
        ),
      },
      {
        header: "Habilitación",
        cell: ({ row }) => badgeForReadiness(row.original.readiness),
      },
      {
        header: "CHECK",
        cell: ({ row }) => <span>{LABELS.check[row.original.checkState]}</span>,
      },
      {
        header: "Urgencia",
        cell: ({ row }) => (
          <div className="space-y-1">
            {badgeForUrgency(row.original.urgency)}
            <Causes row={row.original} />
          </div>
        ),
      },
    ],
    [],
  );

  const rows = data?.items ?? [];
  const critical = data?.counts.urgency.CRITICAL ?? 0;
  const attention = data?.counts.urgency.ATTENTION ?? 0;
  const staleCount = rows.filter((row) => row.staleSources.length).length;

  return (
    <section aria-labelledby="tower-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tower-title" className="text-[13px] font-semibold text-navy">
            Torre de control
          </h2>
          <p className="text-sm text-muted-foreground">
            Estado físico, habilitación, CHECK y urgencia se evalúan por
            separado.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className="mr-2 size-4" aria-hidden />
          {loading ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span>
          <strong className="text-foreground">{data?.counts.total ?? 0}</strong>{" "}
          unidades
        </span>
        <span>
          <strong className="text-foreground">{critical}</strong> críticas
        </span>
        <span>
          <strong className="text-foreground">{attention}</strong> con atención
        </span>
        {staleCount ? (
          <span className="text-destructive">
            <strong>{staleCount}</strong> con fuente incompleta
          </span>
        ) : null}
        {data?.asOf ? (
          <span>
            Actualizado{" "}
            {new Intl.DateTimeFormat("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(new Date(data.asOf))}
          </span>
        ) : null}
      </div>

      <ListFilter
        label="Urgencia"
        value={urgency}
        options={URGENCY_OPTIONS}
        onChange={setUrgency}
      />
      <div className="grid gap-2 md:grid-cols-4">
        <Field label="Buscar" htmlFor="tower-q">
          <Input
            id="tower-q"
            placeholder="Unidad o placas…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </Field>
        <Field label="Estado vehículo" htmlFor="tower-physical">
          <NativeSelect
            id="tower-physical"
            value={physicalState}
            onChange={(event) => setPhysicalState(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="EN_PATIO">En patio</option>
            <option value="EN_RUTA">En ruta</option>
            <option value="EN_TALLER">En taller</option>
            <option value="INACTIVA">Inactiva</option>
            <option value="UNAVAILABLE">Sin fuente</option>
          </NativeSelect>
        </Field>
        <Field label="Habilitación" htmlFor="tower-readiness">
          <NativeSelect
            id="tower-readiness"
            value={readiness}
            onChange={(event) => setReadiness(event.target.value)}
          >
            <option value="">Todas</option>
            <option value="LISTA">Lista</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="BLOQUEADA">Bloqueada</option>
            <option value="DESPACHADA">Despachada</option>
          </NativeSelect>
        </Field>
        <Field label="CHECK" htmlFor="tower-check">
          <NativeSelect
            id="tower-check"
            value={checkState}
            onChange={(event) => setCheckState(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="APTA">Apta</option>
            <option value="APTA_CON_OBSERVACION">Apta con observación</option>
            <option value="NO_APTA">No apta</option>
            <option value="EN_PROGRESO">En progreso</option>
            <option value="REQUERIDO">Requerido</option>
          </NativeSelect>
        </Field>
      </div>

      <FormAlert>{error}</FormAlert>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          empty={
            loading
              ? "Cargando Torre…"
              : "No hay unidades que coincidan con los filtros."
          }
        />
      </div>
      <div className="card divide-y md:hidden">
        {rows.map((row) => (
          <article key={row.unidadId} className="space-y-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-navy">
                  {row.identification.numeroInterno}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {row.identification.placas}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs text-muted-foreground">Urgencia</p>
                {badgeForUrgency(row.urgency)}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Estado vehículo
                </dt>
                <dd>
                  {row.physicalState
                    ? LABELS.physical[row.physicalState]
                    : "Sin fuente"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Habilitación</dt>
                <dd>{LABELS.readiness[row.readiness]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CHECK</dt>
                <dd>{LABELS.check[row.checkState]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fuente física</dt>
                <dd>
                  {row.physicalSource === "FLOTA_TRANSITION"
                    ? "Transición de patio"
                    : row.physicalSource === "FLOTA_MOVEMENT"
                      ? "Movimiento de patio"
                      : "No inicializada"}
                </dd>
              </div>
            </dl>
            <Causes row={row} />
          </article>
        ))}
        {!rows.length ? (
          <p className="p-3 text-sm text-muted-foreground">
            {loading
              ? "Cargando Torre…"
              : "No hay unidades que coincidan con los filtros."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
