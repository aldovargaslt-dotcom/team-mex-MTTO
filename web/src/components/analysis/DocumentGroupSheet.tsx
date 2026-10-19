"use client";
import { useEffect, useState } from "react";
import { useRole } from "@/lib/role";
import {
  analysisApi,
  cents,
  type AnalysisOptions,
} from "@/lib/maintenance-analysis";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field, FormAlert, Note } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { decimalCents } from "./ExternalServiceSheet";
import { useAnalysisCommand } from "./useAnalysisCommand";
type Line = {
  id: string;
  serviceId: string;
  unitId: string;
  providerName: string;
  performedOn: string;
  groupId: string | null;
  money: { netCents: string; taxCents: string; totalCents: string };
};
type Group = {
  id: string;
  version: number;
  data: {
    documentRef: string;
    lineIds: string[];
    netCents: string;
    taxCents: string;
    totalCents: string;
  };
};
export function DocumentGroupSheet({
  options,
  onClose,
  onSaved,
}: {
  options: AnalysisOptions;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { role, userId } = useRole();
  const [unit, setUnit] = useState(""),
    [lines, setLines] = useState<Line[]>([]),
    [groups, setGroups] = useState<Group[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [groupId, setGroupId] = useState(""),
    [reference, setReference] = useState(""),
    [net, setNet] = useState(""),
    [tax, setTax] = useState(""),
    [gross, setGross] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const command = useAnalysisCommand(
      role,
      userId,
      groupId
        ? `/grupos-documentales/${groupId}/revisiones`
        : "/grupos-documentales",
    ),
    locked = command.busy || Boolean(command.pending);
  useEffect(() => {
    if (!role || !unit) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void analysisApi<{ lines: Line[]; groups: Group[] }>(
      role,
      userId,
      `/lineas-documentales?unitId=${unit}`,
      { signal: controller.signal },
    )
      .then((data) => {
        setLines((old) => [
          ...new Map(
            [...old, ...data.lines].map((line) => [line.id, line]),
          ).values(),
        ]);
        setGroups((old) => [
          ...new Map(
            [...old, ...data.groups].map((group) => [group.id, group]),
          ).values(),
        ]);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [role, userId, unit]);
  async function save() {
    setError("");
    try {
      const result = await command.execute({
        expectedVersion: groups.find((x) => x.id === groupId)?.version ?? 0,
        lineIds: selected,
        documentRef: reference,
        netCents: decimalCents(net),
        taxCents: decimalCents(tax),
        totalCents: decimalCents(gross),
        reason,
      });
      if (result) {
        onClose();
        onSaved();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revisa los importes.");
    }
  }
  const selectedLines = lines.filter((line) => selected.includes(line.id)),
    known = selectedLines.reduce(
      (n, line) => n + BigInt(line.money.netCents),
      BigInt(0),
    );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !command.busy) onClose();
      }}
    >
      <SheetContent side="right" className="analysis-form-sheet">
        <SheetHeader>
          <SheetTitle>Documento distribuido</SheetTitle>
          <SheetDescription>
            Relaciona las líneas de varios servicios o unidades con un mismo
            comprobante. Conserva el costo de cada servicio.
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
            {command.pending && (
              <Note variant="warn">
                Reintenta la misma operación para confirmar el resultado.
              </Note>
            )}
            <fieldset disabled={locked} className="analysis-form-fields">
              <legend>Líneas e importes del documento</legend>
              <Field
                label="Consultar servicios de la unidad"
                htmlFor="document-unit"
              >
                <NativeSelect
                  id="document-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="">Selecciona una unidad</option>
                  {options.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {busy && <p role="status">Consultando líneas…</p>}
              {options.capabilities.correctCosts && groups.length > 0 && (
                <Field label="Documento" htmlFor="document-group">
                  <NativeSelect
                    id="document-group"
                    value={groupId}
                    onChange={(e) => {
                      setGroupId(e.target.value);
                      const group = groups.find((g) => g.id === e.target.value);
                      setSelected(group?.data.lineIds ?? []);
                      setReference(group?.data.documentRef ?? "");
                    }}
                  >
                    <option value="">Crear documento</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.data.documentRef} · versión {g.version}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              {lines
                .filter((line) => !line.groupId || line.groupId === groupId)
                .map((line) => (
                  <label key={line.id} className="analysis-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(line.id)}
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked
                            ? [...old, line.id]
                            : old.filter((id) => id !== line.id),
                        )
                      }
                    />
                    <span>
                      {options.units.find((u) => u.id === line.unitId)?.label} ·{" "}
                      {line.providerName} · {line.performedOn}
                      <span className="analysis-cell-meta">
                        {cents(line.money.netCents)} sin IVA
                      </span>
                    </span>
                  </label>
                ))}
              <p>
                Neto de líneas seleccionadas:{" "}
                <strong>{cents(known.toString())}</strong>. Seleccionadas:{" "}
                {selected.length}.
              </p>
              {selected.some((id) => !lines.some((line) => line.id === id)) && (
                <Note variant="warn">
                  Consulta también las demás unidades del documento para revisar
                  todas sus líneas.
                </Note>
              )}
              <Field
                label="Referencia del comprobante"
                htmlFor="document-reference"
              >
                <Input
                  id="document-reference"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
              <div className="analysis-form-grid">
                <Field label="Neto MXN" htmlFor="document-net">
                  <Input
                    id="document-net"
                    inputMode="decimal"
                    required
                    value={net}
                    onChange={(e) => setNet(e.target.value)}
                  />
                </Field>
                <Field label="IVA MXN" htmlFor="document-tax">
                  <Input
                    id="document-tax"
                    inputMode="decimal"
                    required
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Total MXN" htmlFor="document-total">
                <Input
                  id="document-total"
                  inputMode="decimal"
                  required
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                />
              </Field>
              <Field label="Motivo / evidencia" htmlFor="document-reason">
                <Input
                  id="document-reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <Note>
                Los tres importes deben coincidir exactamente con la suma de las
                líneas. Si cambia un costo, Directivo debe revisar la
                distribución.
              </Note>
            </fieldset>
          </div>
          <SheetFooter className="analysis-sheet-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={command.busy}
              onClick={onClose}
            >
              Cerrar
            </Button>
            <Button
              disabled={
                command.busy || busy || (!command.pending && !selected.length)
              }
              type={command.pending ? "button" : "submit"}
              onClick={
                command.pending
                  ? () =>
                      void command.execute().then((result) => {
                        if (result) {
                          onClose();
                          onSaved();
                        }
                      })
                  : undefined
              }
            >
              {command.busy
                ? "Confirmando…"
                : command.pending
                  ? "Reintentar misma operación"
                  : "Conciliar documento"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
