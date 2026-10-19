"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  History,
  List,
  Wrench,
} from "lucide-react";
import { OrderSafetyControls } from '@/components/OrderSafetyControls';
import { OrderIdentity } from "@/components/OrderIdentity";
import { OrderDocumentHeader } from "@/components/OrderDocumentHeader";
import { OperationalToolbar } from "@/components/OperationalToolbar";
import { ListFilter } from "@/components/ListFilter";
import { UnidadMarca } from "@/components/UnidadTipoMark";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { MaintenanceTypeBadge } from "@/components/MaintenanceTypeBadge";
import { PageHeader } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, HttpError } from "@/lib/api";
import { useRole } from "@/lib/role";
import type { VisitaDetalle } from "@/lib/types";
type Cola = "abiertas" | "borradores" | "cerradas";
type Kind = "todos" | "CORRECTIVE" | "PREVENTIVE" | "CHECK";
type Order = {
  id: string;
  unidadId: string;
  type: Exclude<Kind, "todos">;
  unit: { numeroInterno: string; placas: string; fotoDataUrl?: string | null };
  status: string;
  version: number;
  assignedActor: string | null;
  createdAt: string;
  openedAt: string | null;
};


const ACTIVE = ["PENDING", "ASSIGNED", "IN_PROGRESS"];
function phase(o: Order): Cola | null {
  return o.status === "COMPLETED"
    ? "cerradas"
    : !ACTIVE.includes(o.status)
      ? null
      : o.type === "CHECK" || o.openedAt
        ? "abiertas"
        : "borradores";
}
export default function MiTrabajoPage() {
  return (
    <RoleGate allow={["MECANICO"]}>
      <Suspense fallback={<p className="muted">Cargando órdenes…</p>}>
        <WorkQueue />
      </Suspense>
    </RoleGate>
  );
}
function WorkQueue() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cola: Cola =
    params.get("cola") === "cerradas"
      ? "cerradas"
      : params.get("cola") === "borradores"
        ? "borradores"
        : "abiertas";
  const rawType = params.get("tipo");
  const type: Kind =
    rawType === "CORRECTIVE" || rawType === "PREVENTIVE" || rawType === "CHECK"
      ? rawType
      : "todos";
  const requestVersion = useRef(0);
  const detailVersion = useRef(0);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detail, setDetail] = useState<VisitaDetalle | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  function navigate(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  const load = useCallback(async () => {
    if (!role) return;
    const version = ++requestVersion.current;
    setOrders(null);
    setError(null);
    const read = async (path: string) => {
      const items: Order[] = [];
      const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page: { items: Order[]; nextCursor: string | null } = await api(
          `${path}${path.includes("?") ? "&" : "?"}limit=100${cursor ? `&cursor=${cursor}` : ""}`,
          { role, userId },
        );
        items.push(...page.items);
        cursor = page.nextCursor;
        if (cursor && seen.has(cursor))
          throw new Error("No se pudo completar la lectura.");
        if (cursor) seen.add(cursor);
      } while (cursor);
      return items;
    };
    const results = await Promise.allSettled([
      read("/mantenimiento-ordenes"),
      read(`/checks?scope=mine-or-eligible&cola=${cola}`),
    ]);
    if (version !== requestVersion.current) return;
    setOrders(
      results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      ),
    );
    const failed = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [index ? "revisiones" : "mantenimiento"]
        : [],
    );
    if (failed.length)
      setError(
        `No se pudo cargar ${failed.join(" y ")}. Se muestran las órdenes disponibles.`,
      );
  }, [role, userId, cola]);
  const invalidate = useCallback(() => {
    requestVersion.current++;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  const current = (orders ?? [])
    .filter((o) => phase(o) === cola)
    .sort(
      (a, b) =>
        Number(b.status === "IN_PROGRESS") -
          Number(a.status === "IN_PROGRESS") ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  const visible = current.filter((o) => type === "todos" || o.type === type);
  const options = [
    { id: "todos" as const, icon: List, label: `Todos (${current.length})` },
    {
      id: "CORRECTIVE" as const,
      icon: Wrench,
      label: `Correctivo (${current.filter((o) => o.type === "CORRECTIVE").length})`,
    },
    {
      id: "PREVENTIVE" as const,
      icon: CalendarCheck,
      label: `Preventivo (${current.filter((o) => o.type === "PREVENTIVE").length})`,
    },
    {
      id: "CHECK" as const,
      icon: ClipboardCheck,
      label: `Revisión (${current.filter((o) => o.type === "CHECK").length})`,
    },
  ];
  async function command(o: Order, action: "claim" | "start" | "open") {
    setBusy(o.id);
    setError(null);
    setOpeningError(null);
    try {
      await api(
        action === "open"
          ? `/mantenimiento-ordenes/${o.id}/abrir`
          : `/checks/${o.id}/${action}`,
        {
          role: role!,
          userId,
          method: "POST",
          body: JSON.stringify(
            action === "open" ? {} : { expectedVersion: o.version },
          ),
        },
      );
      await load();
      if (action === "open") { detailVersion.current++; setDetailOpen(false); navigate({ cola: null }); }
    } catch (err) {
      const message = err instanceof HttpError ? err.message : "No se pudo actualizar la orden.";
      if (action === "open") setOpeningError(message);
      else setError(message);
    } finally {
      setBusy(null);
    }
  }
  async function view(o: Order, trigger: HTMLButtonElement) {
    detailTrigger.current = trigger;
    const version = ++detailVersion.current;
    setSelectedOrder(o);
    setOpeningError(null);
    setDetail(null);
    setDetailError(null);
    setDetailOpen(true);
    try {
      const next = await api<VisitaDetalle>(`/mantenimiento-ordenes/${o.id}`, {
        role: role!,
        userId,
      });
      if (version === detailVersion.current) setDetail(next);
    } catch (err) {
      if (version === detailVersion.current)
        setDetailError(
          err instanceof HttpError
            ? err.message
            : "No se pudo abrir el registro.",
        );
    }
  }
  return (
    <>
      <div className="work-queue-header">
      <PageHeader
        title={
          cola === "abiertas"
            ? "Órdenes abiertas"
            : cola === "borradores"
              ? "Borradores"
              : "Historial de cerradas"
        }
        actions={<Button variant="secondary" aria-pressed={cola === "cerradas"}
          onClick={() => navigate({ cola: cola === "cerradas" ? null : "cerradas" })}>
          <History className="size-4" aria-hidden />{cola === "cerradas" ? "Volver a abiertas" : "Historial"}
        </Button>}
        lede={
          cola === "abiertas"
            ? "Trabajo listo para atender en tu patio."
            : cola === "borradores"
              ? "Confirma Abrir orden cuando esté lista para trabajar."
              : "Registro de mantenimiento y revisiones concluidas."
        }
      />
      </div>
      <OperationalToolbar label="Filtros de Mi trabajo" className="maintenance-work-tools">
        <div><p className="operational-toolbar__label">Cola de órdenes</p>
      <div className="maintenance-queue mb-3 inline-flex rounded-md border border-border bg-card p-1" aria-label="Cola de órdenes">
        {(["abiertas", "borradores"] as const).map((queue) => (
          <Button key={queue} variant="quiet" aria-pressed={cola === queue}
            className={cola === queue ? "maintenance-queue__selected" : ""}
            onClick={() => navigate({ cola: queue === "abiertas" ? null : queue })}>
            {queue === "abiertas" ? "Abiertas" : "Borradores"}
            {orders && cola !== "cerradas" ? ` (${orders.filter((o) => phase(o) === queue).length})` : ""}
          </Button>
        ))}
      </div>
        </div>
        <div><p className="operational-toolbar__label">Tipo de orden</p>
      {orders ? (
        <ListFilter
          label="Tipo de orden"
          value={type}
          options={options}
          className="mb-4 grid grid-cols-2 sm:flex"
          onChange={(next) =>
            navigate({ tipo: next === "todos" ? null : next })
          }
        />
      ) : (
        <p className="muted">Cargando órdenes…</p>
      )}
        </div>
      </OperationalToolbar>
      {error ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button variant="secondary" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {orders && !visible.length ? (
        <div className="empty-state">
          <h2>
            {error
              ? "Sin resultados disponibles para este filtro."
              : "No hay órdenes en esta vista."}
          </h2>
          <p className="muted">
            {error
              ? "Reintenta para completar la consulta."
              : type !== "todos"
                ? "Prueba otro tipo de orden."
                : cola === "abiertas"
                  ? "Las órdenes listas para trabajar aparecerán aquí."
                  : "Los registros se muestran dentro de tu patio autorizado."}
          </p>
        </div>
      ) : null}
      <ul className="grid gap-3">
        {visible.map((o, index) => {
          const own = o.assignedActor === userId;
          const inProgress =
            o.type === "CHECK" && own && o.status === "IN_PROGRESS";
          const action =
            cola === "cerradas"
              ? null
              : o.type !== "CHECK"
                ? cola === "borradores"
                  ? "open"
                  : null
                : o.status === "PENDING" && !o.assignedActor
                  ? "claim"
                  : o.status === "ASSIGNED" && own
                    ? "start"
                    : null;
          return (
            <li
              key={o.id}
              className="maintenance-work-row rounded-md border border-border bg-card p-3"
            >
              {(() => {
                const identity = <>
                  <OrderIdentity id={o.id} check={o.type === "CHECK"} />
                  <span className="mt-3 flex w-full items-center gap-3">
                    <UnidadMarca foto={o.unit.fotoDataUrl} size="lg" nombre="Unidad" className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-navy">{o.unit.numeroInterno}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{o.unit.placas}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <MaintenanceTypeBadge type={o.type} />
                        <span className="text-xs text-muted-foreground">
                          {cola === "cerradas" ? o.type === "CHECK" ? "Concluida" : "Cerrada"
                            : cola === "borradores" ? "Borrador" : o.status === "IN_PROGRESS" ? "En curso" : "Abierta"}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </span>
                </>;
                const className = "block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
                return o.type === "CHECK" ? (
                  <Link href={`/checks/${o.id}`} className={className}>{identity}</Link>
                ) : (
                  <button type="button" className={className} onClick={(event) => void view(o, event.currentTarget)}>{identity}</button>
                );
              })()}
              {action && action !== "open" ? (
                <Button
                  className="mt-3 w-full"
                  variant={index === 0 ? "default" : "outline"}
                  disabled={busy === o.id}
                  onClick={() => void command(o, action)}
                >
                  {busy === o.id
                    ? "Procesando…"
                    : action === "claim"
                        ? "Tomar revisión"
                        : "Iniciar revisión"}
                </Button>
              ) : null}
              {inProgress ? (
                <Button
                  asChild
                  className="mt-3 w-full"
                  variant={index === 0 ? "default" : "outline"}
                >
                  <Link href={`/checks/${o.id}`}>Continuar revisión</Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) detailVersion.current++;
          setDetailOpen(open);
        }}
      >
        <SheetContent onCloseAutoFocus={(event) => {
          if (detailTrigger.current?.isConnected) {
            event.preventDefault();
            detailTrigger.current.focus();
          }
        }}>
          <SheetHeader>
            <SheetTitle>Orden de trabajo</SheetTitle>
            <SheetDescription>
              Consulta del registro en tu patio.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {detailError ? (
            <p role="alert" className="mt-4 px-4 text-sm text-destructive">
              {detailError}
            </p>
          ) : !detail ? (
            <p className="muted mt-4 px-4">Cargando orden…</p>
          ) : (
            <div className="mt-4 space-y-3 px-4">
              <OrderDocumentHeader id={detail.id} stateLabel={detail.estado === 'CERRADO' ? 'Cerrada' : detail.openedAt ? 'Abierta' : 'Borrador'} stateTone={detail.estado === 'CERRADO' ? 'success' : 'muted'} />
              <OrderSafetyControls key={detail.id} unitId={detail.unidadId} orderId={detail.id} closed={detail.estado === "CERRADO"} />
              {openingError ? <p role="alert" className="text-sm text-destructive">{openingError}</p> : null}
              {selectedOrder && phase(selectedOrder) === "borradores" && detail.estado === "BORRADOR" && !detail.openedAt ? (
                <Button className="w-full" disabled={busy === selectedOrder.id}
                  onClick={() => void command(selectedOrder, "open")}>
                  {busy === selectedOrder.id ? "Procesando…" : "Abrir orden"}
                </Button>
              ) : null}
              <h2 className="text-sm font-semibold text-navy">
                {detail.unidadNumeroInterno}
              </h2>
              <p className="text-sm">
                {detail.tipo === "CORRECTIVO" ? "Correctivo" : "Preventivo"} ·{" "}
                {detail.estado === "CERRADO"
                  ? "Cerrada"
                  : detail.openedAt
                    ? "Abierta"
                    : "Borrador"}
              </p>
              <p className="text-xs text-muted-foreground">
                {detail.chofer?.nombre ?? "Sin chofer registrado"}
                {detail.km != null
                  ? ` · ${detail.km.toLocaleString("es-MX")} km`
                  : ""}
              </p>
              <h3 className="text-xs font-semibold text-navy">
                Trabajos registrados
              </h3>
              {detail.trabajos?.length ? (
                <ul className="space-y-2 text-sm">
                  {detail.trabajos.map((work, i) => (
                    <li key={i}>{work.item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Sin trabajos registrados.</p>
              )}
              {detail.observaciones ? (
                <p className="text-sm">{detail.observaciones}</p>
              ) : null}
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
