"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { analysisReturn } from "@/lib/inventory-analysis";
import { useRouter, useSearchParams } from "next/navigation";
import { inPeriodoIso } from "@/lib/consumo-totales";
import { Input } from "@/components/ui/input";
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
import { InventoryResultCount } from "@/components/inventario/InventoryResultCount";
import { Field, FormAlert, PageHeader } from "@/components/ui/field";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PendientesPage() {
  return <Suspense fallback={<p role="status" className="muted">Cargando comprobantes…</p>}><PendientesContent /></Suspense>;
}
function PendientesContent() {
  const params = useSearchParams();
  const router = useRouter();
  const item = params.get('item');
  const returnToAnalysis = analysisReturn(params.get('analisis'));
  const from = params.get('from');
  const to = params.get('to');
  const { role, userId } = useRole();
  const read = useReadResource(
    role ? JSON.stringify([role, userId, "pendientes"]) : null,
    () =>
      api<PendienteComprobante[]>("/inventario/pendientes-comprobante", {
        role: role!,
        userId,
      }),
  );
  const rows = useMemo(() => read.data ?? [], [read.data]);
  const setRows = read.setData;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState(item ? "ALL" : "PENDIENTE");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId);
  const [costRows, setCostRows] = useState<Record<string, CostOperation[]>>({});
  const [costAttempt, setCostAttempt] = useState(0);
  const [costLoading, setCostLoading] = useState(false);
  const scopedRows = useMemo(() => rows.filter((row) =>
    (!item || row.itemId === item) && (!(from || to) || inPeriodoIso(row.createdAt, from ?? '0001-01-01', to ?? '9999-12-31')),
  ), [rows, item, from, to]);
  const visibleRows = useMemo(() => scopedRows.filter((row) =>
    (filter === "ALL" || row.estado === filter) && `${row.nombre} ${row.sku}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')),
  ), [scopedRows, filter, search]);
  const costIds = [...new Set(visibleRows.map((row) => row.visitaId))].sort().join(',');
  useEffect(() => {
    let active = true;
    setCostRows({});
    if (!role || !costIds) { setCostLoading(false); return; }
    setCostLoading(true);
    const ids = costIds.split(',');
    const entries: Array<readonly [string, CostOperation[]]> = [];
    async function worker() {
      while (ids.length) {
        const id = ids.shift()!;
        try {
          const result = await api<{ operations: CostOperation[] }>(`/inventario/costos/consumos?visitaId=${id}`, { role: role!, userId });
          if (!active) return;
          entries.push([id, result.operations]);
        } catch { if (!active) return; }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker)).then(() => {
      if (active) { setCostRows(Object.fromEntries(entries)); setCostLoading(false); }
    });
    return () => { active = false; };
  }, [costIds, role, userId, costAttempt, read.data]);
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
    <div className="supervisor-visual-pilot comprobantes-pilot">
      <PageHeader
        title="Comprobantes"
        lede="Gestiona documentos, archivos y costos de las compras externas."
      />
      {returnToAnalysis ? <div className="mb-3"><Button asChild variant="outline"><Link href={returnToAnalysis}>Volver a Análisis</Link></Button></div> : null}
      <div className="inventory-toolbar inventory-comprobantes-toolbar">
        <Field label="Buscar compra externa" htmlFor="comprobante-search" className="inventory-search">
          <Input id="comprobante-search" type="search" placeholder="Nombre o SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Field>
        <div className="inventory-filter-field"><span className="inventory-filter-label">Estado documental</span>
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
              {label}{read.data !== null ? ` (${value === 'ALL' ? scopedRows.length : scopedRows.filter((row) => row.estado === value).length})` : ''}
            </button>
          ))}
        </div>
        </div>
      </div>
      {item || from || to ? <div className="inventory-scope-note"><span>{item ? (rows.find((row) => row.itemId === item)?.nombre ?? 'Refacción seleccionada') : 'Compras externas'}{from && to ? ` · ${from} al ${to}` : from ? ` · Desde ${from}` : to ? ` · Hasta ${to}` : ''}</span><Button variant="secondary" onClick={() => { setFilter('ALL'); router.replace('/inventario/pendientes'); }}>Quitar filtro de origen</Button></div> : null}
      <FormAlert>{selected ? null : error}</FormAlert>
      <ReadStatus
        loading={read.loading}
        error={read.error}
        loadingText="Cargando comprobantes…"
        errorText="No se pudieron cargar los comprobantes."
        retry={read.retry}
      />
      {read.data !== null ? <InventoryResultCount count={visibleRows.length} total={scopedRows.length} singular="compra externa" plural="compras externas" /> : null}
      {read.data === null ? null : rows.length > 0 ? (
        <div className="card inventory-doc-list">
          <div className="inventory-doc-head" aria-hidden="true"><span>Compra externa</span><span>Documento</span><span>Archivo</span><span>Costo</span><span>Acción</span></div>
          {visibleRows.length === 0 ? <div className="empty-state">No hay compras externas con estos filtros. <Button variant="outline" onClick={() => { setFilter('ALL'); setSearch(''); router.replace('/inventario/pendientes'); }}>Quitar filtros</Button></div> : null}
          {visibleRows.map((row) => {
            const operations = costRows[row.visitaId]?.filter((op) => op.itemId === row.itemId && op.kind === 'EXTERNAL');
            const costStatus = costLoading ? 'Consultando…' : !operations ? 'No disponible' : !operations.length || operations.some((op) => op.netCents == null) ? 'Pendiente' : 'Registrado';
            return <div key={row.id} id={`pendiente-${row.id}`} tabIndex={-1} className="inventory-doc-row scroll-mt-20">
              <div className="inventory-identity">
                <button type="button" className="inventory-object-link" onClick={() => { setError(null); setSelectedId(row.id); }} aria-label={`Revisar compra externa de ${row.nombre}`}>{row.nombre}</button>
                <span className="inventory-secondary">{row.sku} · <span className="whitespace-nowrap">{row.qty} {etiquetaUom('pieza')}</span></span>
                <span className="inventory-secondary">{formatFecha(row.createdAt)} · <OtLink visitaId={row.visitaId} labels={labels} compact /></span>
              </div>
              <div className="inventory-doc-fact"><span className="inventory-doc-label">Documento</span><Badge variant={row.estado === 'PENDIENTE' ? 'warning' : 'success'}>{etiquetaEstadoPendiente(row.estado)}</Badge></div>
              <div className="inventory-doc-fact"><span className="inventory-doc-label">Archivo</span><span className="text-xs">{row.ticketDataUrl ? 'Adjunto' : 'Sin archivo'}</span></div>
              <div className="inventory-doc-fact"><span className="inventory-doc-label">Costo</span><span className="text-xs text-muted-foreground">{costStatus}</span></div>
              <Button type="button" size="compact" variant="secondary" onClick={() => { setError(null); setSelectedId(row.id); }} aria-label={`${row.ticketDataUrl ? 'Revisar comprobante' : 'Adjuntar comprobante'} de ${row.nombre}`}>{row.ticketDataUrl ? 'Revisar' : 'Adjuntar'}</Button>
            </div>;
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
                <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.ticketDataUrl} alt={`Comprobante de ${selected.nombre}`} className="max-h-64 max-w-full rounded-md border border-border object-contain" />
                <a
                  className="inventory-source-link block"
                  href={selected.ticketDataUrl}
                  download={`${selected.sku}-comprobante`}
                >
                  Descargar comprobante
                </a>
                </div>
              ) : (
                <p className="muted">Sin comprobante adjunto.</p>
              )}
              <ImageDropzone
                label="Tomar o subir"
                hint="Foto del comprobante"
                disabled={Boolean(busyId)}
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
    </div>
  );
}
