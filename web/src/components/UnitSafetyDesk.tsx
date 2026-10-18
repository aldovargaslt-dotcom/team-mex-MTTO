"use client";
import { useState } from "react";
import { OrderSafetyControls } from "@/components/OrderSafetyControls";
import { ReadStatus } from "@/components/ReadStatus";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import { useRole } from "@/lib/role";
import { api } from "@/lib/api";
import { useReadResource } from "@/lib/use-read-resource";
import { type ReadinessSnapshot, orderTypeLabel } from "@/lib/unit-readiness";

export function UnitSafetyDesk({ unitId }: { unitId: string }) {
  const { role, userId } = useRole();
  const [orderId, setOrderId] = useState("");
  const read = useReadResource<ReadinessSnapshot>(
    role ? JSON.stringify([role, userId, unitId, "tower-safety"]) : null,
    () => api(`/unit-readiness/${unitId}`, { role: role!, userId }),
  );
  const orders =
    read.data?.items[0]?.orders.filter((o) => o.type !== "CHECK") ?? [];
  return (
    <section className="readiness-detail">
      <h2>Seguridad de la unidad</h2>
      <p className="readiness-caption">
        Registre una retención contra la orden que documenta la falla. La
        liberación técnica corresponde al mecánico.
      </p>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Consultando órdenes de la unidad…"
        errorText="No se pudieron consultar las órdenes."
        retry={read.retry}
      />
      {read.data ? (
        orders.length ? (
          <>
            <Field
              label="Orden que documenta el problema"
              htmlFor="tower-safety-order"
            >
              <NativeSelect
                id="tower-safety-order"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <option value="">Seleccione una orden</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {orderTypeLabel(o.type)} · {o.id.slice(0, 8)} ·{" "}
                    {o.problem || "Consultar orden"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {orderId ? (
              <OrderSafetyControls
                key={orderId}
                unitId={unitId}
                orderId={orderId}
                closed={false}
              />
            ) : null}
          </>
        ) : (
          <p className="muted">
            No hay órdenes de mantenimiento activas. Solicite una orden al
            Supervisor para documentar la falla.
          </p>
        )
      ) : null}
    </section>
  );
}
