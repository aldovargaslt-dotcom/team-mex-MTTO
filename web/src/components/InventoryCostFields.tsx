"use client";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CostInput, money, previewCost, toCents } from "@/lib/inventory-costs";
export function InventoryCostFields({
  value,
  onChange,
}: {
  value: CostInput;
  onChange: (value: CostInput) => void;
}) {
  const [amount, setAmount] = useState("");
  const result = previewCost(value);
  return (
    <fieldset className="inventory-cost-fields">
      <legend>Costo de las piezas · MXN</legend>
      <label className="inventory-check">
        <input
          type="checkbox"
          checked={value.state === "PENDING"}
          onChange={(e) =>
            onChange({
              ...value,
              state: e.target.checked ? "PENDING" : "RECORDED",
              inputTotalCents: e.target.checked
                ? undefined
                : (toCents(amount) ?? undefined),
            })
          }
        />
        Costo pendiente
      </label>
      {value.state === "PENDING" ? (
        <p className="muted">
          Puedes registrar las piezas y completar su costo después. El promedio
          se mostrará incompleto.
        </p>
      ) : (
        <>
          <Field
            label="Costo total de estas piezas"
            htmlFor="costAmount"
            help="Importe de todas las piezas de esta refacción, no por pieza."
          >
            <Input
              id="costAmount"
              inputMode="decimal"
              required
              pattern="[0-9]+([.][0-9]{1,2})?"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                onChange({
                  ...value,
                  inputTotalCents: toCents(e.target.value) ?? undefined,
                });
              }}
              placeholder="0.00"
            />
          </Field>
          <div
            className="inventory-tax-options"
            role="group"
            aria-label="Tratamiento del importe"
          >
            {(["INCLUDED", "EXCLUDED"] as const).map((mode) => (
              <label key={mode} className="inventory-check">
                <input
                  type="radio"
                  name="taxMode"
                  required
                  checked={value.taxMode === mode}
                  onChange={() => onChange({ ...value, taxMode: mode })}
                />
                {mode === "INCLUDED"
                  ? "El importe incluye IVA"
                  : "El importe no incluye IVA"}
              </label>
            ))}
          </div>
          <div className="inventory-cost-row">
            <Field label="IVA (%)" htmlFor="costRate">
              <Input
                id="costRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                disabled={value.taxTreatment === "NO_TAX"}
                value={(value.rateBps ?? 1600) / 100}
                onChange={(e) =>
                  onChange({
                    ...value,
                    rateBps: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </Field>
            <label className="inventory-check">
              <input
                type="checkbox"
                checked={value.taxTreatment === "NO_TAX"}
                onChange={(e) =>
                  onChange({
                    ...value,
                    taxTreatment: e.target.checked ? "NO_TAX" : "TAXED",
                  })
                }
              />
              Sin IVA
            </label>
          </div>
          {result ? (
            <dl className="dl inventory-cost-preview" aria-live="polite">
              <dt>Subtotal sin IVA</dt>
              <dd>{money(result.netCents)}</dd>
              <dt>IVA</dt>
              <dd>{money(result.taxCents)}</dd>
              <dt>Total</dt>
              <dd className="mono">{money(result.totalCents)}</dd>
            </dl>
          ) : (
            <p className="muted">Indica el importe para revisar el desglose.</p>
          )}
        </>
      )}
    </fieldset>
  );
}
