"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Note } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRole } from "@/lib/role";
import {
  addDay,
  analysisApi,
  localDay,
  type AnalysisOptions,
  type Schedule,
} from "@/lib/maintenance-analysis";
import { useAnalysisCommand } from "./useAnalysisCommand";
type Slot = { start: string; end: string; endDayOffset: number };
const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export function SchedulesSheet({
  open,
  onOpenChange,
  options,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  options: AnalysisOptions;
  onSaved: () => void;
}) {
  const { role, userId } = useRole(),
    command = useAnalysisCommand(role, userId, "/horarios");
  const [rules, setRules] = useState<Schedule[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [facilityId, setFacilityId] = useState(options.facilities[0] ?? ""),
    [scope, setScope] = useState("GENERAL"),
    [scopeRef, setScopeRef] = useState(""),
    [validOn, setValidOn] = useState(""),
    [reason, setReason] = useState("");
  const [weekly, setWeekly] = useState<Record<string, Slot[]>>({}),
    [exceptions, setExceptions] = useState<{ date: string; slots: Slot[] }[]>(
      [],
    );
  useEffect(() => {
    if (!open || !role) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void analysisApi<Schedule[]>(role, userId, "/horarios", {
      signal: controller.signal,
    })
      .then(setRules)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos consultar horarios.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [open, role, userId]);
  const admin = options.capabilities.configureSchedules,
    locked = command.busy || Boolean(command.pending);
  const types = [
    ...new Map(
      options.units
        .filter((u) => u.facilityId === facilityId)
        .map((u) => [u.typeId, { id: u.typeId, label: u.typeName }]),
    ).values(),
  ];
  const current = rules
    .filter(
      (r) =>
        r.facilityId === facilityId &&
        r.scope === scope &&
        r.scopeRef === (scope === "GENERAL" ? "GENERAL" : scopeRef),
    )
    .sort((a, b) => b.version - a.version)[0];
  function edit(day: string, index: number, delta: Partial<Slot>) {
    setWeekly((v) => ({
      ...v,
      [day]: (v[day] ?? []).map((slot, i) =>
        i === index ? { ...slot, ...delta } : slot,
      ),
    }));
  }
  async function save() {
    setError("");
    if (
      exceptions.some((e) => !e.date) ||
      new Set(exceptions.map((e) => e.date)).size !== exceptions.length
    ) {
      setError("Selecciona fechas distintas para las excepciones.");
      return;
    }
    const payload = {
      facilityId,
      scope,
      ...(scope !== "GENERAL" ? { scopeRef } : {}),
      expectedVersion: current?.version ?? 0,
      ...(validOn ? { validFrom: validOn } : {}),
      schedule: {
        weeklyDays: weekly,
        dateOverrides: Object.fromEntries(
          exceptions.map((e) => [e.date, e.slots]),
        ),
      },
      reason,
    };
    const result = await command.execute(payload);
    if (result) {
      onOpenChange(false);
      onSaved();
      setReason("");
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!command.busy) onOpenChange(value);
      }}
    >
      <SheetContent side="right" className="analysis-form-sheet">
        <SheetHeader>
          <SheetTitle>Horarios de operación</SheetTitle>
          <SheetDescription>
            Horarios esperados para el análisis. No modifican revisiones,
            permisos de salida ni disponibilidad.
          </SheetDescription>
        </SheetHeader>
        <form
          className="analysis-sheet-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="analysis-sheet-body">
            <FormAlert>{error || command.error}</FormAlert>
            {busy && (
              <p role="status" className="muted">
                Consultando horarios…
              </p>
            )}
            {rules.length > 0 ? (
              <details open={!admin}>
                <summary>
                  Consultar vigencias registradas ({rules.length})
                </summary>
                <div className="analysis-table-scroll">
                  <table>
                    <caption>Horarios y sus vigencias</caption>
                    <thead>
                      <tr>
                        <th>Instalación / alcance</th>
                        <th>Vigente desde</th>
                        <th>Hasta</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.facilityId} ·{" "}
                            {r.scope === "GENERAL"
                              ? "General"
                              : r.scope === "TYPE"
                                ? (types.find((x) => x.id === r.scopeRef)
                                    ?.label ?? "Tipo de unidad")
                                : (options.units.find(
                                    (x) => x.id === r.scopeRef,
                                  )?.label ?? "Unidad")}
                          </td>
                          <td>
                            {new Date(r.validFrom).toLocaleString("es-MX", {
                              timeZone: "America/Mexico_City",
                            })}
                          </td>
                          <td>
                            {r.validTo
                              ? new Date(r.validTo).toLocaleString("es-MX", {
                                  timeZone: "America/Mexico_City",
                                })
                              : "Abierta"}
                          </td>
                          <td>
                            {r.reason}
                            <details>
                              <summary>Ver franjas y excepciones</summary>
                              {DAYS.map((day, i) => (
                                <p key={day}>
                                  {day}:{" "}
                                  {(r.data.weeklyDays[String(i + 1)] ?? [])
                                    .map(
                                      (s) =>
                                        `${s.start}–${s.end}${s.endDayOffset ? " (+1 día)" : ""}`,
                                    )
                                    .join(", ") || "No laborable"}
                                </p>
                              ))}
                              {Object.entries(r.data.dateOverrides).map(
                                ([date, slots]) => (
                                  <p key={date}>
                                    {date}:{" "}
                                    {slots
                                      .map(
                                        (s) =>
                                          `${s.start}–${s.end}${s.endDayOffset ? " (+1 día)" : ""}`,
                                      )
                                      .join(", ") || "No laborable"}
                                  </p>
                                ),
                              )}
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : (
              !busy && (
                <p className="analysis-empty">
                  No hay horarios configurados. La ausencia de horario no
                  significa operación continua.
                </p>
              )
            )}
            {!admin ? (
              <Note>
                Solo Directivo puede configurar. Solicita el ajuste mediante el
                canal habitual.
              </Note>
            ) : (
              <>
                {command.pending && (
                  <Note variant="warn">
                    Hay un guardado pendiente de confirmación. Reintenta la
                    misma operación.
                  </Note>
                )}
                <fieldset
                  disabled={locked || busy}
                  className="analysis-form-fields"
                >
                  <legend>Nueva vigencia</legend>
                  <Field label="Instalación" htmlFor="schedule-facility">
                    <NativeSelect
                      id="schedule-facility"
                      value={facilityId}
                      onChange={(e) => {
                        setFacilityId(e.target.value);
                        setScopeRef("");
                      }}
                    >
                      {options.facilities.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Aplicar a" htmlFor="schedule-scope">
                    <NativeSelect
                      id="schedule-scope"
                      value={scope}
                      onChange={(e) => {
                        setScope(e.target.value);
                        setScopeRef("");
                      }}
                    >
                      <option value="GENERAL">Horario general</option>
                      <option value="TYPE">Un tipo de unidad</option>
                      <option value="UNIT">Una unidad</option>
                    </NativeSelect>
                  </Field>
                  {scope !== "GENERAL" && (
                    <Field
                      label={scope === "TYPE" ? "Tipo de unidad" : "Unidad"}
                      htmlFor="schedule-ref"
                    >
                      <NativeSelect
                        id="schedule-ref"
                        required
                        value={scopeRef}
                        onChange={(e) => setScopeRef(e.target.value)}
                      >
                        <option value="">Selecciona</option>
                        {scope === "TYPE"
                          ? types.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))
                          : options.units
                              .filter((u) => u.facilityId === facilityId)
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.label}
                                </option>
                              ))}
                      </NativeSelect>
                    </Field>
                  )}
                  <p className="muted">
                    La excepción de unidad tiene prioridad sobre tipo y general.
                    Define el horario completo de este alcance.
                  </p>
                  {DAYS.map((label, i) => {
                    const key = String(i + 1),
                      slots = weekly[key] ?? [];
                    return (
                      <div className="analysis-schedule-day" key={key}>
                        <div className="analysis-section-heading">
                          <h3>{label}</h3>
                          <Button
                            type="button"
                            variant="quiet"
                            disabled={slots.length >= 8}
                            onClick={() =>
                              setWeekly((v) => ({
                                ...v,
                                [key]: [
                                  ...(v[key] ?? []),
                                  {
                                    start: "08:00",
                                    end: "17:00",
                                    endDayOffset: 0,
                                  },
                                ],
                              }))
                            }
                          >
                            Agregar franja
                          </Button>
                        </div>
                        {!slots.length && <p className="muted">No laborable</p>}
                        {slots.map((slot, index) => (
                          <div key={index} className="analysis-schedule-slot">
                            <Field
                              label="Desde"
                              htmlFor={`schedule-${key}-${index}-start`}
                            >
                              <Input
                                id={`schedule-${key}-${index}-start`}
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  edit(key, index, { start: e.target.value })
                                }
                                required
                              />
                            </Field>
                            <Field
                              label="Hasta"
                              htmlFor={`schedule-${key}-${index}-end`}
                            >
                              <Input
                                id={`schedule-${key}-${index}-end`}
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  edit(key, index, { end: e.target.value })
                                }
                                required
                              />
                            </Field>
                            <label className="analysis-check">
                              <input
                                type="checkbox"
                                checked={slot.endDayOffset === 1}
                                onChange={(e) =>
                                  edit(key, index, {
                                    endDayOffset: e.target.checked ? 1 : 0,
                                  })
                                }
                              />{" "}
                              Termina al día siguiente
                            </label>
                            <Button
                              type="button"
                              variant="quiet"
                              onClick={() =>
                                setWeekly((v) => ({
                                  ...v,
                                  [key]: v[key].filter((_, at) => at !== index),
                                }))
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <section className="analysis-form-section">
                    <h3>Excepciones por fecha</h3>
                    <p className="muted">
                      Una fecha sin franjas se considera no laborable y
                      sustituye su día habitual.
                    </p>
                    {exceptions.map((exception, i) => (
                      <div className="analysis-form-line" key={i}>
                        <Field
                          label="Fecha de excepción"
                          htmlFor={`exception-${i}`}
                        >
                          <Input
                            id={`exception-${i}`}
                            type="date"
                            value={exception.date}
                            min={localDay()}
                            onChange={(e) =>
                              setExceptions((rows) =>
                                rows.map((x, j) =>
                                  j === i ? { ...x, date: e.target.value } : x,
                                ),
                              )
                            }
                            required
                          />
                        </Field>
                        {exception.slots.map((slot, j) => (
                          <div className="analysis-form-grid" key={j}>
                            <Field
                              label="Desde"
                              htmlFor={`exception-${i}-${j}-start`}
                            >
                              <Input
                                id={`exception-${i}-${j}-start`}
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  setExceptions((rows) =>
                                    rows.map((x, a) =>
                                      a === i
                                        ? {
                                            ...x,
                                            slots: x.slots.map((s, b) =>
                                              b === j
                                                ? {
                                                    ...s,
                                                    start: e.target.value,
                                                  }
                                                : s,
                                            ),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </Field>
                            <Field
                              label="Hasta"
                              htmlFor={`exception-${i}-${j}-end`}
                            >
                              <Input
                                id={`exception-${i}-${j}-end`}
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  setExceptions((rows) =>
                                    rows.map((x, a) =>
                                      a === i
                                        ? {
                                            ...x,
                                            slots: x.slots.map((s, b) =>
                                              b === j
                                                ? { ...s, end: e.target.value }
                                                : s,
                                            ),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </Field>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              setExceptions((rows) =>
                                rows.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        slots: x.slots.length
                                          ? []
                                          : [
                                              {
                                                start: "08:00",
                                                end: "17:00",
                                                endDayOffset: 0,
                                              },
                                            ],
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            {exception.slots.length
                              ? "Marcar no laborable"
                              : "Definir franja"}
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            onClick={() =>
                              setExceptions((rows) =>
                                rows.filter((_, j) => i !== j),
                              )
                            }
                          >
                            Quitar excepción
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={exceptions.length >= 366}
                      onClick={() =>
                        setExceptions((x) => [...x, { date: "", slots: [] }])
                      }
                    >
                      Agregar excepción
                    </Button>
                  </section>
                  <Field
                    label="Vigente desde (fecha de México, opcional)"
                    htmlFor="schedule-valid"
                  >
                    <Input
                      id="schedule-valid"
                      type="date"
                      min={addDay(localDay(), 1)}
                      value={validOn}
                      onChange={(e) => setValidOn(e.target.value)}
                    />
                  </Field>
                  <p className="muted">
                    Vacío inicia al confirmar. No modifica horarios pasados.
                  </p>
                  <Field label="Motivo" htmlFor="schedule-reason">
                    <Input
                      id="schedule-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      maxLength={1000}
                    />
                  </Field>
                </fieldset>
              </>
            )}
          </div>
          <SheetFooter className="analysis-sheet-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={command.busy}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {admin && (
              <Button
                type={command.pending ? "button" : "submit"}
                disabled={
                  command.busy || busy || !options.capabilities.schedules
                }
                onClick={command.pending ? () => void save() : undefined}
              >
                {command.busy
                  ? "Confirmando…"
                  : command.pending
                    ? "Reintentar misma operación"
                    : "Guardar nueva vigencia"}
              </Button>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
