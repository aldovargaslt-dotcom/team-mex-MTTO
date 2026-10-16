"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, HttpError } from "@/lib/api";
import { etiquetaUom } from "@/lib/format";
import { notifyInboxChanged } from "@/lib/inbox";
import {
  CostInput,
  ItemCosts,
  money,
  previewCost,
} from "@/lib/inventory-costs";
import type { Proveedor } from "@/lib/types";
import { InventoryCostFields } from "./InventoryCostFields";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
export type MovimientoSheetMode = "entrada" | "ajuste";
export type MovimientoSheetRow = {
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  uom?: string | null;
};
export function InventarioMovimientoSheet({
  mode,
  itemId,
  rows,
  lockItem,
  role,
  userId,
  onClose,
  onApplied,
  onError,
}: {
  mode: MovimientoSheetMode | null;
  itemId: string;
  rows: MovimientoSheetRow[];
  lockItem?: boolean;
  role: string;
  userId?: string;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [itemSearch, setItemSearch] = useState("");
  const [qty, setQty] = useState("1"),
    [nota, setNota] = useState(""),
    [currentId, setCurrentId] = useState(itemId),
    [providers, setProviders] = useState<Proveedor[]>([]),
    [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState<CostInput>({
      state: "PENDING",
      taxTreatment: "TAXED",
      rateBps: 1600,
    }),
    [reference, setReference] = useState(""),
    [valuation, setValuation] = useState<ItemCosts | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [providerError, setProviderError] = useState(false),
    [providerLoading, setProviderLoading] = useState(true);
  const request = useRef<{ key: string; body: string; path: string } | null>(
    null,
  );
  const selected = rows.find((row) => row.itemId === currentId),
    delta = Number(qty);
  const projected =
    selected && Number.isInteger(delta) ? selected.qty + delta : null;
  const invalid =
    mode === "ajuste" && (projected == null || projected < 0 || delta === 0);
  useEffect(() => {
    if (!mode) return;
    setCurrentId(itemId);
    setItemSearch("");
    setQty(mode === "ajuste" ? "-1" : "1");
    setNota("");
    setSupplier("");
    setCost({ state: "PENDING", taxTreatment: "TAXED", rateBps: 1600 });
    setReference("");
    setError("");
    setUncertain(false);
    request.current = null;
  }, [mode, itemId]);
  const loadProviders = useCallback(async () => {
    setProviderError(false);
    setProviderLoading(true);
    try {
      setProviders(
        (
          await api<Proveedor[]>("/inventario/proveedores", { role, userId })
        ).filter((p) => p.activo),
      );
    } catch {
      setProviderError(true);
    } finally {
      setProviderLoading(false);
    }
  }, [role, userId]);
  useEffect(() => {
    if (mode === "entrada") void loadProviders(); /* independent resource */
  }, [mode, loadProviders]);
  useEffect(() => {
    let active = true;
    setValuation(null);
    if (mode === "entrada" && currentId)
      void api<ItemCosts>(`/inventario/items/${currentId}/costos`, {
        role,
        userId,
      })
        .then((v) => {
          if (active) setValuation(v);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [mode, currentId, role, userId]);
  const preview = previewCost(cost);
  const average =
    valuation && valuation.valuation.valueCents != null && preview && delta > 0
      ? (
          (BigInt(valuation.valuation.valueCents) + BigInt(preview.netCents)) /
          BigInt(valuation.quantity + delta)
        ).toString()
      : null;
  async function aplicar(event: FormEvent) {
    event.preventDefault();
    if (busy || !mode || !currentId || invalid) return;
    setBusy(true);
    setError("");
    const path =
      mode === "entrada"
        ? "/inventario/recepciones"
        : "/inventario/costos/ajustes";
    const body =
      mode === "entrada"
        ? {
            itemId: currentId,
            qty: delta,
            supplierId: supplier,
            cost,
            documentReference: reference.trim() || undefined,
            note: nota.trim() || undefined,
          }
        : { itemId: currentId, qtyDelta: delta, nota: nota.trim() };
    if (!uncertain)
      request.current = {
        key: crypto.randomUUID(),
        body: JSON.stringify(body),
        path,
      };
    try {
      const req = request.current!;
      await api(req.path, {
        role,
        userId,
        method: "POST",
        headers: { "Idempotency-Key": req.key },
        body: req.body,
      });
    } catch (e) {
      setBusy(false);
      const message = e instanceof Error ? e.message : "No se pudo registrar.";
      setError(message);
      if (!(e instanceof HttpError) || e.status >= 500) {
        setUncertain(true);
        setError(
          `${message} El resultado no está confirmado. Reintenta con la misma operación.`,
        );
      }
      return;
    }
    setBusy(false);
    setUncertain(false);
    request.current = null;
    notifyInboxChanged();
    onClose();
    try {
      await onApplied();
    } catch {
      onError(
        "Movimiento guardado. No se pudo actualizar la vista; recarga para consultar el resultado.",
      );
    }
  }
  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open && !busy && !uncertain) onClose();
      }}
    >
      <SheetContent side="right" className="inventory-entry-sheet">
        <SheetHeader>
          <SheetTitle>
            {mode === "ajuste" ? "Ajustar existencias" : "Registrar entrada"}
          </SheetTitle>
          <SheetDescription>
            {mode === "ajuste"
              ? "Corrige una diferencia física con un motivo."
              : "Recibe piezas en almacén y registra su costo."}
          </SheetDescription>
        </SheetHeader>
        <form className="grid gap-4 px-4 pb-4" onSubmit={aplicar}>
          <FormAlert>{error}</FormAlert>
          <fieldset disabled={busy || uncertain} className="grid gap-3">
            {!lockItem ? <Field label="Buscar refacción" htmlFor="movItemSearch">
              <Input id="movItemSearch" type="search" placeholder="Nombre o SKU" value={itemSearch} onChange={(event) => { setItemSearch(event.target.value); setCurrentId(""); }} />
            </Field> : null}
            <Field label={lockItem ? "Refacción" : "Seleccionar refacción"} htmlFor="movItem">
              <NativeSelect
                id="movItem"
                required
                value={currentId}
                disabled={lockItem}
                onChange={(e) => setCurrentId(e.target.value)}
              >
                <option value="">Selecciona refacción</option>
                {rows.filter((row) => `${row.nombre} ${row.sku}`.toLocaleLowerCase('es').includes(itemSearch.trim().toLocaleLowerCase('es'))).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((row) => (
                  <option key={row.itemId} value={row.itemId}>
                    {row.nombre} · {row.sku} ({row.qty} {etiquetaUom(row.uom)})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label={
                mode === "ajuste" ? "Cambio de cantidad" : "Cantidad recibida"
              }
              htmlFor="movQty"
              help={
                mode === "ajuste"
                  ? "Positivo suma. Negativo resta."
                  : "Cantidad de piezas que llegan físicamente al almacén."
              }
            >
              <Input
                id="movQty"
                type="number"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={mode === "entrada" ? 1 : undefined}
                step={1}
              />
            </Field>
            {mode === "entrada" ? (
              <>
                <Field label="Proveedor" htmlFor="movSupplier">
                  <NativeSelect
                    id="movSupplier"
                    disabled={providerLoading}
                    value={supplier}
                    required
                    onChange={(e) => setSupplier(e.target.value)}
                  >
                    <option value="">Selecciona proveedor</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {providerLoading ? <p className="muted" role="status">Cargando proveedores…</p> : providerError ? (
                  <div>
                    <p className="muted">
                      No se pudieron cargar los proveedores.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadProviders()}
                    >
                      Reintentar proveedores
                    </Button>
                  </div>
                ) : providers.length === 0 ? (
                  <p className="muted">
                    Agrega un proveedor en Catálogo → Proveedores antes de
                    registrar una compra.
                  </p>
                ) : null}
                <InventoryCostFields
                  key={`${mode}-${itemId}`}
                  value={cost}
                  onChange={setCost}
                />
                <Field
                  label="Referencia del comprobante"
                  htmlFor="movReference"
                  help="Puedes completar el comprobante después."
                >
                  <Input
                    id="movReference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
              </>
            ) : null}
            <Field
              label={mode === "ajuste" ? "Motivo" : "Nota"}
              htmlFor="movNota"
            >
              <Textarea
                id="movNota"
                required={mode === "ajuste"}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </Field>
            <section className="inventory-review">
              <h3>Revisar antes de confirmar</h3>
              <dl className="dl">
                <dt>Existencias</dt>
                <dd>
                  {selected
                    ? `${selected.qty} → ${projected} pza`
                    : "Selecciona refacción"}
                </dd>
                {mode === "entrada" ? (
                  <>
                    <dt>Nuevo costo promedio</dt>
                    <dd>
                      {average
                        ? `${money(average)} / pza sin IVA`
                        : "Costo de almacén incompleto"}
                    </dd>
                  </>
                ) : null}
              </dl>
              {mode === "ajuste" ? (
                <p className="muted">
                  Un sobrante queda pendiente de valoración; un faltante usa el
                  promedio conocido, sin cargarlo a una unidad.
                </p>
              ) : null}
            </section>
          </fieldset>
          {uncertain ? (
            <p role="status" className="muted">
              Los datos se conservaron. El reintento de entrada usa la misma
              clave y no duplica la recepción. El ajuste también conserva la
              misma clave al recuperar su resultado.
            </p>
          ) : null}
          <SheetFooter className="p-0">
            <Button
              type="submit"
              disabled={busy || !currentId || invalid || (mode === "entrada" && !supplier)}
            >
              {busy
                ? "Confirmando…"
                : uncertain
                  ? "Recuperar resultado"
                  : mode === "entrada"
                    ? "Confirmar entrada"
                    : "Confirmar ajuste"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || uncertain}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
