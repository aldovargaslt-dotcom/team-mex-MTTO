'use client';

import { AlertTriangle, List, PackageX, type LucideIcon } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { api, HttpError } from '@/lib/api';
import { etiquetaMinimo, etiquetaUom } from '@/lib/format';
import { InventarioAlertasDialog } from '@/components/inventario/InventarioAlertasDialog';
import { useRole } from '@/lib/role';
import type {
  AlertaStock,
  ItemInventario,
  Proveedor,
  StockRow,
  TipoVehiculo,
} from '@/lib/types';
import {
  InventarioMovimientoSheet,
  type MovimientoSheetMode,
} from '@/components/InventarioMovimientoSheet';
import { InventoryResultCount } from '@/components/inventario/InventoryResultCount';
import { ListFilter } from '@/components/ListFilter';
import { RefaccionFicha } from '@/components/RefaccionFicha';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const FILTROS: { id: 'TODOS' | AlertaStock; label: string; icon: LucideIcon }[] = [
  { id: 'TODOS', label: 'Todos', icon: List },
  { id: 'BAJO', label: 'Bajo', icon: AlertTriangle },
  { id: 'AGOTADO', label: 'Agotado', icon: PackageX },
];

function parseAlerta(raw: string | null): 'TODOS' | AlertaStock {
  if (raw === 'BAJO' || raw === 'AGOTADO') return raw;
  return 'TODOS';
}

function emptyExistencias(filtro: 'TODOS' | AlertaStock) {
  if (filtro === 'BAJO') {
    return (
      <>
        <span className="block font-medium text-navy">Nada en Bajo.</span>
        <span>
          El badge Bajo aparece cuando la cantidad es igual o menor al mínimo y
          aún hay piezas.
        </span>
      </>
    );
  }
  if (filtro === 'AGOTADO') {
    return (
      <>
        <span className="block font-medium text-navy">Nada en Agotado.</span>
        <span>
          El badge Agotado aparece cuando la cantidad es 0 y hay un mínimo
          configurado.
        </span>
      </>
    );
  }
  return 'Aún no hay existencias.';
}

export default function StockPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando existencias…</p>}>
      <StockContent />
    </Suspense>
  );
}

