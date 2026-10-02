"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, HttpError } from "@/lib/api";
import { useRole } from "@/lib/role";
import {
  CheckList,
  CheckSummary,
  checkStatus,
  checkErrorMessage,
  conflictCheck,
} from "@/lib/checks";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ActiveCheckDialog } from "./ActiveCheckDialog";
type Unit = { id: string; numeroInterno: string; placas: string | null };
export function CheckRequests() {
  const { role, userId } = useRole();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [list, setList] = useState<CheckList | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [active, setActive] = useState<CheckSummary | null>(null);
  const load = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const [rows, eligible] = await Promise.all([
        api<CheckList>("/checks?limit=5", { role, userId }),
        api<Unit[]>("/check-request-units", { role, userId }),
      ]);
      setList(rows);
      setUnits(eligible);
    } catch (e) {
      setList(null);
      setUnits([]);
      setError(checkErrorMessage(e, "No pudimos cargar los chequeos."));
    } finally {
      setLoading(false);
    }
  }, [role, userId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || saving || !role) return;
    setSaving(true);
    setRequestError(null);
    try {
      const check = await api<CheckSummary>(`/unidades/${selected}/checks`, {
        role,
        userId,
        method: "POST",
        body: JSON.stringify({ source: "LOGISTICS_MANUAL" }),
      });
      setOpen(false);
      router.push(`/checks/${check.id}`);
    } catch (e) {
      const winner =
        e instanceof HttpError &&
        e.status === 409 &&
        e.code === "ACTIVE_CHECK_ALREADY_EXISTS"
          ? conflictCheck(e.details?.active)
          : null;
      if (winner) {
        setOpen(false);
        setActive(winner);
        void load();
      } else
        setRequestError(
          checkErrorMessage(
            e,
            "No pudimos solicitar el chequeo. Intenta de nuevo.",
          ),
        );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section aria-labelledby="check-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="check-heading" className="text-sm font-semibold text-navy">
          Chequeos operativos
        </h2>
        <Button
          ref={trigger}
          variant="outline"
          disabled={loading || !units.length}
          onClick={() => {
            setRequestError(null);
            setSelected("");
            setOpen(true);
          }}
        >
          Solicitar chequeo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Solicita una revisión y consulta su avance. La captura técnica
        corresponde al mecánico.
      </p>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando chequeos…
        </p>
      ) : error ? (
        <>
          <FormAlert>{error}</FormAlert>
          <Button variant="secondary" onClick={() => void load()}>
            Reintentar
          </Button>
        </>
      ) : list ? (
        <>
          <p className="text-xs text-muted-foreground">
            {list.counts.active} activos · {list.counts.total} en tu alcance
          </p>
          {list.items.length ? (
            <ul className="divide-y rounded-md border bg-card">
              {list.items.map((check) => (
                <li key={check.id}>
                  <Link
                    href={`/checks/${check.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 p-3 text-sm hover:bg-muted/20 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span>
                      {check.unidad?.numeroInterno}
                      {check.unidad?.placas ? ` · ${check.unidad.placas}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {checkStatus[check.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay chequeos en tu alcance.
            </p>
          )}
          {list.nextCursor ? (
            <p className="text-xs text-muted-foreground">
              Se muestran 5 chequeos de esta consulta.
            </p>
          ) : null}
        </>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent
          className="[&>button]:min-h-11 [&>button]:min-w-11"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (!active) trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Solicitar chequeo</DialogTitle>
            <DialogDescription>
              Selecciona una unidad de tu alcance. Si ya tiene un chequeo
              activo, podrás consultarlo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Unidad" htmlFor="check-unit">
              <NativeSelect
                id="check-unit"
                required
                value={selected}
                disabled={saving}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecciona una unidad</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.numeroInterno} · {unit.placas}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <FormAlert>{requestError}</FormAlert>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !selected}>
                {saving ? "Solicitando…" : "Solicitar chequeo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ActiveCheckDialog
        check={active}
        onClose={() => setActive(null)}
        returnFocus={() => trigger.current?.focus()}
      />
    </section>
  );
}
