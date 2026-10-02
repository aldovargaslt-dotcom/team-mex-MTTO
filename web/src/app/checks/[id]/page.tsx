"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/lib/role";
import { CheckSummary, checkSources, checkErrorMessage } from "@/lib/checks";
import { CheckFacts } from "@/components/ActiveCheckDialog";
import { Button } from "@/components/ui/button";
import { FormAlert, PageHeader } from "@/components/ui/field";
export default function CheckReadPage() {
  const { id } = useParams<{ id: string }>();
  const { role, userId, ready } = useRole();
  const [check, setCheck] = useState<CheckSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setCheck(null);
    setError(null);
    try {
      setCheck(
        await api<CheckSummary>(`/checks/${id}`, { role: role ?? "", userId }),
      );
    } catch (e) {
      setError(checkErrorMessage(e, "No pudimos cargar el chequeo."));
    } finally {
      setLoading(false);
    }
  }, [id, role, userId, ready]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-3">
      <PageHeader
        title={
          check
            ? `Chequeo · ${check.unidad?.numeroInterno ?? ""}`
            : "Chequeo operativo"
        }
        lede="Consulta del chequeo. La revisión técnica corresponde al mecánico."
        actions={
          <Button asChild variant="secondary">
            <Link href="/logistica">Volver a Logística</Link>
          </Button>
        }
      />
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando chequeo…
        </p>
      ) : error ? (
        <>
          <FormAlert>{error}</FormAlert>
          <Button variant="secondary" onClick={() => void load()}>
            Reintentar
          </Button>
        </>
      ) : check ? (
        <section
          aria-label="Resumen del chequeo"
          className="space-y-4 rounded-md border bg-card p-4"
        >
          <CheckFacts check={check} />
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Origen</dt>
              <dd>
                {check.source
                  ? (checkSources[check.source] ?? "Chequeo operativo")
                  : "Chequeo operativo"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jornada</dt>
              <dd>{check.operationalDate} · Ciudad de México</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={() => void load()}>
            Actualizar
          </Button>
        </section>
      ) : null}
    </div>
  );
}
