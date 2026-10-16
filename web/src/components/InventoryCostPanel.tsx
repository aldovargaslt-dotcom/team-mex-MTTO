"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  CostInput,
  CostOperation,
  costKind,
  ItemCosts,
  money,
  toCents,
} from "@/lib/inventory-costs";
import { Proveedor } from "@/lib/types";
import { InventoryCostFields } from "@/components/InventoryCostFields";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
export function InventoryCostPanel({
  itemId,
  role,
  userId,
  onChanged,
  externalVisitId,
}: {
  itemId: string;
  role: string;
  userId?: string;
  onChanged?: () => void;
  externalVisitId?: string;
}) {
  const [data, setData] = useState<ItemCosts | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Proveedor[]>([]),
    [selected, setSelected] = useState<CostOperation | null>(null),
    [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState<CostInput>({
      state: "PENDING",
      taxTreatment: "TAXED",
      rateBps: 1600,
    }),
    [reason, setReason] = useState(""),
    [opening, setOpening] = useState(false),
    [value, setValue] = useState(""),
    [returnQty, setReturnQty] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null),
    payload = useRef("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (externalVisitId) {
        const response = await api<{ operations: CostOperation[] }>(
          `/inventario/costos/consumos?visitaId=${externalVisitId}`,
          { role, userId },
        );
        setData({
          quantity: 0,
          valuation: { valueCents: null, version: 0, cutAt: null },
          operations: response.operations.filter((op) => op.itemId === itemId),
        });
      } else
        setData(
          await api<ItemCosts>(`/inventario/items/${itemId}/costos`, {
            role,
            userId,
          }),
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los costos.",
      );
    } finally {
      setLoading(false);
    }
  }, [itemId, role, userId, externalVisitId]);
  useEffect(() => {
    setData(null);
    setSelected(null);
    setOpening(false);
    void load();
    let active = true;
    void api<Proveedor[]>("/inventario/proveedores", { role, userId })
      .then((rows) => {
        if (active) setProviders(rows.filter((p) => p.activo));
      })
      .catch(() => {
        if (active) setProviders([]);
      });
    return () => {
      active = false;
    };
  }, [load, role, userId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || busy) return;
    setError("");
    setBusy(true);
    const path = opening
      ? `/inventario/items/${itemId}/valoraciones/aperturas`
      : returnQty
        ? `/inventario/costos/${selected!.id}/retornos`
        : `/inventario/costos/${selected!.id}/${selected!.netCents == null ? "completar" : "corregir"}`;
    const body = opening
      ? {
          qty: data.quantity,
          expectedVersion: data.valuation.version,
          valueCents: toCents(value),
          reason,
        }
      : returnQty
        ? { qty: Number(returnQty), reason }
        : {
            expectedVersion: selected!.version,
            cost,
            supplierId: supplier || undefined,
            reason,
          };
    const serialized = JSON.stringify({ path, body });
    if (serialized !== payload.current) {
      key.current = crypto.randomUUID();
      payload.current = serialized;
    }
    try {
      await api(path, {
        role,
        userId,
        method: "POST",
        headers: { "Idempotency-Key": key.current! },
        body: JSON.stringify(body),
      });
      setSelected(null);
      setOpening(false);
      setReason("");
      setReturnQty("");
      key.current = null;
      await load();
      onChanged?.();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Reintenta con los mismos datos para recuperar el resultado.",
      );
    } finally {
      setBusy(false);
    }
  }
  const average =
    data?.valuation.valueCents != null && data.quantity > 0
      ? (
          (BigInt(data.valuation.valueCents) * BigInt(2) +
            BigInt(data.quantity)) /
          (BigInt(data.quantity) * BigInt(2))
        ).toString()
      : null;
  const operations = (data?.operations ?? []).filter(
    (op) =>
      !externalVisitId ||
      (op.kind === "EXTERNAL" && op.visitaId === externalVisitId),
  );
  return (
    <section className="inventory-financial-section">
      <h3>
        {externalVisitId
          ? "Costos de esta compra externa"
          : "Costos · MXN sin IVA"}
      </h3>
      <FormAlert>{error}</FormAlert>
      {loading ? (
        <p className="muted">Cargando costos…</p>
      ) : data ? (
        <>
          {!externalVisitId ? (
            <dl className="dl">
              <dt>Costo promedio de almacén</dt>
              <dd>
                {data.valuation.valueCents == null
                  ? "Costo de almacén incompleto"
                  : data.quantity === 0
                    ? "Sin existencias"
                    : `${money(average)} / pza`}
              </dd>
              <dt>Último costo de compra</dt>
              <dd>
                {(() => {
                  const op = data.operations.find(
                    (o) => o.kind === "RECEIPT" && o.netCents != null,
                  );
                  return op
                    ? `${money((BigInt(op.netCents!) / BigInt(op.qty)).toString())} / pza`
                    : "Sin costo registrado";
                })()}
              </dd>
            </dl>
          ) : null}
          {!externalVisitId &&
          role === "ADMIN_DIRECTIVO" &&
          !opening &&
          !selected ? (
            <Button
              variant="outline"
              onClick={() => {
                setOpening(true);
                setReason("");
                setValue("");
              }}
            >
              Registrar valoración verificada
            </Button>
          ) : null}
          {!externalVisitId ? (
            <p className="muted">
              Los consumos conservan su costo histórico. Una entrada sin costo
              requiere regularización del promedio.
            </p>
          ) : null}
          {opening || selected ? (
            <form className="grid gap-3 mt-3" onSubmit={submit}>
              <h3>
                {opening
                  ? "Valoración al corte actual"
                  : returnQty
                    ? "Retorno de piezas"
                    : selected?.netCents == null
                      ? "Completar costo pendiente"
                      : "Corregir costo registrado"}
              </h3>
              {opening ? (
                <>
                  <p>Existencias verificadas: {data.quantity} pza</p>
                  <Field
                    label="Valor total sin IVA · MXN"
                    htmlFor="openingValue"
                  >
                    <Input
                      id="openingValue"
                      value={value}
                      required
                      inputMode="decimal"
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </Field>
                </>
              ) : returnQty ? (
                <Field
                  label="Cantidad que regresa al almacén"
                  htmlFor="returnQty"
                >
                  <Input
                    id="returnQty"
                    type="number"
                    min="1"
                    max={selected?.qty}
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    required
                  />
                </Field>
              ) : (
                <>
                  <InventoryCostFields
                    key={selected?.id}
                    value={cost}
                    onChange={setCost}
                  />
                  {selected?.kind === "RECEIPT" ||
                  selected?.kind === "EXTERNAL" ? (
                    <Field label="Proveedor" htmlFor="costSupplier">
                      <NativeSelect
                        id="costSupplier"
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
                  ) : null}
                </>
              )}
              <Field label="Motivo y referencia" htmlFor="costReason">
                <Input
                  id="costReason"
                  value={reason}
                  required
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={
                    busy ||
                    (!opening && !returnQty && cost.state !== "RECORDED")
                  }
                >
                  {busy ? "Guardando…" : "Confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setOpening(false);
                    setSelected(null);
                    setReturnQty("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="mt-4">Operaciones recientes</h3>
              <p className="muted">
                {externalVisitId
                  ? "Operaciones de esta refacción en la orden seleccionada."
                  : "Últimas 100 operaciones. Importe neto por operación."}
              </p>
              <ul className="inventory-cost-operations">
                {operations.map((op) => (
                  <li key={op.id}>
                    <div>
                      <strong>{costKind[op.kind] ?? op.kind}</strong>
                      <p className="muted">
                        {op.qty} pza ·{" "}
                        {new Date(op.effectiveAt).toLocaleDateString("es-MX")}
                        {op.supplierName ? ` · ${op.supplierName}` : ""}
                      </p>
                      <span>{money(op.netCents)} sin IVA</span>
                      {op.money ? (
                        <p className="muted">
                          IVA {money(op.money.taxCents)} · Total{" "}
                          {money(op.money.totalCents)} MXN
                        </p>
                      ) : null}
                      {op.revisions.length ? (
                        <p className="muted">
                          Regularizado · {op.revisions.length} revisión(es)
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["RECEIPT", "CONSUMPTION", "EXTERNAL"].includes(
                        op.kind,
                      ) &&
                      (op.netCents == null || role === "ADMIN_DIRECTIVO") ? (
                        <Button
                          variant="outline"
                          size="compact"
                          onClick={() => {
                            setSelected(op);
                            setCost({
                              state: "RECORDED",
                              taxTreatment: "TAXED",
                              rateBps: 1600,
                            });
                            setSupplier(op.supplierId ?? "");
                            setReason("");
                            setReturnQty("");
                          }}
                        >
                          {op.netCents == null ? "Completar costo" : "Corregir"}
                        </Button>
                      ) : null}
                      {op.kind === "CONSUMPTION" ? (
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            setSelected(op);
                            setReturnQty("1");
                            setReason("");
                          }}
                        >
                          Registrar retorno
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {operations.length === 0 ? (
                <p className="muted">Sin operaciones de costo registradas.</p>
              ) : null}
            </>
          )}
        </>
      ) : (
        <Button variant="outline" onClick={() => void load()}>
          Reintentar costos
        </Button>
      )}
    </section>
  );
}
