"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Note, PageHeader } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { RoleGate } from "@/components/RoleGate";
import { OperationalToolbar } from "@/components/OperationalToolbar";
import { useRole } from "@/lib/role";
import {
  ANALYSIS_NAV,
  addDay,
  analysisApi,
  cents,
  hours,
  initialQuery,
  queryFromParams,
  queryParams,
  SYSTEM_LABELS,
  WORK_LABELS,
  type AnalysisData,
  type AnalysisOptions,
  type AnalysisQuery,
  type AnalysisView,
  type CostRecord,
} from "@/lib/maintenance-analysis";
import { MonthlyCostChart, SystemFrequencyChart } from "./AnalysisCharts";
import {
  CostRecordsSection,
  InterventionPairsSection,
  InterventionRecordsSection,
  UnitListSection,
  UnitTable,
} from "./AnalysisTables";
import { ExternalServiceSheet } from "./ExternalServiceSheet";
import { SchedulesSheet } from "./SchedulesSheet";
import { DocumentGroupSheet } from "./DocumentGroupSheet";
import { CostDetailSheet } from "./CostDetailSheet";
import "./analysis.css";

const TITLES: Record<AnalysisView, string> = {
  resumen: "Resumen",
  utilizacion: "Utilización",
  costos: "Costos",
  tendencias: "Tendencias por sistema",
};
export function MaintenanceAnalysisView({ view }: { view: AnalysisView }) {
  const { role, userId } = useRole(),
    router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams(),
    paramsText = params.toString();
  const query = useMemo(
    () => queryFromParams(new URLSearchParams(paramsText)),
    [paramsText],
  );
  const queryKey = JSON.stringify(query);
  const [draft, setDraft] = useState<AnalysisQuery>(query),
    [options, setOptions] = useState<AnalysisOptions | null>(null),
    [data, setData] = useState<AnalysisData | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [optionsError, setOptionsError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [optionsAttempt, setOptionsAttempt] = useState(0);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<"TYPE" | "CONCEPT">("TYPE"),
    [serviceOpen, setServiceOpen] = useState(false),
    [schedulesOpen, setSchedulesOpen] = useState(false),
    [costRecord, setCostRecord] = useState<CostRecord | null>(null);
  useEffect(() => {
    setDraft(query);
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!role || !["SUPERVISOR", "ADMIN_DIRECTIVO"].includes(role)) return;
    const controller = new AbortController();
    setOptionsError("");
    setOptions(null);
    void analysisApi<AnalysisOptions>(role, userId, "/opciones", {
      signal: controller.signal,
    })
      .then(setOptions)
      .catch((e) => {
        if (!controller.signal.aborted)
          setOptionsError(
            e instanceof Error
              ? e.message
              : "No pudimos consultar las opciones.",
          );
      });
    return () => controller.abort();
  }, [role, userId, optionsAttempt]);
  useEffect(() => {
    if (!role || !["SUPERVISOR", "ADMIN_DIRECTIVO"].includes(role)) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    void analysisApi<{ snapshotId: string }>(role, userId, "/consultas", {
      method: "POST",
      body: queryKey,
      signal: controller.signal,
    })
      .then((snapshot) =>
        analysisApi<AnalysisData>(
          role,
          userId,
          `/consultas/${snapshot.snapshotId}/${view}`,
          { signal: controller.signal },
        ),
      )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos cargar el análisis.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [role, userId, queryKey, view, attempt]);
  useEffect(() => {
    if (
      params.get("service") === "new" &&
      options?.capabilities.externalServices
    )
      setServiceOpen(true);
  }, [paramsText, options]); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = ANALYSIS_NAV.find((x) => x.key === view)!;
  function navigate(
    nextView: AnalysisView,
    changes: Partial<AnalysisQuery> = {},
  ) {
    router.push(
      `/analisis-mantenimiento/${nextView}?${queryParams({ ...query, ...changes })}`,
    );
  }
  function apply() {
    router.replace(`${pathname}?${queryParams(draft)}`);
  }
  function refresh() {
    setAttempt((v) => v + 1);
  }
  function selectMonth(month: string) {
    const d = new Date(`${month}-01T12:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    navigate("costos", {
      from: `${month}-01`,
      to: d.toISOString().slice(0, 10),
    });
  }
  function closeService(value: boolean) {
    setServiceOpen(value);
    if (!value && params.has("service"))
      router.replace(`${pathname}?${queryParams(query)}`, { scroll: false });
  }
  const types = options
    ? [
        ...new Map(
          options.units.map((u) => [
            u.typeId,
            { id: u.typeId, label: u.typeName },
          ]),
        ).values(),
      ]
    : [];
  const summary = data?.summary,
    pendingCount =
      (summary?.pendingPartsCount ?? 0) + (summary?.pendingServicesCount ?? 0);
  const nowCut = data
    ? new Date(data.period.to).toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  return (
    <RoleGate allow={["SUPERVISOR", "ADMIN_DIRECTIVO"]}>
      <div className="maintenance-analysis">
        <PageHeader
          title={
            view === "resumen" ? "Análisis de mantenimiento" : TITLES[view]
          }
          lede={
            view === "resumen"
              ? "Revisión semanal y contexto mensual de la flota."
              : view === "utilizacion"
                ? "Tiempo registrado, horario esperado y cobertura del periodo."
                : view === "costos"
                  ? "Refacciones y servicios externos, con sus registros de origen."
                  : "Frecuencia, gasto y kilometraje entre intervenciones."
          }
          actions={
            <>
              {view === "costos" && options?.capabilities.externalServices && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setDocumentOpen(true)}
                >
                  Documento distribuido
                </Button>
              )}
              {view === "costos" && options?.capabilities.externalServices && (
                <Button type="button" onClick={() => setServiceOpen(true)}>
                  Registrar servicio externo
                </Button>
              )}
              {view === "utilizacion" && options && (
                <Button
                  type="button"
                  variant={
                    options.capabilities.configureSchedules
                      ? "default"
                      : "secondary"
                  }
                  onClick={() => setSchedulesOpen(true)}
                >
                  {options.capabilities.configureSchedules
                    ? "Configurar horarios"
                    : "Consultar horarios"}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={refresh}
              >
                {busy ? "Consultando…" : "Actualizar"}
              </Button>
            </>
          }
        />
        <div className="analysis-mobile-location">
          <Field label="Sección de análisis" htmlFor="analysis-section">
            <NativeSelect
              id="analysis-section"
              value={selected.key}
              onChange={(e) => navigate(e.target.value as AnalysisView)}
            >
              {ANALYSIS_NAV.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <OperationalToolbar
            label="Filtros del análisis"
            className="analysis-toolbar"
          >
            <Field label="Desde" htmlFor="analysis-from">
              <Input
                id="analysis-from"
                type="date"
                value={draft.from}
                required
                onChange={(e) =>
                  setDraft((q) => ({ ...q, from: e.target.value }))
                }
              />
            </Field>
            <Field label="Hasta" htmlFor="analysis-to">
              <Input
                id="analysis-to"
                type="date"
                value={addDay(draft.to, -1)}
                required
                onChange={(e) => {
                  if (e.target.value)
                    setDraft((q) => ({ ...q, to: addDay(e.target.value, 1) }));
                }}
              />
            </Field>
            <Field label="Tipo de unidad" htmlFor="analysis-unit-type">
              <NativeSelect
                id="analysis-unit-type"
                value={draft.unitTypeIds?.[0] ?? ""}
                onChange={(e) =>
                  setDraft((q) => ({
                    ...q,
                    unitTypeIds: e.target.value ? [e.target.value] : undefined,
                    unitIds: undefined,
                  }))
                }
              >
                <option value="">Todos los tipos</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Unidad" htmlFor="analysis-unit">
              <NativeSelect
                id="analysis-unit"
                value={draft.unitIds?.[0] ?? ""}
                onChange={(e) =>
                  setDraft((q) => ({
                    ...q,
                    unitIds: e.target.value ? [e.target.value] : undefined,
                  }))
                }
              >
                <option value="">Todas las unidades</option>
                {options?.units
                  .filter(
                    (u) =>
                      !draft.unitTypeIds ||
                      draft.unitTypeIds.includes(u.typeId),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} · {u.plates}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Mantenimiento" htmlFor="analysis-type">
              <NativeSelect
                id="analysis-type"
                value={draft.maintenanceTypes?.[0] ?? ""}
                onChange={(e) =>
                  setDraft((q) => ({
                    ...q,
                    maintenanceTypes: e.target.value
                      ? [e.target.value]
                      : undefined,
                  }))
                }
              >
                <option value="">Todos los tipos</option>
                <option value="PREVENTIVE">Preventivo</option>
                <option value="CORRECTIVE">Correctivo</option>
                <option value="UNKNOWN">Sin clasificar</option>
              </NativeSelect>
            </Field>
            {(view === "tendencias" || view === "costos" || draft.systems) && (
              <Field label="Sistema" htmlFor="analysis-system">
                <NativeSelect
                  id="analysis-system"
                  value={draft.systems?.[0] ?? ""}
                  onChange={(e) =>
                    setDraft((q) => ({
                      ...q,
                      systems: e.target.value ? [e.target.value] : undefined,
                    }))
                  }
                >
                  <option value="">Todos los sistemas</option>
                  {Object.entries(SYSTEM_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {(view === "tendencias" || draft.workKinds) && (
              <Field label="Intervención" htmlFor="analysis-work">
                <NativeSelect
                  id="analysis-work"
                  value={draft.workKinds?.[0] ?? ""}
                  onChange={(e) =>
                    setDraft((q) => ({
                      ...q,
                      workKinds: e.target.value ? [e.target.value] : undefined,
                    }))
                  }
                >
                  <option value="">Todos los trabajos</option>
                  {Object.entries(WORK_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field label="Ordenar unidades" htmlFor="analysis-sort">
              <NativeSelect
                id="analysis-sort"
                value={draft.sort ?? "COST"}
                onChange={(e) =>
                  setDraft((q) => ({ ...q, sort: e.target.value }))
                }
              >
                <option value="COST">Mayor costo conocido</option>
                <option value="CORRECTIVE">Más correctivos</option>
                <option value="TRIP">Más tiempo en viaje</option>
                <option value="UNIT">Unidad</option>
              </NativeSelect>
            </Field>
            <div className="analysis-toolbar-actions">
              <Button type="submit" variant="secondary" disabled={busy}>
                Aplicar filtros
              </Button>
              <Button
                type="button"
                variant="quiet"
                disabled={busy}
                onClick={() =>
                  router.replace(`${pathname}?${queryParams(initialQuery())}`)
                }
              >
                Restablecer
              </Button>
            </div>
          </OperationalToolbar>
        </form>
        {optionsError && (
          <div className="analysis-error">
            <FormAlert>{optionsError}</FormAlert>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOptionsAttempt((n) => n + 1)}
            >
              Reintentar opciones
            </Button>
          </div>
        )}
        {error && (
          <div className="analysis-error">
            <FormAlert>{error}</FormAlert>
            <Button type="button" variant="secondary" onClick={refresh}>
              Reintentar análisis
            </Button>
          </div>
        )}
        {busy && (
          <p className="muted" role="status">
            Cargando análisis del periodo…
          </p>
        )}
        {data && summary && (
          <>
            <p className="analysis-cutoff">
              Periodo seleccionado: {data.period.requestedFrom} a{" "}
              {addDay(data.period.requestedTo, -1)} · corte al {nowCut}, hora de
              México.
            </p>
            {data.refreshPending && (
              <Note variant="warn">
                Hay registros más recientes que esta consulta. Actualiza para
                recalcular conservando tus filtros.
              </Note>
            )}
            <dl className="analysis-summary">
              <div>
                <dt>Costo conocido</dt>
                <dd>{cents(summary.netCents)}</dd>
                <span>Sin IVA · periodo seleccionado</span>
              </div>
              <div>
                <dt>Viaje registrado</dt>
                <dd>{hours(summary.registeredTripSeconds)}</dd>
                <span>Logística · periodo seleccionado</span>
              </div>
              <div>
                <dt>Órdenes abiertas</dt>
                <dd>{summary.openOrders ?? "No disponible"}</dd>
                <span>Al corte del periodo</span>
              </div>
              <div>
                <dt>Costos pendientes</dt>
                <dd>{pendingCount}</dd>
                <span>
                  {summary.pendingPartsCount} refacciones ·{" "}
                  {summary.pendingServicesCount} servicios
                </span>
              </div>
            </dl>
            {(pendingCount > 0 || summary.reconciliationCount > 0) && (
              <Note variant="warn">
                Costo parcial: {pendingCount} pendientes de costear
                {summary.reconciliationCount
                  ? ` y ${summary.reconciliationCount} registros en conciliación`
                  : ""}
                . Los importes faltantes no se consideran cero.
              </Note>
            )}
            {query.workKinds && (
              <Note>
                Este filtro incluye costos atribuidos explícitamente a ese tipo
                de trabajo. Las refacciones y servicios sin atribución de
                trabajo quedan fuera; no se distribuyen por estimación.
              </Note>
            )}
            {data.coverage.errors.length > 0 && (
              <Note variant="warn">
                No pudimos consultar todas las fuentes. Los resultados conocidos
                son parciales; actualiza para reintentar.
              </Note>
            )}
            {view === "resumen" && (
              <>
                <section className="analysis-panel">
                  <div className="analysis-section-heading">
                    <div>
                      <h2>Unidades para revisar</h2>
                      <p>
                        Costo conocido, correctivos y motivos observables del
                        periodo.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => navigate("costos")}
                    >
                      Ver todas
                    </Button>
                  </div>
                  <UnitTable
                    rows={data.units}
                    onUnit={(id) => navigate("costos", { unitIds: [id] })}
                  />
                  <p className="analysis-caption">
                    * Costo parcial. Intervenciones repetidas es una señal para
                    revisar, no una declaración de falla.
                  </p>
                </section>
                <div className="analysis-chart-panel">
                  {data.monthly && (
                    <MonthlyCostChart
                      cutoff={data.periods.monthly.to}
                      rows={data.monthly}
                      onMonth={selectMonth}
                    />
                  )}
                  {data.frequencies && (
                    <SystemFrequencyChart
                      rows={data.frequencies}
                      onSystem={(system) =>
                        navigate("tendencias", { systems: [system] })
                      }
                    />
                  )}
                </div>
                <p className="analysis-caption">
                  La tendencia mensual tiene su propio alcance temporal. La
                  utilización porcentual requiere historial completo de
                  operación e indisponibilidad.
                </p>
              </>
            )}
            {view === "costos" && (
              <>
                <div className="analysis-chart-panel analysis-chart-panel--single">
                  {data.monthly && (
                    <MonthlyCostChart
                      cutoff={data.periods.monthly.to}
                      rows={data.monthly}
                      onMonth={selectMonth}
                      breakdown={breakdown}
                      onBreakdown={setBreakdown}
                    />
                  )}
                </div>
                <section className="analysis-panel">
                  <div className="analysis-section-heading">
                    <div>
                      <h2>Composición del costo</h2>
                      <p>
                        {breakdown === "TYPE"
                          ? "Tipo de mantenimiento"
                          : "Origen del costo"}{" "}
                        · sin IVA
                      </p>
                    </div>
                  </div>
                  <div className="analysis-composition">
                    {(breakdown === "TYPE"
                      ? data.breakdown?.type
                      : data.breakdown?.concept
                    )?.map((row) => (
                      <div key={row.key}>
                        {breakdown === "TYPE" ? (
                          <span>
                            <span
                              className={`analysis-type-dot ${row.key.toLowerCase()}`}
                            />
                            {row.key === "PREVENTIVE"
                              ? "Preventivo"
                              : row.key === "CORRECTIVE"
                                ? "Correctivo"
                                : "Sin clasificar"}
                          </span>
                        ) : (
                          <span>
                            {row.key === "PARTS"
                              ? "Refacciones"
                              : "Servicios externos"}
                          </span>
                        )}
                        <strong>{cents(row.netCents)}</strong>
                        {row.pending > 0 && (
                          <span className="muted">
                            {row.pending} pendientes
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="analysis-caption">
                    Neto conocido: {cents(summary.netCents)} · IVA completo:{" "}
                    {cents(summary.taxCents)} · Total con IVA completo:{" "}
                    {cents(summary.totalCents)}. Un IVA desconocido no se
                    presume cero.
                  </p>
                </section>
                <UnitListSection
                  snapshotId={data.snapshotId}
                  onUnit={(id) => navigate("costos", { unitIds: [id] })}
                />
                <CostRecordsSection
                  snapshotId={data.snapshotId}
                  onSelect={setCostRecord}
                />
                <p className="analysis-caption">
                  Costo conocido/km: {cents(summary.knownCostPerKmCents)}.{" "}
                  {summary.excludedUnitCount} unidades sin lecturas suficientes
                  del periodo quedan fuera de esa comparación.
                </p>
              </>
            )}
            {view === "utilizacion" && (
              <>
                <Note>
                  No hay historial suficiente para calcular disponibilidad,
                  causas de paro y utilización porcentual del periodo. Se
                  muestran las horas de viaje registradas; un horario
                  configurado por sí solo no completa la evidencia.
                </Note>
                <UnitListSection
                  snapshotId={data.snapshotId}
                  utilization
                  onUnit={(id) => navigate("utilizacion", { unitIds: [id] })}
                />
                <section className="analysis-panel">
                  <h2>Cómo leer estos tiempos</h2>
                  <dl className="analysis-explanation">
                    <div>
                      <dt>Viaje registrado</dt>
                      <dd>
                        Intervalos de salida y regreso de Logística. No prueban
                        movimiento físico ni horas productivas.
                      </dd>
                    </div>
                    <div>
                      <dt>Horario esperado</dt>
                      <dd>
                        Configuración vigente cuando se conoce para todo el
                        periodo. La ausencia de horario no significa operación
                        continua.
                      </dd>
                    </div>
                    <div>
                      <dt>Sin clasificar</dt>
                      <dd>
                        Tiempo restante sin evidencia suficiente; no equivale a
                        disponible sin uso ni a un paro.
                      </dd>
                    </div>
                  </dl>
                </section>
              </>
            )}
            {view === "tendencias" && (
              <>
                <div className="analysis-chart-panel analysis-chart-panel--single">
                  {data.frequencies && (
                    <SystemFrequencyChart
                      rows={data.frequencies}
                      onSystem={(system) =>
                        navigate("tendencias", { systems: [system] })
                      }
                    />
                  )}
                </div>
                <InterventionRecordsSection snapshotId={data.snapshotId} />
                <InterventionPairsSection snapshotId={data.snapshotId} />
                <section className="analysis-panel">
                  <h2>Apoyo para planear mantenimiento</h2>
                  <p className="muted">
                    Umbrales y condición actuales, consultados el{" "}
                    {new Date(data.periods.planning.asOf).toLocaleDateString(
                      "es-MX",
                      { timeZone: "America/Mexico_City" },
                    )}
                    ; no son una agenda ni una predicción.
                  </p>
                  <div className="analysis-table-scroll">
                    <table>
                      <caption>
                        Distancia y días al umbral de mantenimiento vigente
                      </caption>
                      <thead>
                        <tr>
                          <th>Unidad</th>
                          <th>Km al umbral</th>
                          <th>Días al umbral</th>
                          <th>Consulta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.units.map((u) => (
                          <tr key={u.id}>
                            <th>{u.label}</th>
                            <td>
                              {u.remainingKm === null
                                ? "Sin lectura suficiente"
                                : u.remainingKm.toLocaleString("es-MX")}
                            </td>
                            <td>
                              {u.remainingDays ?? "Sin historial suficiente"}
                            </td>
                            <td>
                              <Link
                                className="analysis-link"
                                href={`/unidades/${u.id}`}
                              >
                                Ficha de unidad
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <p className="analysis-caption">
                  El equipo interpreta posibles causas como carga, ruta o
                  pavimento. La repetición de un trabajo no demuestra una
                  reparación fallida.
                </p>
              </>
            )}
            <details className="analysis-method">
              <summary>Criterios y cobertura de los datos</summary>
              <p>
                Costos: refacciones consumidas y servicios externos concluidos;
                sin mano de obra interna. Los retornos conservan su fecha
                efectiva y pueden generar ajustes negativos. Los servicios se
                reconocen al concluir y las piezas propias al consumirse.
              </p>
              <p>
                Frecuencia: intervenciones concluidas por sistema; una orden con
                varios sistemas participa en cada uno. Revisión/ajuste no
                equivale a reparación ni cambio. Una revisión operativa de la
                unidad no se cuenta como mantenimiento.
              </p>
              <p>
                Sin clasificar: {data.coverage.unclassifiedCount} registros de
                tipo; sin desglose de sistema:{" "}
                {data.coverage.undistributedCount}. Neto conocido con IVA
                desconocido conserva su importe sin inventar el impuesto.
              </p>
              <p>
                Consulta creada:{" "}
                {new Date(data.capturedAt).toLocaleString("es-MX", {
                  timeZone: "America/Mexico_City",
                })}
                . Los cambios posteriores aparecen al actualizar; la consulta
                conserva sus cifras mientras revisas el detalle.
              </p>
            </details>
          </>
        )}
        {options && (
          <ExternalServiceSheet
            open={serviceOpen}
            onOpenChange={closeService}
            options={options}
            presetUnit={query.unitIds?.[0]}
            onSaved={refresh}
          />
        )}
        {options && (
          <SchedulesSheet
            open={schedulesOpen}
            onOpenChange={setSchedulesOpen}
            options={options}
            onSaved={refresh}
          />
        )}
        {documentOpen && options && (
          <DocumentGroupSheet
            options={options}
            onClose={() => setDocumentOpen(false)}
            onSaved={refresh}
          />
        )}
        {costRecord && (
          <CostDetailSheet
            record={costRecord}
            canCorrect={options?.capabilities.correctCosts ?? false}
            onClose={() => setCostRecord(null)}
            onSaved={refresh}
          />
        )}
      </div>
    </RoleGate>
  );
}