function StockContent() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtro = parseAlerta(searchParams.get('alerta'));
  const q = searchParams.get('q') ?? '';
  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value); else params.delete('q');
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
  }
  const read = useReadResource(role ? JSON.stringify([role, userId, 'stock']) : null,
    () => api<StockRow[]>('/inventario/stock', { role: role!, userId }));
  const rows = useMemo(() => read.data ?? [], [read.data]);
  const tipoRead = useReadResource(role ? JSON.stringify([role, userId, 'tipos']) : null,
    () => api<TipoVehiculo[]>('/unidades/tipos', { role: role!, userId }));
  const provRead = useReadResource(role ? JSON.stringify([role, userId, 'proveedores']) : null,
    () => api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }));
  const tipos = tipoRead.data ?? [];
  const proveedores = (provRead.data ?? []).filter((p) => p.activo);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<ItemInventario | null>(null);
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<MovimientoSheetMode | null>(null);
  const [lockItem, setLockItem] = useState(false);
  const [alertasOpen, setAlertasOpen] = useState(false);
  const alertTrigger = useRef<HTMLButtonElement>(null);

  function cargar() { read.retry(); }

  useEffect(() => {
    const selectedItem = searchParams.get('itemId');
    if (!selectedItem || !role) return;
    const controller = new AbortController();
    void api<ItemInventario>(`/inventario/items/${encodeURIComponent(selectedItem)}`, { role, userId, signal: controller.signal })
      .then((item) => { if (!controller.signal.aborted) setFicha(item); })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof HttpError ? err.message : 'No se pudo abrir la refacción.'); });
    return () => controller.abort();
  }, [searchParams, role, userId]);

  function abrirEntrada() {
    setLockItem(false);
    setItemId('');
    setMode('entrada');
    setError(null);
  }

  function abrirAjuste(item: ItemInventario) {
    setFicha(null);
    setLockItem(true);
    setItemId(item.id);
    setMode('ajuste');
    setError(null);
  }

  async function abrirFicha(row: StockRow) {
    setError(null);
    try {
      const item = await api<ItemInventario>(`/inventario/items/${row.itemId}`, {
        role: role!,
        userId,
      });
      setFicha(item);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo abrir la refacción.',
      );
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es');
    return rows.filter((row) =>
      (filtro === 'TODOS' || row.alerta === filtro) &&
      `${row.nombre} ${row.sku} ${row.familia ?? ''}`.toLocaleLowerCase('es').includes(term),
    ).sort((a, b) => {
      const priority = (row: StockRow) => row.alerta === 'AGOTADO' ? 0 : row.alerta === 'BAJO' ? 1 : 2;
      return priority(a) - priority(b) || a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [rows, filtro, q]);
  const filterOptions = FILTROS.map((option) => ({
    ...option,
    label: read.data === null ? option.label : `${option.label} (${option.id === 'TODOS' ? rows.length : rows.filter((row) => row.alerta === option.id).length})`,
  }));
  const columns: ColumnDef<StockRow, unknown>[] = [
    {
      accessorKey: 'nombre', header: 'Refacción',
      cell: ({ row }) => <span className="inventory-identity"><span>{row.original.nombre}</span><span className="inventory-secondary">{row.original.sku}{row.original.familia ? ` · ${row.original.familia}` : ''}</span></span>,
    },
    { accessorKey: 'qty', header: 'Existencia', cell: ({ row }) => <span className="mono whitespace-nowrap">{row.original.qty} {etiquetaUom(row.original.uom)}</span> },
    { id: 'min', header: 'Mínimo', cell: ({ row }) => etiquetaMinimo(row.original.minQty) },
    { id: 'faltante', header: 'Faltante', cell: ({ row }) => row.original.minQty == null ? '—' : <span className="mono whitespace-nowrap">{Math.max(0, row.original.minQty - row.original.qty)} {etiquetaUom(row.original.uom)}</span> },
    { id: 'alerta', header: 'Estado', cell: ({ row }) => row.original.alerta ? <StockAlertaBadge alerta={row.original.alerta} /> : <span className="text-xs text-muted-foreground">Sin alerta configurada</span> },
  ];

  return (
    <div className="existencias-page">
      <PageHeader
        title="Existencias"
        lede="Revisa faltantes y registra las piezas que llegan al almacén."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              ref={alertTrigger}
              onClick={() => {
                setMode(null);
                setItemId('');
                setError(null);
                setAlertasOpen(true);
              }}
              disabled={role !== 'SUPERVISOR' && role !== 'ADMIN_DIRECTIVO'}
            >
              Configurar alertas
            </Button>
            <Button
              type="button"
              onClick={abrirEntrada}
              disabled={read.data === null || rows.length === 0 || tipoRead.data === null || provRead.data === null}
            >
              Registrar entrada
            </Button>
          </>
        }
      />
      <div className="inventory-toolbar inventory-stock-toolbar">
      <Field label="Buscar refacción" htmlFor="stock-search" className="inventory-search">
        <Input id="stock-search" type="search" placeholder="Nombre o código de la refacción" value={q} onChange={(event) => setSearch(event.target.value)} />
      </Field>
      <div className="inventory-filter-field"><span className="inventory-filter-label">Estado de existencias</span>
      <ListFilter
        label="Filtro de existencias"
        value={filtro}
        options={filterOptions}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          if (next === 'TODOS') params.delete('alerta');
          else params.set('alerta', next);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      />
      </div>
      </div>
      <FormAlert>{error}</FormAlert>
      <ReadStatus loading={read.loading} error={read.error} loadingText="Cargando existencias…" errorText="No se pudieron cargar las existencias." retry={read.retry} />
      <ReadStatus loading={tipoRead.loading || provRead.loading} error={tipoRead.error || provRead.error} loadingText="Cargando catálogos de refacciones…" errorText="Catálogos de refacciones no disponibles; las existencias cargadas se conservan." retry={() => { if (tipoRead.error) tipoRead.retry(); if (provRead.error) provRead.retry(); }} />
      {read.data !== null ? <InventoryResultCount count={filtered.length} total={rows.length} singular="refacción" plural="refacciones" /> : null}
      {read.data !== null ? (
        <DataTable
          columns={columns}
          data={filtered}
          className="inventory-stock-table"
          rowActionColumn="nombre"
          rowActionLabel={(row) => `Abrir ${row.nombre}`}
          columnClassNames={{ qty: 'text-right whitespace-nowrap', min: 'text-right whitespace-nowrap', faltante: 'text-right whitespace-nowrap' }}
          getRowClassName={(row) => row.alerta === 'AGOTADO' ? 'inventory-row-critical' : row.alerta === 'BAJO' ? 'inventory-row-warning' : undefined}
          empty={q.trim() ? 'No hay refacciones que coincidan. Ajusta la búsqueda o los filtros.' : emptyExistencias(filtro)}
          onRowClick={(row) => void abrirFicha(row)}
        />
      ) : null}

      {read.data !== null && filtered.length > 0 ? <ul className="inventory-stock-mobile" aria-label="Existencias">
        {filtered.map((row) => <li key={row.itemId} className={row.alerta === 'AGOTADO' ? 'inventory-row-critical' : row.alerta === 'BAJO' ? 'inventory-row-warning' : ''}>
          <button type="button" className="inventory-mobile-main" onClick={() => void abrirFicha(row)} aria-label={`Abrir ${row.nombre}`}>
            <span className="inventory-mobile-copy"><span className="font-medium text-navy">{row.nombre}</span><span className="inventory-secondary">{row.sku}</span></span>
            <span className="inventory-mobile-meta"><span className="mono whitespace-nowrap">{row.qty} {etiquetaUom(row.uom)}</span>{row.alerta ? <StockAlertaBadge alerta={row.alerta} /> : null}</span>
          </button>
          <p className="inventory-stock-mobile-context">{row.minQty == null ? 'Sin mínimo configurado' : row.qty === row.minQty ? `Mínimo: ${row.minQty} · En el mínimo` : `Mínimo: ${row.minQty} · Faltan ${Math.max(0, row.minQty - row.qty)} ${etiquetaUom(row.uom)}`}</p>
        </li>)}
      </ul> : null}

      <RefaccionFicha
        item={ficha}
        tipos={tipos}
        proveedores={proveedores}
        role={role ?? ''}
        userId={userId}
        onClose={() => {
          setFicha(null);
          const next = new URLSearchParams(searchParams.toString());
          next.delete('itemId');
          router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
        }}
        onChanged={(updated) => {
          if (updated) setFicha(updated);
          void cargar();
        }}
        onEntrada={(item) => {
          setFicha(null);
          setItemId(item.id);
          setLockItem(true);
          setMode('entrada');
          setError(null);
        }}
        onAjuste={abrirAjuste}
      />

      <InventarioMovimientoSheet
        mode={mode}
        itemId={itemId}
        rows={rows.map((row) => ({
          itemId: row.itemId,
          sku: row.sku,
          nombre: row.nombre,
          qty: row.qty,
          uom: row.uom,
        }))}
        lockItem={lockItem}
        role={role ?? ''}
        userId={userId}
        onClose={() => {
          setMode(null);
          setItemId('');
          setLockItem(false);
        }}
        onApplied={() => cargar()}
        onError={setError}
      />

      {alertasOpen && role ? <InventarioAlertasDialog
        key={`${role}:${userId ?? ''}`}
        role={role}
        userId={userId}
        onStock={read.setData}
        onClose={() => {
          setAlertasOpen(false);
          requestAnimationFrame(() => alertTrigger.current?.focus());
        }}
      /> : null}
    </div>
  );
}
