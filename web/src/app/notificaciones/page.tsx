"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeartPulse, Package, Truck, Wrench } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { ListFilter } from "@/components/ListFilter";
import { Button } from "@/components/ui/button";
import { FormAlert, PageHeader } from "@/components/ui/field";
import { api, HttpError } from "@/lib/api";
import { formatHace } from "@/lib/format";
import { notifyInboxChanged } from "@/lib/inbox";
import { useRole } from "@/lib/role";
import type { InboxItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTROS: { id: "unread" | "all"; label: string }[] = [
  { id: "unread", label: "No leídas" },
  { id: "all", label: "Todas" },
];

export default function NotificacionesPage() {
  return (
    <RoleGate allow={["SUPERVISOR", "ADMIN_DIRECTIVO", "LOGISTICA"]}>
      <InboxContent />
    </RoleGate>
  );
}

function InboxContent() {
  const router = useRouter();
  const { role, userId } = useRole();
  const [filtro, setFiltro] = useState<"unread" | "all">("unread");
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar(next = filtro) {
    const qs = next === "all" ? "?filter=all" : "";
    const data = await api<InboxItem[]>(`/notifications${qs}`, {
      role: role!,
      userId,
    });
    let checks: InboxItem[] = [];
    setCheckError(null);
    if (role === "LOGISTICA" || role === "ADMIN_DIRECTIVO") {
      try {
        checks = (
          await api<{ items: InboxItem[] }>(`/notifications/checks${qs}`, {
            role,
            userId,
          })
        ).items;
      } catch {
        setCheckError(
          "No pudimos cargar las alertas de chequeos. Verifica tu sesión y vuelve a intentar.",
        );
      }
    }
    setItems(
      [...data, ...checks].sort(
        (a, b) =>
          Number(!!a.readAt) - Number(!!b.readAt) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setItems([]);
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudieron cargar las alertas.",
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, filtro]);

  async function abrir(item: InboxItem) {
    setError(null);
    try {
      if (!item.readAt) {
        await api(
          `/notifications/${item.sourceModule === "CHECK" ? "checks/" : ""}${item.id}/read`,
          {
            role: role!,
            userId,
            method: "POST",
          },
        );
        notifyInboxChanged();
      }
      router.push(item.deeplinkPath);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudo abrir la notificación.",
      );
    }
  }

  async function marcarTodas() {
    setBusy(true);
    setError(null);
    try {
      await api("/notifications/read-all", {
        role: role!,
        userId,
        method: "POST",
      });
      if (role === "LOGISTICA" || role === "ADMIN_DIRECTIVO")
        await api("/notifications/checks/read-all", {
          role,
          userId,
          method: "POST",
        });
      notifyInboxChanged();
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudieron marcar como leídas.",
      );
    } finally {
      setBusy(false);
    }
  }

  const unreadCount = items?.filter((item) => !item.readAt).length ?? 0;

  return (
    <>
      <PageHeader
        title="Alertas"
        lede="Avisos de mantenimiento, inventario, salud de unidad flota sin regreso y chequeos operativos. Tocar una fila la marca leída y abre el destino."
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={() => void marcarTodas()}
            >
              Marcar todas leídas
            </Button>
          ) : null
        }
      />
      <ListFilter
        label="Filtro de alertas"
        value={filtro}
        options={FILTROS}
        onChange={setFiltro}
      />
      <FormAlert>{error}</FormAlert>
      {checkError ? (
        <div>
          <FormAlert>{checkError}</FormAlert>
          <Button
            variant="secondary"
            onClick={() =>
              void cargar().catch(() =>
                setError("No pudimos cargar las alertas."),
              )
            }
          >
            Reintentar
          </Button>
        </div>
      ) : null}
      {items == null ? (
        <p className="muted">Cargando alertas…</p>
      ) : items.length === 0 ? (
        <p className="muted">Sin alertas.</p>
      ) : (
        <ul className="inbox-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn("inbox-row", !item.readAt && "unread")}
                onClick={() => void abrir(item)}
              >
                <span className="inbox-icon" aria-hidden>
                  {item.sourceModule === "INVENTARIO" ? (
                    <Package className="size-4" />
                  ) : item.sourceModule === "SALUD" ? (
                    <HeartPulse className="size-4" />
                  ) : item.sourceModule === "LOGISTICA" ? (
                    <Truck className="size-4" />
                  ) : (
                    <Wrench className="size-4" />
                  )}
                </span>
                <span className="inbox-copy">
                  <span className="inbox-title">{item.title}</span>
                  <span className="inbox-body">{item.body}</span>
                </span>
                <span className="inbox-meta">
                  <time dateTime={item.createdAt}>
                    {formatHace(item.createdAt)}
                  </time>
                  {!item.readAt ? (
                    <span className="inbox-dot" title="No leída" />
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
