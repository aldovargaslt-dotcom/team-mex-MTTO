"use client";
import Link from "next/link";
import { useState } from "react";
import { ReadStatus } from "@/components/ReadStatus";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";
import { useReadResource } from "@/lib/use-read-resource";
import { api } from "@/lib/api";
import { readinessTime } from "@/lib/unit-readiness";

export function UnitCheckHistory({ unitId }: { unitId: string }) {
  const { role, userId } = useRole();
  const [offset, setOffset] = useState(0);
  const read = useReadResource<{
    items: {
      id: string;
      result: string | null;
      signed: boolean;
      completedAt: string | null;
      dueAt: string | null;
      signer: string | null;
      href: string;
    }[];
    nextOffset: number | null;
  }>(
    role
      ? JSON.stringify([role, userId, unitId, offset, "check-history"])
      : null,
    () =>
      api(`/unit-readiness/${unitId}/history?offset=${offset}`, {
        role: role!,
        userId,
      }),
  );
  return (
    <section className="readiness-detail">
      <div className="readiness-section-head">
        <div>
          <p className="readiness-eyebrow">Evidencia de operabilidad</p>
          <h2>Historial de revisiones ABC</h2>
        </div>
      </div>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Cargando revisiones…"
        errorText="No se pudo cargar el historial de revisiones."
        retry={read.retry}
      />
      {read.data ? (
        read.data.items.length ? (
          <>
            <ul className="readiness-orders">
              {read.data.items.map((check) => (
                <li key={check.id}>
                  <div>
                    <strong>
                      {check.result === "FIT"
                        ? "Apta"
                        : check.result === "FIT_WITH_OBSERVATION"
                          ? "Apta con observaciones"
                          : check.result === "UNFIT"
                            ? "No apta"
                            : "Dictamen sin confirmar"}
                    </strong>
                    <p>
                      {readinessTime(check.completedAt)} ·{" "}
                      {check.signer || "Firmante no disponible"}
                    </p>
                    <small>
                      {check.signed
                        ? "Revisión firmada"
                        : "Firma sin confirmar"}{" "}
                      · Vencimiento registrado: {readinessTime(check.dueAt)}
                    </small>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={check.href}>Ver revisión</Link>
                  </Button>
                </li>
              ))}
            </ul>
            <div className="readiness-pagination">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 30))}
              >
                Más recientes
              </Button>
              <Button
                variant="outline"
                disabled={read.data.nextOffset === null}
                onClick={() => setOffset(read.data!.nextOffset!)}
              >
                Más antiguas
              </Button>
            </div>
          </>
        ) : (
          <p className="muted">
            Aún no hay revisiones ABC concluidas registradas.
          </p>
        )
      ) : null}
    </section>
  );
}
