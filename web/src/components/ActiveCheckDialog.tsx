"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import { CheckSummary, checkStatus } from "@/lib/checks";
import { formatHace } from "@/lib/format";
export function CheckFacts({ check }: { check: CheckSummary }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-navy">
        {check.unidad?.numeroInterno}
        {check.unidad?.placas ? ` · ${check.unidad.placas}` : ""}
      </p>
      <p className="break-all text-xs text-muted-foreground">{check.folio}</p>
      <Badge variant={check.status === "IN_PROGRESS" ? "info" : "muted"}>
        {checkStatus[check.status]}
      </Badge>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Asignación</dt>
        <dd>{check.assignedActor ? "Mecánico asignado" : "Sin asignar"}</dd>
        <dt className="text-muted-foreground">Inicio</dt>
        <dd>
          {check.startedAt ? (
            <time dateTime={check.startedAt}>
              {formatHace(check.startedAt)}
            </time>
          ) : (
            "Aún no inicia"
          )}
        </dd>
        {check.step !== null && check.step !== undefined ? (
          <>
            <dt className="text-muted-foreground">Avance</dt>
            <dd>Paso {check.step} de 4</dd>
          </>
        ) : null}
      </dl>
      {check.anomalySummary ? (
        <p className="text-sm">{check.anomalySummary}</p>
      ) : null}
    </div>
  );
}
export function ActiveCheckDialog({
  check,
  onClose,
  returnFocus,
}: {
  check: CheckSummary | null;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const facts = check ? (
    <>
      <CheckFacts check={check} />
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button asChild>
          <Link href={`/checks/${check.id}`}>Ver chequeo activo</Link>
        </Button>
      </div>
    </>
  ) : null;
  if (mobile)
    return (
      <Sheet
        open={!!check}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto [&>button]:min-h-11 [&>button]:min-w-11"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus();
          }}
        >
          <SheetHeader>
            <SheetTitle>Chequeo activo</SheetTitle>
            <SheetDescription>
              Esta unidad ya tiene un chequeo activo.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {facts}
          </div>
        </SheetContent>
      </Sheet>
    );
  return (
    <Dialog
      open={!!check}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="[&>button]:min-h-11 [&>button]:min-w-11"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Chequeo activo</DialogTitle>
          <DialogDescription>
            Esta unidad ya tiene un chequeo activo.
          </DialogDescription>
        </DialogHeader>
        {facts}
      </DialogContent>
    </Dialog>
  );
}
