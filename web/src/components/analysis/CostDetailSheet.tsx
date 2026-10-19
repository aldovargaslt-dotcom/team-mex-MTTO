"use client";
import Link from "next/link";
import { ServiceAttachments, type Attachment } from "./ServiceAttachments";
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
import { MaintenanceTypeBadge } from "@/components/MaintenanceTypeBadge";
import {
  analysisApi,
  cents,
  localDay,
  SYSTEM_LABELS,
  type CostRecord,
} from "@/lib/maintenance-analysis";
import { useRole } from "@/lib/role";
import { decimalCents } from "./ExternalServiceSheet";
import { useAnalysisCommand } from "./useAnalysisCommand";
type Money = {
  inputTotalCents: string;
  taxMode: string;
  taxTreatment: string;
  rateBps: number;
  currency: string;
  netCents: string;
  taxCents: string;
  totalCents: string;
};
type Service = {
  id: string;
  version: number;
  performedOn: string;
  providerName: string;
  maintenanceType: string;
  registeredAt: string;
  data: {
    unitId: string;
    providerName: string;
    performedOn: string;
    startedOn?: string;
    maintenanceType: string;
    orderId?: string;
    note?: string;
    documentRef?: string;
    attachments?: Attachment[];
    workLines: unknown[];
    costLines: {
      id: string;
      system: string | null;
      mode: string;
      money: Money | null;
      claims: unknown[];
      zeroReason?: string;
      workRef?: string;
    }[];
  };
};
type PartDetail = {
  operation: {
    id: string;
    version: number;
    qty: number;
    kind: string;
    netCents: string | null;
    effectiveAt: string;
  };
  classifications: {
    id: string;
    revision: number;
    sourceVersion: number;
    data: { system: string | null };
    actor: string;
    reason: string;
  }[];
};
type AmountDraft = {
  id: string;
  pending: boolean;
  amount: string;
  taxMode: string;
  taxed: boolean;
  rate: string;
  zeroReason: string;
};
function toInput(row: Service, drafts: AmountDraft[]) {
  return row.data.costLines.map((line) => {
    const draft = drafts.find((x) => x.id === line.id)!;
    return {
      ...line,
      ...(draft.zeroReason ? { zeroReason: draft.zeroReason } : {}),
      money: draft.pending
        ? { state: "PENDING" }
        : {
            state: "RECORDED",
            inputTotalCents: decimalCents(draft.amount),
            currency: "MXN",
            taxMode: draft.taxMode,
            taxTreatment: draft.taxed ? "TAXED" : "NO_TAX",
            rateBps: draft.taxed ? Number(decimalCents(draft.rate)) : 0,
          },
    };
  });
}
export function CostDetailSheet({
  record,
  onClose,
  onSaved,
  canCorrect,
}: {
  record: CostRecord;
  onClose: () => void;
  onSaved: () => void;
  canCorrect: boolean;
}) {
  const { role, userId } = useRole();
  const complete = useAnalysisCommand(
      role,
      userId,
      `/servicios-externos/${record.serviceId}/completar-costo`,
    ),
    correction = useAnalysisCommand(
      role,
      userId,
      `/servicios-externos/${record.serviceId}/corregir`,
    );
  const [service, setService] = useState<Service | null>(null),
    [part, setPart] = useState<PartDetail | null>(null),
    [amounts, setAmounts] = useState<AmountDraft[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [editMode, setEditMode] = useState(false),
    [reason, setReason] = useState(""),
    [performedOn, setPerformedOn] = useState(""),
    [provider, setProvider] = useState(""),
    [type, setType] = useState("");
  const [preview, setPreview] = useState<{
      previewToken: string;
      before: Service["data"];
      after: Service["data"];
    } | null>(null),
    [previewBusy, setPreviewBusy] = useState(false);
  const [system, setSystem] = useState(record.system ?? "");
  const classification = part?.classifications[0];
  const classify = useAnalysisCommand(
    role,
    userId,
    classification
      ? `/clasificaciones-costos/${classification.id}/revisiones`
      : "/clasificaciones-costos",
  );
  useEffect(() => {
    if (!role) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const path = record.serviceId
      ? `/servicios-externos/${record.serviceId}`
      : `/costos-refacciones/${record.sourceId}`;
    void analysisApi<
      {
        service?: Service;
        revisions?: { version: number; reason: string }[];
      } & Partial<PartDetail>
    >(role, userId, path, { signal: controller.signal })
      .then((data) => {
        if (data.service) {
          const row = data.service;
          setService(row);
          setPerformedOn(row.performedOn);
          setProvider(row.providerName);
          setType(row.maintenanceType);
          setAmounts(
            row.data.costLines.map((line) => ({
              id: line.id,
              pending: !line.money,
              amount: line.money
                ? `${BigInt(line.money.inputTotalCents) / BigInt(100)}.${(BigInt(line.money.inputTotalCents) % BigInt(100)).toString().padStart(2, "0")}`
                : "",
              taxMode: line.money?.taxMode ?? "INCLUDED",
              taxed: line.money?.taxTreatment !== "NO_TAX",
              rate: String((line.money?.rateBps ?? 1600) / 100),
              zeroReason: line.zeroReason ?? "",
            })),
          );
        }
        if (data.operation && data.classifications) {
          setPart({
            operation: data.operation,
            classifications: data.classifications,
          });
          setSystem(data.classifications[0]?.data.system ?? "");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "No pudimos consultar el registro.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [role, userId, record.serviceId, record.sourceId]);
  useEffect(() => {
    if (correction.pending) setEditMode(true);
  }, [correction.pending]);
  const active = editMode ? correction : complete,
    locked = active.busy || Boolean(active.pending),
    anyBusy = active.busy || previewBusy || classify.busy;
  function patch(index: number, values: Partial<AmountDraft>) {
    setAmounts((old) =>
      old.map((x, i) => (i === index ? { ...x, ...values } : x)),
    );
    setPreview(null);
  }
  function correctionPayload() {
    if (!service) throw new Error("Servicio no disponible.");
    const editable = { ...service.data };
    delete editable.attachments;
    return {
      expectedVersion: service.version,
      reason,
      service: {
        ...editable,
        providerName: provider,
        performedOn,
        maintenanceType: type,
        costLines: toInput(service, amounts),
      },
    };
  }
  async function previsualize() {
    if (!role || !service) return;
    setPreviewBusy(true);
    setError("");
    try {
      setPreview(
        await analysisApi(
          role,
          userId,
          `/servicios-externos/${service.id}/previsualizar-correccion`,
          { method: "POST", body: JSON.stringify(correctionPayload()) },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos previsualizar.");
    } finally {
      setPreviewBusy(false);
    }
  }
  async function save() {
    if (!service) return;
    setError("");
    try {
      const body = active.pending
        ? undefined
        : editMode
          ? { ...correctionPayload(), previewToken: preview?.previewToken }
          : {
              expectedVersion: service.version,
              costLines: toInput(service, amounts),
            };
      if (editMode && !preview && !active.pending)
        throw new Error("Revisa la previsualización antes de confirmar.");
      const result = await active.execute(body);
      if (result) {
        onClose();
        onSaved();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revisa los importes.");
    }
  }
  async function saveClassification() {
    if (!part) return;
    const result = await classify.execute({
      sourceOpId: part.operation.id,
      sourceVersion: part.operation.version,
      expectedVersion: classification?.revision ?? 0,
      system: system || null,
      reason,
    });
    if (result) {
      onClose();
      onSaved();
    }
  }
  const hasPending = service?.data.costLines.some((x) => !x.money);
  return (
    <Sheet
      open
      onOpenChange={(value) => {
        if (!value && !anyBusy) onClose();
      }}
    >
      <SheetContent side="right" className="analysis-form-sheet">
        <SheetHeader>
          <SheetTitle>
            {record.concept === "PARTS"
              ? "Costo de refacción"
              : "Servicio externo"}
          </SheetTitle>
          <SheetDescription>
            {record.unitLabel} · consulta del registro fuente y sus costos.
          </SheetDescription>
        </SheetHeader>
        <div className="analysis-sheet-form">
          <div className="analysis-sheet-body">
            <FormAlert>{error || active.error || classify.error}</FormAlert>
            {busy && (
              <p role="status" className="muted">
                Consultando registro…
              </p>
            )}
            {!busy && (
              <>
                <dl className="analysis-detail-facts">
                  <div>
                    <dt>Unidad</dt>
                    <dd>
                      <Link
                        className="analysis-link"
                        href={`/unidades/${record.unitId}`}
                      >
                        {record.unitLabel}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Tipo</dt>
                    <dd>
                      <MaintenanceTypeBadge type={record.maintenanceType} />
                    </dd>
                  </div>
                  <div>
                    <dt>Concepto</dt>
                    <dd>
                      {record.concept === "PARTS"
                        ? "Refacciones"
                        : "Servicios externos"}
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha de reconocimiento</dt>
                    <dd>{service?.performedOn ?? record.date}</dd>
                  </div>
                  <div>
                    <dt>Costo conocido sin IVA</dt>
                    <dd>{cents(record.netCents)}</dd>
                  </div>
                  <div>
                    <dt>IVA</dt>
                    <dd>{cents(record.taxCents)}</dd>
                  </div>
                </dl>
                {record.includedByService && (
                  <Note>
                    Esta refacción ya está incluida en un servicio externo. Su
                    contribución adicional al total es cero; el costo fuente se
                    conserva.
                  </Note>
                )}
                {record.orderId && (
                  <p>
                    <Link
                      className="analysis-link"
                      href={`/ordenes?orden=${record.orderId}`}
                    >
                      Consultar orden de mantenimiento
                    </Link>
                  </p>
                )}
                {service && (
                  <>
                    <p>
                      Proveedor: <strong>{service.providerName}</strong>
                    </p>
                    <p className="muted">
                      Registrado el{" "}
                      {new Date(service.registeredAt).toLocaleString("es-MX", {
                        timeZone: "America/Mexico_City",
                      })}
                      . Versión {service.version}.
                    </p>
                    {service.data.documentRef && (
                      <p>Comprobante: {service.data.documentRef}</p>
                    )}
                    {role && !hasPending && !editMode && !active.pending && (
                      <ServiceAttachments
                        id={service.id}
                        files={service.data.attachments ?? []}
                        role={role}
                        userId={userId}
                        onUploaded={(attachment, version) => {
                          setService((row) =>
                            row
                              ? {
                                  ...row,
                                  version: Math.max(row.version, version),
                                  data: {
                                    ...row.data,
                                    attachments: [
                                      ...(row.data.attachments ?? []).filter(
                                        (f) => f.id !== attachment.id,
                                      ),
                                      attachment,
                                    ],
                                  },
                                }
                              : row,
                          );
                          onSaved();
                        }}
                      />
                    )}
                    {canCorrect && !locked && (
                      <label className="analysis-check">
                        <input
                          type="checkbox"
                          checked={editMode}
                          onChange={(e) => {
                            setEditMode(e.target.checked);
                            setPreview(null);
                          }}
                        />{" "}
                        Corregir datos o importes conocidos
                      </label>
                    )}
                    {active.pending && (
                      <Note variant="warn">
                        Operación pendiente de confirmación. Reintenta con la
                        misma clave, sin crear otro registro.
                      </Note>
                    )}
                    {(hasPending || editMode || active.pending) && (
                      <fieldset
                        disabled={locked}
                        className="analysis-form-fields"
                      >
                        <legend>
                          {editMode
                            ? "Corrección con evidencia"
                            : "Completar costos pendientes"}
                        </legend>
                        {editMode && (
                          <>
                            <Field label="Proveedor" htmlFor="correct-provider">
                              <Input
                                id="correct-provider"
                                value={provider}
                                onChange={(e) => {
                                  setProvider(e.target.value);
                                  setPreview(null);
                                }}
                              />
                            </Field>
                            <Field
                              label="Conclusión económica"
                              htmlFor="correct-date"
                            >
                              <Input
                                id="correct-date"
                                type="date"
                                max={localDay()}
                                value={performedOn}
                                onChange={(e) => {
                                  setPerformedOn(e.target.value);
                                  setPreview(null);
                                }}
                              />
                            </Field>
                            {!service.data.orderId && (
                              <Field label="Tipo" htmlFor="correct-type">
                                <NativeSelect
                                  id="correct-type"
                                  value={type}
                                  onChange={(e) => {
                                    setType(e.target.value);
                                    setPreview(null);
                                  }}
                                >
                                  <option value="PREVENTIVE">Preventivo</option>
                                  <option value="CORRECTIVE">Correctivo</option>
                                </NativeSelect>
                              </Field>
                            )}
                          </>
                        )}
                        {amounts.map((draft, i) => {
                          const original = service.data.costLines[i],
                            editable = editMode || !original.money;
                          return (
                            <div className="analysis-form-line" key={draft.id}>
                              <h3>
                                Línea {i + 1} ·{" "}
                                {SYSTEM_LABELS[original.system ?? "UNKNOWN"]}
                              </h3>
                              {!editable ? (
                                <p>
                                  {cents(original.money?.netCents)} sin IVA ·
                                  costo registrado
                                </p>
                              ) : (
                                <>
                                  <label className="analysis-check">
                                    <input
                                      type="checkbox"
                                      checked={draft.pending}
                                      onChange={(e) =>
                                        patch(i, { pending: e.target.checked })
                                      }
                                    />{" "}
                                    Costo pendiente de conocer
                                  </label>
                                  {!draft.pending && (
                                    <>
                                      <Field
                                        label="Importe MXN"
                                        htmlFor={`complete-amount-${i}`}
                                      >
                                        <Input
                                          id={`complete-amount-${i}`}
                                          inputMode="decimal"
                                          value={draft.amount}
                                          onChange={(e) =>
                                            patch(i, { amount: e.target.value })
                                          }
                                        />
                                      </Field>
                                      <Field
                                        label="IVA del importe"
                                        htmlFor={`complete-mode-${i}`}
                                      >
                                        <NativeSelect
                                          id={`complete-mode-${i}`}
                                          value={draft.taxMode}
                                          onChange={(e) =>
                                            patch(i, {
                                              taxMode: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="INCLUDED">
                                            Incluye IVA
                                          </option>
                                          <option value="EXCLUDED">
                                            Más IVA
                                          </option>
                                        </NativeSelect>
                                      </Field>
                                      <label className="analysis-check">
                                        <input
                                          type="checkbox"
                                          checked={draft.taxed}
                                          onChange={(e) =>
                                            patch(i, {
                                              taxed: e.target.checked,
                                            })
                                          }
                                        />{" "}
                                        Servicio gravado
                                      </label>
                                      {draft.taxed && (
                                        <Field
                                          label="Tasa de IVA (%)"
                                          htmlFor={`complete-rate-${i}`}
                                        >
                                          <Input
                                            id={`complete-rate-${i}`}
                                            inputMode="decimal"
                                            value={draft.rate}
                                            onChange={(e) =>
                                              patch(i, { rate: e.target.value })
                                            }
                                          />
                                        </Field>
                                      )}
                                      {/^(0+)([.,]0{1,2})?$/.test(
                                        draft.amount,
                                      ) && (
                                        <Field
                                          label="Motivo de importe cero"
                                          htmlFor={`complete-zero-${i}`}
                                        >
                                          <Input
                                            id={`complete-zero-${i}`}
                                            value={draft.zeroReason}
                                            onChange={(e) =>
                                              patch(i, {
                                                zeroReason: e.target.value,
                                              })
                                            }
                                          />
                                        </Field>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                        {editMode && (
                          <Field
                            label="Motivo de corrección"
                            htmlFor="correct-reason"
                          >
                            <Input
                              id="correct-reason"
                              value={reason}
                              onChange={(e) => {
                                setReason(e.target.value);
                                setPreview(null);
                              }}
                            />
                          </Field>
                        )}
                      </fieldset>
                    )}
                    {preview && (
                      <Note>
                        <strong>Revisa antes de confirmar</strong>
                        <p>
                          Fecha: {preview.before.performedOn} →{" "}
                          {preview.after.performedOn}
                        </p>
                        <p>
                          Costo neto conocido:{" "}
                          {cents(
                            preview.before.costLines
                              .reduce(
                                (n, l) => n + BigInt(l.money?.netCents ?? "0"),
                                BigInt(0),
                              )
                              .toString(),
                          )}{" "}
                          →{" "}
                          {cents(
                            preview.after.costLines
                              .reduce(
                                (n, l) => n + BigInt(l.money?.netCents ?? "0"),
                                BigInt(0),
                              )
                              .toString(),
                          )}
                        </p>
                        <p>
                          Se conserva la evidencia original y se actualiza el
                          periodo afectado.
                        </p>
                      </Note>
                    )}
                  </>
                )}
                {part && (
                  <>
                    <p>
                      Cantidad registrada: {part.operation.qty}. El costo fuente
                      conserva sus revisiones.
                    </p>
                    {part.operation.kind === "RETURN" ? (
                      <Note>
                        Un retorno conserva la clasificación de su consumo
                        original.
                      </Note>
                    ) : (
                      <fieldset
                        disabled={
                          classify.busy ||
                          Boolean(classify.pending) ||
                          Boolean(classification && !canCorrect)
                        }
                        className="analysis-form-fields"
                      >
                        <legend>Clasificación por sistema</legend>
                        <Field label="Sistema" htmlFor="classify-system">
                          <NativeSelect
                            id="classify-system"
                            value={system}
                            onChange={(e) => setSystem(e.target.value)}
                          >
                            <option value="">Sin desglose</option>
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
                          label="Motivo / evidencia"
                          htmlFor="classify-reason"
                        >
                          <Input
                            id="classify-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </Field>
                        {classification && !canCorrect && (
                          <p className="muted">
                            Directivo puede corregir la clasificación
                            registrada.
                          </p>
                        )}
                      </fieldset>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <SheetFooter className="analysis-sheet-footer">
            <Button
              variant="secondary"
              type="button"
              disabled={anyBusy}
              onClick={onClose}
            >
              Cerrar
            </Button>
            {!busy &&
              service &&
              (hasPending || editMode || active.pending) &&
              (editMode && !preview && !active.pending ? (
                <Button
                  type="button"
                  disabled={anyBusy || !reason.trim()}
                  onClick={() => void previsualize()}
                >
                  {previewBusy ? "Consultando…" : "Previsualizar corrección"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={anyBusy}
                  onClick={() => void save()}
                >
                  {active.busy
                    ? "Confirmando…"
                    : active.pending
                      ? "Reintentar misma operación"
                      : editMode
                        ? "Confirmar corrección"
                        : "Completar costos"}
                </Button>
              ))}
            {!busy &&
              part &&
              part.operation.kind !== "RETURN" &&
              (!classification || canCorrect || classify.pending) && (
                <Button
                  type="button"
                  disabled={anyBusy || !reason.trim()}
                  onClick={() => void saveClassification()}
                >
                  {classify.busy
                    ? "Confirmando…"
                    : classify.pending
                      ? "Reintentar misma operación"
                      : "Guardar clasificación"}
                </Button>
              )}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
