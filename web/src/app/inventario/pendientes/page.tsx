"use client";

import { useEffect, useState } from "react";
import { ReadStatus } from "@/components/ReadStatus";
import { useReadResource } from "@/lib/use-read-resource";
import { api, HttpError } from "@/lib/api";
import {
  etiquetaEstadoPendiente,
  etiquetaUom,
  formatFecha,
} from "@/lib/format";
import { useRole } from "@/lib/role";
import type { PendienteComprobante } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { CostOperation } from "@/lib/inventory-costs";
import { InventoryCostPanel } from "@/components/InventoryCostPanel";
import { ImageDropzone } from "@/components/ImageDropzone";
import { OtLink, useOtLabels } from "@/components/OtLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert, PageHeader } from "@/components/ui/field";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PendientesPage() {
  const { role, userId } = useRole();
  const read = useReadResource(
    role ? JSON.stringify([role, userId, "pendientes"]) : null,
    () =>
      api<PendienteComprobante[]>("/inventario/pendientes-comprobante", {
        role: role!,
        userId,
      }),
  );
  const rows = read.data ?? [];
  const setRows = read.setData;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDIENTE");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId);
  const [costRows, setCostRows] = useState<Record<string, CostOperation[]>>({});
  const [costAttempt, setCostAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setCostRows({});
    if (!read.data || !role) return;
    const ids = [...new Set(read.data.map((row) => row.visitaId))];
    void Promise.allSettled(
      ids.map(async (id) => {
        const result = await api<{ operations: CostOperation[] }>(
          `/inventario/costos/consumos?visitaId=${id}`,
          { role, userId },
        );
        return [id, result.operations] as const;
      }),
    ).then((results) => {
      if (active)
        setCostRows(
          Object.fromEntries(
            results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
          ),
        );
    });
    return () => {
      active = false;
    };
  }, [read.data, role, userId, costAttempt]);
  const [ticketFor, setTicketFor] = useState<string | null>(null);
  const labels = useOtLabels(
    rows.map((row) => row.visitaId),
    { role, userId },
  );

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("pendienteId");
    if (!id) return;
    setSelectedId(id);
    const target = document.getElementById(`pendiente-${id}`);
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [read.data]);

  async function adjuntar(id: string, file: File) {
    setBusyId(id);
    setError(null);
    try {
      const dataUrl = await readFile(file);
      const updated = await api<PendienteComprobante>(
        `/inventario/pendientes-comprobante/${id}/ticket`,
        {
          role: role!,
          userId,
          method: "POST",
          body: JSON.stringify({ dataUrl }),
        },
      );
      setRows((current) =>
        (current ?? []).map((row) => (row.id === id ? updated : row)),
      );
      setTicketFor(null);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudo adjuntar el ticket.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function recibir(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await api<PendienteComprobante>(
        `/inventario/pendientes-comprobante/${id}/recibir`,
        { role: role!, userId, method: "POST" },
      );
      setRows((current) =>
        (current ?? []).map((row) => (row.id === id ? updated : row)),
      );
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudo marcar como recibida.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Comprobantes"
        lede="Documenta las compras externas utilizadas en órdenes. Recibir un comprobante no modifica existencias."
      />
      <div className="inventory-toolbar">
        <div
          className="list-filter"
          role="group"
          aria-label="Estado documental"
        >
          {[
            ["PENDIENTE", "Pendientes"],
            ["RECIBIDA", "Recibidos"],
            ["ALL", "Todos"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="control"
          aria-label="Buscar comprobante"
          placeholder="Refacción o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <FormAlert>{error}</FormAlert>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Cargando comprobantes…"
        errorText="No se pudieron cargar los comprobantes."
        retry={read.retry}
      />
      {read.data === null ? null : rows.length > 0 ? (
        <div className="card overflow-hidden">
          {!rows.some(
            (row) =>
              (filter === "ALL" || row.estado === filter) &&
              `${row.sku} ${row.nombre}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          ) ? (
            <div className="empty-state">
              No hay comprobantes con estos filtros.{" "}
              <Button
                variant="outline"
                onClick={() => {
                  setFilter("ALL");
                  setSearch("");
                }}
              >
                Quitar filtros
              </Button>
            </div>
          ) : null}
          {rows
            .filter(
              (row) =>
                (filter === "ALL" || row.estado === filter) &&
                `${row.sku} ${row.nombre}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((row) => {
              const abierto = row.estado === "PENDIENTE";
              const operations = costRows[row.visitaId]?.filter(
                (op) => op.itemId === row.itemId && op.kind === "EXTERNAL",
              );
              const costStatus = !operations
                ? "Costo no disponible"
                : !operations.length ||
                    operations.some((op) => op.netCents == null)
                  ? "Costo pendiente"
                  : "Costo registrado";
              return (
                <div
                  key={row.id}
                  id={`pendiente-${row.id}`}
                  tabIndex={-1}
                  className="queue-row scroll-mt-20 target:bg-[#fff4e8]"
                >
                  <div>
                    <p>
                      <span className="mono">{row.sku}</span> {row.nombre} ·{" "}
                      {row.qty} {etiquetaUom("pieza")}
                    </p>
                    <p className="muted">
                      {formatFecha(row.createdAt)} ·{" "}
                      <OtLink visitaId={row.visitaId} labels={labels} />
                    </p>
                    {row.ticketDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.ticketDataUrl}
                        alt={`Ticket ${row.sku}`}
                        className="mt-1 max-h-16 rounded-md border border-border"
                      />
                    ) : null}
                    {ticketFor === row.id ? (
                      <div className="mt-2">
                        <ImageDropzone
                          label="Tomar o subir"
                          hint="Foto del ticket"
                          disabled={busyId === row.id}
                          onFile={(file) => void adjuntar(row.id, file)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <span className="muted">{costStatus}</span>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedId(row.id)}
                    >
                      Ver detalle
                    </Button>
                    <Badge variant={abierto ? "warning" : "success"}>
                      {etiquetaEstadoPendiente(row.estado)}
                    </Badge>
                    <>
                      <Button
                        type="button"
                        size="compact"
                        variant="secondary"
                        disabled={busyId === row.id}
                        onClick={() =>
                          setTicketFor(ticketFor === row.id ? null : row.id)
                        }
                      >
                        {row.ticketDataUrl
                          ? "Agregar comprobante"
                          : "Adjuntar comprobante"}
                      </Button>
                      {abierto ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="compact"
                          disabled={busyId === row.id}
                          onClick={() => void recibir(row.id)}
                        >
                          Marcar comprobante recibido
                        </Button>
                      ) : null}
                    </>
                  </div>
                </div>
              );
            })}
        </div>
      ) : !read.error ? (
        <div className="empty-state">
          <h2>Sin comprobantes registrados.</h2>
          <p className="muted">
            Aquí aparecen los comprobantes de compras externas utilizadas en
            órdenes.
          </p>
        </div>
      ) : null}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busyId) setSelectedId(null);
        }}
      >
        <SheetContent className="inventory-detail-sheet overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle del comprobante</SheetTitle>
            <SheetDescription>
              El estado documental y el costo se registran por separado.
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="space-y-4 p-4">
              <h3>{selected.nombre}</h3>
              <p className="muted">
                {selected.sku} · {selected.qty} piezas ·{" "}
                {formatFecha(selected.createdAt)}
              </p>
              <OtLink visitaId={selected.visitaId} labels={labels} />
              <Badge
                variant={selected.estado === "RECIBIDA" ? "success" : "warning"}
              >
                {etiquetaEstadoPendiente(selected.estado)}
              </Badge>
              {selected.ticketDataUrl ? (
                <a
                  href={selected.ticketDataUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver comprobante adjunto
                </a>
              ) : (
                <p className="muted">Sin comprobante adjunto.</p>
              )}
              <ImageDropzone
                label="Tomar o subir"
                hint="Foto del comprobante"
                disabled={busyId === selected.id}
                onFile={(file) => void adjuntar(selected.id, file)}
              />
              {selected.estado === "PENDIENTE" ? (
                <Button
                  variant="outline"
                  disabled={Boolean(busyId)}
                  onClick={() => void recibir(selected.id)}
                >
                  Marcar comprobante recibido
                </Button>
              ) : null}
              <FormAlert>{error}</FormAlert>
              <InventoryCostPanel
                key={selected.id}
                itemId={selected.itemId}
                externalVisitId={selected.visitaId}
                onChanged={() => setCostAttempt((n) => n + 1)}
                role={role!}
                userId={userId}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
