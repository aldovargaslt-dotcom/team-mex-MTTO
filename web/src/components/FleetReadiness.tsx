"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Field, Note } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ReadStatus } from "@/components/ReadStatus";
import { UnidadMarca } from "@/components/UnidadTipoMark";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useRole } from "@/lib/role";
import { api } from "@/lib/api";
import { useReadResource } from "@/lib/use-read-resource";
import { readinessLabel, readinessTime, type ReadinessRow, type ReadinessSnapshot } from "@/lib/unit-readiness";

const ATTENTION = [
  ["", "Todas las situaciones"], ["CRITICAL", "Bloqueos críticos"],
  ["UNKNOWN", "Sin confirmar"], ["ATTENTION", "Requiere atención"], ["CLEAR", "Sin pendientes"],
] as const;
const CHECKS = [
  ["", "Todas las revisiones"], ["VALID", "Vigentes"], ["EXPIRED", "Vencidas"],
  ["MISSING", "Sin revisión"], ["UNKNOWN", "Sin confirmar"],
] as const;
const ORDERS = [["", "Todas las órdenes"], ["1", "Con órdenes abiertas"], ["0", "Sin órdenes abiertas"]] as const;

export function FleetReadiness() {
  const { role, userId, isAdmin } = useRole();
  const router = useRouter(), search = useSearchParams();
  const attention = search.get("attention") || (search.get("atencion") === "1" ? "ATTENTION" : "");
  const params = new URLSearchParams();
  for (const key of ["q", "tipo", "estado", "checkState", "orders", "offset"]) {
    const value = search.get(key);
    if (value) params.set(key, value);
  }
  if (attention) params.set("attention", attention);
  const read = useReadResource<ReadinessSnapshot>(
    role ? JSON.stringify([role, userId, params.toString()]) : null,
    () => api(`/unit-readiness?${params}`, { role: role!, userId }),
  );
  const data = read.data;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    next.delete("offset");
    next.delete("usage");
    if (value) next.set(key, value); else next.delete(key);
    if (key === "attention") next.delete("atencion");
    router.replace(`/unidades?${next}`, { scroll: false });
  }
  function clearFilters() {
    const next = new URLSearchParams(search.toString());
    for (const key of ["attention", "atencion", "checkState", "tipo", "orders", "estado", "offset", "usage"]) next.delete(key);
    router.replace(`/unidades?${next}`, { scroll: false });
  }
  const activeFilters = [
    attention ? ATTENTION.find(([value]) => value === attention)?.[1] : null,
    search.get("checkState") ? CHECKS.find(([value]) => value === search.get("checkState"))?.[1] : null,
    search.get("tipo") ? data?.types.find((t) => t.id === search.get("tipo"))?.nombre || "Categoría seleccionada" : null,
    search.get("orders") ? ORDERS.find(([value]) => value === search.get("orders"))?.[1] : null,
    search.get("estado") ? `Estado: ${search.get("estado") === "ACTIVA" ? "Activa" : "Inactiva"}` : null,
  ].filter(Boolean);
  const cleanSearch = new URLSearchParams(search.toString());
  cleanSearch.delete("usage");
  const returnTo = `/unidades?${cleanSearch}`;
  const href = (row: ReadinessRow) => `/unidades/${row.id}?${new URLSearchParams({ returnTo })}`;
  function action(row: ReadinessRow) {
    if (row.activeCheck) return { href: `/checks/${row.activeCheck.checkId}`, label: "Ver revisión" };
    if (row.orders.length) return { href: `${href(row)}&vista=mantenimiento`, label: "Ver órdenes" };
    return { href: href(row), label: "Ver ficha" };
  }
  const columns: ColumnDef<ReadinessRow, unknown>[] = [
    { id: "unit", header: "Unidad", cell: ({ row: { original: row } }) => <UnitIdentity row={row} href={href(row)} /> },
    { id: "situation", header: "Situación", cell: ({ row: { original: row } }) => <UnitSituation row={row} /> },
    { id: "action", header: "", cell: ({ row: { original: row } }) => <Link className="fleet-next" href={action(row).href} aria-label={`${action(row).label}: ${row.numeroInterno}`}>{action(row).label}<span aria-hidden> →</span></Link> },
  ];
  return (
    <section className="fleet-overview" aria-label="Preparación de unidades">
      <div className={`fleet-header${isAdmin ? " fleet-header--admin" : ""}`}><PageHeader title="Unidades" lede="Identifique la unidad y revise qué necesita atención." actions={<>
        {isAdmin ? <><Button variant="secondary" asChild><Link href="/unidades?mode=catalog">Administrar catálogo</Link></Button></> : null}
        <Button variant="quiet" size="icon" onClick={read.retry} aria-label="Actualizar situación"><RefreshCw aria-hidden /></Button>
      </>} /></div>
      <div className="fleet-toolbar">
        <Input aria-label="Buscar por número o placas" placeholder="Buscar unidad o placas" value={search.get("q") || ""} onChange={(e) => filter("q", e.target.value)} />
        <Button variant="secondary" ref={filterTrigger} onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen} aria-controls="fleet-filters"><SlidersHorizontal aria-hidden />Filtros{activeFilters.length ? ` (${activeFilters.length})` : ""}</Button>
      </div>
      {activeFilters.length ? <div className="fleet-applied"><span>Filtros: {activeFilters.join(" · ")}</span><button type="button" onClick={clearFilters}>Limpiar</button></div> : null}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent id="fleet-filters" side="right" className="fleet-filter-sheet" onCloseAutoFocus={(event) => { event.preventDefault(); filterTrigger.current?.focus(); }}>
          <SheetHeader><SheetTitle>Filtrar unidades</SheetTitle><SheetDescription>Elija las unidades que quiere revisar.</SheetDescription></SheetHeader>
          <div className="fleet-filter-fields">
            <Field label="Situación" htmlFor="fleet-attention"><NativeSelect id="fleet-attention" value={attention} onChange={(e) => filter("attention", e.target.value)}>{ATTENTION.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</NativeSelect></Field>
            <Field label="Revisión ABC" htmlFor="fleet-check"><NativeSelect id="fleet-check" value={search.get("checkState") || ""} onChange={(e) => filter("checkState", e.target.value)}>{CHECKS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</NativeSelect></Field>
            <Field label="Categoría" htmlFor="fleet-category"><NativeSelect id="fleet-category" value={search.get("tipo") || ""} onChange={(e) => filter("tipo", e.target.value)}><option value="">Todas las categorías</option>{data?.types.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)}</NativeSelect></Field>
            <Field label="Órdenes" htmlFor="fleet-orders"><NativeSelect id="fleet-orders" value={search.get("orders") || ""} onChange={(e) => filter("orders", e.target.value)}>{ORDERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</NativeSelect></Field>
            {search.get("estado") ? <p className="muted">Hay un filtro de estado en el enlace. Limpiar filtros lo elimina.</p> : null}
          </div>
          <SheetFooter><Button onClick={() => setFiltersOpen(false)}>Ver resultados</Button><Button variant="secondary" disabled={!activeFilters.length} onClick={clearFilters}>Limpiar filtros</Button></SheetFooter>
        </SheetContent>
      </Sheet>
      <ReadStatus loading={read.loading} error={read.error} loadingText="Cargando situación de las unidades…" errorText="No pudimos confirmar la situación de las unidades." retry={read.retry} />
      {data ? <>
        <div className="fleet-list-context">
          <span>{data.total} {data.total === 1 ? "unidad" : "unidades"} · Por atención</span>

        </div>
        {!data.sources.checks || !data.sources.maintenance ? <Note variant="warn">Hay fuentes sin confirmar. Los datos faltantes no acreditan disponibilidad.</Note> : null}
        <div className="fleet-desktop"><DataTable columns={columns} data={data.items} empty={<ReadinessEmpty total={data.counts.ALL} onClear={() => router.replace("/unidades")} />} /></div>
        <div className="fleet-mobile">{data.items.length ? data.items.map((row) => <article key={row.id} className="fleet-mobile-row"><UnitIdentity row={row} href={href(row)} /><UnitSituation row={row} /><Link className="fleet-next" href={action(row).href} aria-label={`${action(row).label}: ${row.numeroInterno}`}>{action(row).label}<span aria-hidden> →</span></Link></article>) : <ReadinessEmpty total={data.counts.ALL} onClear={() => router.replace("/unidades")} />}</div>
        <div className="fleet-footer"><span>Actualizado {readinessTime(data.asOf)} (CDMX)</span><nav aria-label="Páginas de unidades"><Button variant="secondary" disabled={!Number(search.get("offset"))} onClick={() => filterOffset(Math.max(0, Number(search.get("offset") || 0) - 30))}>Anterior</Button><span>{data.total ? `${Number(search.get("offset") || 0) + 1}–${Number(search.get("offset") || 0) + data.items.length} de ${data.total}` : "0 unidades"}</span><Button variant="secondary" disabled={data.nextOffset === null} onClick={() => filterOffset(data.nextOffset!)}>Siguiente</Button></nav></div>
      </> : null}
    </section>
  );
  function filterOffset(offset: number) {
    const next = new URLSearchParams(search.toString()); next.delete("usage"); next.set("offset", String(offset));
    router.replace(`/unidades?${next}`, { scroll: false });
  }
}
function UnitIdentity({ row, href }: { row: ReadinessRow; href: string }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  return <Link href={href} className="fleet-identity"><span className="fleet-photo" title={!row.fotoDataUrl ? "Sin foto registrada" : failedPhoto === row.fotoDataUrl ? "Foto no disponible" : undefined} onErrorCapture={() => setFailedPhoto(row.fotoDataUrl || null)}><UnidadMarca foto={row.fotoDataUrl !== failedPhoto ? row.fotoDataUrl : null} nombre={row.tipo.nombre} icono={row.tipo.icono} /></span><span className="fleet-identity-copy"><strong>{row.numeroInterno}</strong><span>{row.placas}</span><small>{row.tipo.nombre}</small></span></Link>;
}
function UnitSituation({ row }: { row: ReadinessRow }) {
  const reason = row.reasons[0];
  return <div className="fleet-situation"><Badge variant={row.attention === "CRITICAL" ? "danger" : row.technicalReady ? "success" : "warning"}>{readinessLabel(row)}</Badge>{reason ? <p>{reason}{row.reasons.length > 1 ? ` (+${row.reasons.length - 1})` : ""}</p> : null}{row.inUse ? <span className="fleet-in-use">En uso · viaje activo</span> : null}</div>;
}
function ReadinessEmpty({ total, onClear }: { total: number; onClear: () => void }) {
  return <div className="empty-state"><strong>{total ? "No hay unidades que coincidan con los filtros." : "No hay unidades configuradas en este alcance."}</strong>{total ? <Button variant="secondary" onClick={onClear}>Ver todas las unidades</Button> : null}</div>;
}
