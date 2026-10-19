"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Note } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
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
  analysisApi,
  cents,
  localDay,
  SYSTEM_LABELS,
  WORK_LABELS,
  type AnalysisOptions,
} from "@/lib/maintenance-analysis";
import { MaintenanceTypeBadge } from "@/components/MaintenanceTypeBadge";
import { useAnalysisCommand } from "./useAnalysisCommand";

type WorkDraft = {
  id: string;
  system: string;
  workCode: string;
  workKind: string;
  orderWorkRef?: string;
};
type CostDraft = {
  workRef: string;
  id: string;
  system: string;
  mode: string;
  pending: boolean;
  amount: string;
  taxMode: string;
  taxed: boolean;
  rate: string;
  zeroReason: string;
  sourceOpId: string;
  quantity: string;
};
type UnitContext = {
  orders: {
    id: string;
    maintenanceType: string;
    status: string;
    works: { id: string; categoria: string; item: string }[];
  }[];
  externalParts: {
    id: string;
    version: number;
    qty: number;
    netCents: string | null;
    label: string;
    availableRanges: { from: number; to: number }[];
  }[];
};
const newWork = (): WorkDraft => ({
  id: crypto.randomUUID(),
  system: "",
  workCode: "",
  workKind: "",
});
const newCost = (): CostDraft => ({
  workRef: "",
  id: crypto.randomUUID(),
  system: "",
  mode: "SERVICE_ONLY",
  pending: true,
  amount: "",
  taxMode: "INCLUDED",
  taxed: true,
  rate: "16",
  zeroReason: "",
  sourceOpId: "",
  quantity: "",
});
export function decimalCents(value: string): string {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match)
    throw new Error(
      "Indica el importe con un máximo de dos decimales, sin separadores de miles.",
    );
  return BigInt(`${match[1]}${(match[2] ?? "").padEnd(2, "0")}`).toString();
}
export function ExternalServiceSheet({
  open,
  onOpenChange,
  options,
  presetUnit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  options: AnalysisOptions;
  presetUnit?: string;
  onSaved: () => void;
}) {
  const { role, userId } = useRole();
  const command = useAnalysisCommand(role, userId, "/servicios-externos");
  const [unitId, setUnitId] = useState(presetUnit ?? ""),
    [provider, setProvider] = useState(""),
    [performedOn, setPerformedOn] = useState(localDay()),
    [startedOn, setStartedOn] = useState(""),
    [type, setType] = useState(""),
    [orderId, setOrderId] = useState(""),
    [reference, setReference] = useState(""),
    [note, setNote] = useState("");
  const [works, setWorks] = useState<WorkDraft[]>([newWork()]),
    [costs, setCosts] = useState<CostDraft[]>([newCost()]);
  const [context, setContext] = useState<UnitContext | null>(null),
    [contextBusy, setContextBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open && presetUnit) setUnitId(presetUnit);
  }, [open, presetUnit]);
  useEffect(() => {
    if (!open || !unitId || !role) {
      setContext(null);
      return;
    }
    const controller = new AbortController();
    setContextBusy(true);
    setContext(null);
    setError("");
    void analysisApi<UnitContext>(
      role,
      userId,
      `/unidades/${unitId}/contexto`,
      { signal: controller.signal },
    )
      .then(setContext)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No pudimos consultar la unidad.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setContextBusy(false);
      });
    return () => controller.abort();
  }, [unitId, open, role, userId]);
  const order = context?.orders.find((x) => x.id === orderId),
    locked = command.busy || Boolean(command.pending);
  function updateWork(index: number, changes: Partial<WorkDraft>) {
    setWorks((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );
  }
  function updateCost(index: number, changes: Partial<CostDraft>) {
    setCosts((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );
  }
  async function save() {
    setError("");
    try {
      const body = command.pending
        ? undefined
        : {
            unitId,
            providerName: provider,
            performedOn,
            ...(startedOn ? { startedOn } : {}),
            maintenanceType: order?.maintenanceType ?? type,
            ...(orderId ? { orderId } : {}),
            ...(reference ? { documentRef: reference } : {}),
            ...(note ? { note } : {}),
            workLines: works,
            costLines: costs.map((line) => {
              const source = context?.externalParts.find(
                  (x) => x.id === line.sourceOpId,
                ),
                range = source?.availableRanges[0];
              const qty = line.sourceOpId ? Number(line.quantity) : 0;
              if (
                line.sourceOpId &&
                (!range ||
                  !Number.isInteger(qty) ||
                  qty < 1 ||
                  qty > range.to - range.from)
              )
                throw new Error(
                  "Revisa la cantidad disponible de las refacciones incluidas.",
                );
              return {
                id: line.id,
                ...(line.workRef ? { workRef: line.workRef } : {}),
                system: line.system || null,
                mode: line.mode,
                money: line.pending
                  ? { state: "PENDING" }
                  : {
                      state: "RECORDED",
                      inputTotalCents: decimalCents(line.amount),
                      currency: "MXN",
                      taxMode: line.taxMode,
                      taxTreatment: line.taxed ? "TAXED" : "NO_TAX",
                      rateBps: line.taxed ? Number(decimalCents(line.rate)) : 0,
                    },
                ...(line.zeroReason ? { zeroReason: line.zeroReason } : {}),
                claims:
                  line.mode === "SUPPLIER_PARTS_INCLUDED" && source && range
                    ? [
                        {
                          sourceOpId: source.id,
                          sourceVersion: source.version,
                          from: range.from,
                          to: range.from + qty,
                        },
                      ]
                    : [],
              };
            }),
          };
      const result = await command.execute(body);
      if (result) {
        onOpenChange(false);
        onSaved();
        setProvider("");
        setOrderId("");
        setType("");
        setReference("");
        setNote("");
        setStartedOn("");
        setWorks([newWork()]);
        setCosts([newCost()]);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Revisa los datos del servicio.",
      );
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
          <SheetTitle>Registrar servicio externo</SheetTitle>
          <SheetDescription>
            Registra un trabajo realizado y su costo. Esto no libera la unidad
            ni finaliza una parada.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="analysis-sheet-form"
        >
          <div className="analysis-sheet-body">
            {command.pending && !command.busy && (
              <Note variant="warn">
                Hay una operación pendiente de confirmación. Reintenta la misma
                operación para recuperar su resultado.
              </Note>
            )}
            <FormAlert>{error || command.error}</FormAlert>
            <fieldset disabled={locked} className="analysis-form-fields">
              <legend className="sr-only">Datos del servicio</legend>
              <Field label="Unidad" htmlFor="external-unit">
                <NativeSelect
                  id="external-unit"
                  value={unitId}
                  required
                  onChange={(e) => {
                    setUnitId(e.target.value);
                    setOrderId("");
                    setCosts([newCost()]);
                    setWorks([newWork()]);
                  }}
                >
                  <option value="">Selecciona una unidad</option>
                  {options.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} · {u.plates}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Proveedor / taller" htmlFor="external-provider">
                <Input
                  id="external-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  maxLength={160}
                  required
                />
              </Field>
              <div className="analysis-form-grid">
                <Field label="Concluyó el" htmlFor="external-date">
                  <Input
                    id="external-date"
                    type="date"
                    value={performedOn}
                    max={localDay()}
                    onChange={(e) => setPerformedOn(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Inició el (opcional)" htmlFor="external-start">
                  <Input
                    id="external-start"
                    type="date"
                    value={startedOn}
                    max={performedOn}
                    onChange={(e) => setStartedOn(e.target.value)}
                  />
                </Field>
              </div>
              <p className="muted">
                El costo se reconoce al concluir, aunque el trabajo haya
                empezado en otro mes.
              </p>
              <Field
                label="Orden de mantenimiento (opcional)"
                htmlFor="external-order"
              >
                <NativeSelect
                  id="external-order"
                  value={orderId}
                  disabled={contextBusy || !context}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    setWorks([newWork()]);
                  }}
                >
                  <option value="">Registro directo en la unidad</option>
                  {context?.orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.maintenanceType === "PREVENTIVE"
                        ? "Preventivo"
                        : "Correctivo"}{" "}
                      ·{" "}
                      {o.status === "COMPLETED"
                        ? "Cerrada"
                        : o.status === "CANCELLED"
                          ? "Cancelada"
                          : "Abierta"}{" "}
                      · {o.id.slice(0, 8)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {contextBusy && (
                <p className="muted" role="status">
                  Consultando órdenes y refacciones…
                </p>
              )}
              {order ? (
                <p>
                  Tipo de la orden:{" "}
                  <MaintenanceTypeBadge type={order.maintenanceType} />
                </p>
              ) : (
                <Field label="Tipo de mantenimiento" htmlFor="external-type">
                  <NativeSelect
                    id="external-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="">Selecciona el tipo</option>
                    <option value="PREVENTIVE">Preventivo</option>
                    <option value="CORRECTIVE">Correctivo</option>
                  </NativeSelect>
                </Field>
              )}
              <section className="analysis-form-section">
                <h3>Trabajos realizados</h3>
                {works.map((work, index) => (
                  <div className="analysis-form-line" key={work.id}>
                    <Field
                      label={`Sistema · trabajo ${index + 1}`}
                      htmlFor={`work-system-${index}`}
                    >
                      <NativeSelect
                        id={`work-system-${index}`}
                        value={work.system}
                        required
                        onChange={(e) =>
                          updateWork(index, {
                            system: e.target.value,
                            workCode: "",
                            workKind: "",
                            orderWorkRef: undefined,
                          })
                        }
                      >
                        <option value="">Selecciona sistema</option>
                        {Object.entries(SYSTEM_LABELS)
                          .filter(([id]) => id !== "UNKNOWN")
                          .map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field label="Trabajo" htmlFor={`work-code-${index}`}>
                      <NativeSelect
                        id={`work-code-${index}`}
                        value={work.workCode}
                        required
                        onChange={(e) => {
                          const item = options.catalogue.find(
                            (x) => x.code === e.target.value,
                          );
                          updateWork(index, {
                            workCode: e.target.value,
                            workKind:
                              item?.kind === "UNSPECIFIED"
                                ? ""
                                : (item?.kind ?? ""),
                            orderWorkRef: undefined,
                          });
                        }}
                      >
                        <option value="">Selecciona trabajo</option>
                        {options.catalogue
                          .filter((x) => x.system === work.system && x.active)
                          .map((x) => (
                            <option key={x.code} value={x.code}>
                              {x.label}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field label="Intervención" htmlFor={`work-kind-${index}`}>
                      <NativeSelect
                        id={`work-kind-${index}`}
                        required
                        value={work.workKind}
                        onChange={(e) =>
                          updateWork(index, { workKind: e.target.value })
                        }
                      >
                        <option value="">Selecciona intervención</option>
                        {Object.entries(WORK_LABELS)
                          .filter(([id]) => id !== "UNSPECIFIED")
                          .map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    {order && (
                      <Field
                        label="Mismo trabajo de la orden (opcional)"
                        htmlFor={`work-link-${index}`}
                      >
                        <NativeSelect
                          id={`work-link-${index}`}
                          value={work.orderWorkRef ?? ""}
                          onChange={(e) =>
                            updateWork(index, {
                              orderWorkRef: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">
                            Trabajo externo independiente
                          </option>
                          {order.works
                            .filter((x) => x.categoria === work.system)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.item}
                              </option>
                            ))}
                        </NativeSelect>
                      </Field>
                    )}
                    {works.length > 1 && (
                      <Button
                        variant="quiet"
                        type="button"
                        onClick={() =>
                          setWorks((all) => all.filter((x) => x.id !== work.id))
                        }
                      >
                        Quitar trabajo {index + 1}
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="secondary"
                  type="button"
                  disabled={works.length >= 100}
                  onClick={() => setWorks((x) => [...x, newWork()])}
                >
                  Agregar trabajo
                </Button>
              </section>
              <section className="analysis-form-section">
                <h3>Costos del servicio</h3>
                <p className="muted">
                  Si no tienes desglose, registra una sola línea. No repitas el
                  total junto a sus conceptos.
                </p>
                {costs.map((line, index) => (
                  <div className="analysis-form-line" key={line.id}>
                    <Field
                      label={`Sistema del costo · línea ${index + 1}`}
                      htmlFor={`cost-system-${index}`}
                    >
                      <NativeSelect
                        id={`cost-system-${index}`}
                        value={line.system}
                        onChange={(e) =>
                          updateCost(index, { system: e.target.value })
                        }
                      >
                        <option value="">Sin desglose por sistema</option>
                        {Object.entries(SYSTEM_LABELS)
                          .filter(([id]) => id !== "UNKNOWN")
                          .map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field
                      label="Trabajo al que corresponde el costo (opcional)"
                      htmlFor={`cost-work-${index}`}
                    >
                      <NativeSelect
                        id={`cost-work-${index}`}
                        value={line.workRef}
                        onChange={(e) =>
                          updateCost(index, { workRef: e.target.value })
                        }
                      >
                        <option value="">
                          Sin atribuir a un trabajo específico
                        </option>
                        {works
                          .filter(
                            (work) =>
                              work.workCode &&
                              (!line.system || work.system === line.system),
                          )
                          .map((work) => (
                            <option key={work.id} value={work.id}>
                              {
                                options.catalogue.find(
                                  (c) => c.code === work.workCode,
                                )?.label
                              }{" "}
                              · {WORK_LABELS[work.workKind]}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field
                      label="Refacciones incluidas"
                      htmlFor={`cost-mode-${index}`}
                    >
                      <NativeSelect
                        id={`cost-mode-${index}`}
                        value={line.mode}
                        onChange={(e) =>
                          updateCost(index, {
                            mode: e.target.value,
                            sourceOpId: "",
                            quantity: "",
                          })
                        }
                      >
                        <option value="SERVICE_ONLY">Solo servicio</option>
                        <option value="SUPPLIER_PARTS_INCLUDED">
                          Incluye piezas del proveedor
                        </option>
                        <option value="COMPANY_PARTS">
                          Usamos refacciones propias
                        </option>
                      </NativeSelect>
                    </Field>
                    {line.mode === "COMPANY_PARTS" && (
                      <p className="muted">
                        El importe del proveedor debe excluir las refacciones
                        propias; su consumo ya se suma por separado.
                      </p>
                    )}
                    {line.mode === "SUPPLIER_PARTS_INCLUDED" && (
                      <>
                        <Field
                          label="Compra externa ya registrada (opcional)"
                          htmlFor={`cost-source-${index}`}
                        >
                          <NativeSelect
                            id={`cost-source-${index}`}
                            value={line.sourceOpId}
                            onChange={(e) => {
                              const source = context?.externalParts.find(
                                (x) => x.id === e.target.value,
                              );
                              updateCost(index, {
                                sourceOpId: e.target.value,
                                quantity: source?.availableRanges[0]
                                  ? String(
                                      source.availableRanges[0].to -
                                        source.availableRanges[0].from,
                                    )
                                  : "",
                              });
                            }}
                          >
                            <option value="">
                              Estas piezas no están registradas por separado
                            </option>
                            {context?.externalParts.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={!p.availableRanges.length}
                              >
                                {p.label} · {p.qty} pzas · {cents(p.netCents)}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        {line.sourceOpId && (
                          <Field
                            label="Cantidad incluida en este servicio"
                            htmlFor={`cost-qty-${index}`}
                          >
                            <Input
                              id={`cost-qty-${index}`}
                              type="number"
                              min={1}
                              step={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateCost(index, { quantity: e.target.value })
                              }
                              required
                            />
                          </Field>
                        )}
                        <p className="muted">
                          Vincula las piezas ya registradas para contarlas una
                          sola vez. Esto no modifica las existencias.
                        </p>
                      </>
                    )}
                    <label className="analysis-check">
                      <input
                        type="checkbox"
                        checked={line.pending}
                        onChange={(e) =>
                          updateCost(index, { pending: e.target.checked })
                        }
                      />{" "}
                      Costo pendiente de conocer
                    </label>
                    {!line.pending && (
                      <>
                        <div className="analysis-form-grid">
                          <Field
                            label="Importe MXN"
                            htmlFor={`cost-amount-${index}`}
                          >
                            <Input
                              id={`cost-amount-${index}`}
                              inputMode="decimal"
                              value={line.amount}
                              onChange={(e) =>
                                updateCost(index, { amount: e.target.value })
                              }
                              required
                            />
                          </Field>
                          <Field
                            label="IVA del importe"
                            htmlFor={`cost-tax-${index}`}
                          >
                            <NativeSelect
                              id={`cost-tax-${index}`}
                              value={line.taxMode}
                              onChange={(e) =>
                                updateCost(index, { taxMode: e.target.value })
                              }
                            >
                              <option value="INCLUDED">Incluye IVA</option>
                              <option value="EXCLUDED">Más IVA</option>
                            </NativeSelect>
                          </Field>
                        </div>
                        <label className="analysis-check">
                          <input
                            type="checkbox"
                            checked={line.taxed}
                            onChange={(e) =>
                              updateCost(index, { taxed: e.target.checked })
                            }
                          />{" "}
                          Servicio gravado
                        </label>
                        {line.taxed && (
                          <Field
                            label="Tasa de IVA (%)"
                            htmlFor={`cost-rate-${index}`}
                          >
                            <Input
                              id={`cost-rate-${index}`}
                              inputMode="decimal"
                              value={line.rate}
                              onChange={(e) =>
                                updateCost(index, { rate: e.target.value })
                              }
                              required
                            />
                          </Field>
                        )}
                        {/^(0+)([.,]0{1,2})?$/.test(line.amount) && (
                          <Field
                            label="Motivo de importe cero"
                            htmlFor={`cost-zero-${index}`}
                          >
                            <Input
                              id={`cost-zero-${index}`}
                              value={line.zeroReason}
                              onChange={(e) =>
                                updateCost(index, {
                                  zeroReason: e.target.value,
                                })
                              }
                              required
                            />
                          </Field>
                        )}
                      </>
                    )}
                    {costs.length > 1 && (
                      <Button
                        variant="quiet"
                        type="button"
                        onClick={() =>
                          setCosts((all) => all.filter((x) => x.id !== line.id))
                        }
                      >
                        Quitar línea {index + 1}
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="secondary"
                  type="button"
                  disabled={costs.length >= 100}
                  onClick={() => setCosts((x) => [...x, newCost()])}
                >
                  Agregar concepto de costo
                </Button>
              </section>
              <p className="muted">
                Después de guardar podrás adjuntar el comprobante desde el
                detalle del registro de costo.
              </p>
              <Field
                label="Referencia del comprobante (opcional)"
                htmlFor="external-reference"
              >
                <Input
                  id="external-reference"
                  value={reference}
                  maxLength={200}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
              <Field label="Observaciones (opcional)" htmlFor="external-note">
                <Textarea
                  id="external-note"
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </fieldset>
          </div>
          <SheetFooter className="analysis-sheet-footer">
            <Button
              variant="secondary"
              type="button"
              disabled={command.busy}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              type={command.pending ? "button" : "submit"}
              disabled={
                command.busy ||
                contextBusy ||
                !options.capabilities.externalServices
              }
              onClick={command.pending ? () => void save() : undefined}
            >
              {command.busy
                ? "Confirmando…"
                : command.pending
                  ? "Reintentar misma operación"
                  : "Registrar servicio"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
