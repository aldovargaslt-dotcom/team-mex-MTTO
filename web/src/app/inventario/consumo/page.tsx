'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/field';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { api } from '@/lib/api';
import {
  agregarConsumo,
  datesForPeriodoConsumo,
  parsePeriodoConsumo,
  PERIODOS_CONSUMO,
  totalesOrigen,
  type ConsumoSku,
} from '@/lib/consumo-totales';
import { etiquetaUom } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { Movimiento, PendienteComprobante } from '@/lib/types';

export default function ConsumoPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando consumo…</p>}>
      <ConsumoContent />
    </Suspense>
  );
}

function ConsumoContent() {
  const { role, userId } = useRole();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periodo = parsePeriodoConsumo(searchParams.get('periodo'));
  const rango = useMemo(() => datesForPeriodoConsumo(periodo), [periodo]);
  const params = new URLSearchParams({ from: rango.from, to: rango.to });
  const movRead = useReadResource(role ? JSON.stringify([role, userId, rango.from, rango.to]) : null,
    () => api<Movimiento[]>(`/inventario/movimientos?${params}`, { role: role!, userId }));
  const pendRead = useReadResource(role ? JSON.stringify([role, userId, 'pendientes']) : null,
    () => api<PendienteComprobante[]>('/inventario/pendientes-comprobante', { role: role!, userId }));
  const movimientos = movRead.data;
  const pendientes = pendRead.data;
  function setPeriodo(next: (typeof PERIODOS_CONSUMO)[number]['id']) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === '30D') params.delete('periodo');
    else params.set('periodo', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const rows = useMemo(
    () => agregarConsumo(movimientos ?? [], pendientes ?? [], rango.from, rango.to),
    [movimientos, pendientes, rango.from, rango.to],
  );
  const origen = useMemo(() => totalesOrigen(rows), [rows]);
  const filtered = rows.filter((row) => `${row.nombre} ${row.sku}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

  const columns: ColumnDef<ConsumoSku, unknown>[] = useMemo(
    () => [
      { accessorKey: 'nombre', header: 'Refacción', cell: ({ row }) => <span className="inventory-identity"><span className="font-medium text-navy">{row.original.nombre}</span><span className="inventory-secondary">{row.original.sku}</span></span> },
      {
        accessorKey: 'salidaOt',
        header: 'Desde almacén',
        cell: ({ row }) => (
          movimientos === null ? 'No disponible' : <Link className="inventory-source-link mono" href={`/inventario/movimientos?item=${row.original.itemId}&tipo=SALIDA_OT&from=${rango.from}&to=${rango.to}`} aria-label={`Ver salidas de almacén de ${row.original.nombre}`}>{row.original.salidaOt} {etiquetaUom('pieza')}</Link>
        ),
      },
      {
        accessorKey: 'compraExterna',
        header: 'Compra externa',
        cell: ({ row }) => (
          pendientes === null ? 'No disponible' : <Link className="inventory-source-link mono" href={`/inventario/pendientes?item=${row.original.itemId}&from=${rango.from}&to=${rango.to}`} aria-label={`Ver compras externas de ${row.original.nombre}`}>{row.original.compraExterna} {etiquetaUom('pieza')}</Link>
        ),
      },
      {
        accessorKey: 'entrada',
        header: 'Entrada',
        cell: ({ row }) => (
          <span className="mono text-muted-foreground">
            {movimientos === null ? 'No disponible' : `${row.original.entrada} ${etiquetaUom('pieza')}`}
          </span>
        ),
      },
      {
        accessorKey: 'ajuste',
        header: 'Ajuste',
        cell: ({ row }) => (
          <span className="mono text-muted-foreground">
            {movimientos === null ? 'No disponible' : `${row.original.ajuste} ${etiquetaUom('pieza')}`}
          </span>
        ),
      },
    ],
    [movimientos, pendientes, rango.from, rango.to],
  );

  return (
    <>
      <PageHeader
        title="Consumo"
        lede="Compara el uso desde almacén y las compras externas. Selecciona una cantidad para consultar su origen."
      />

      <div className="inventory-toolbar">
      <Field label="Buscar refacción" htmlFor="consumo-search" className="inventory-search"><Input id="consumo-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o SKU" /></Field>
      <ListFilter
        label="Periodo"
        value={periodo}
        options={PERIODOS_CONSUMO}
        onChange={setPeriodo}
      />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {movimientos === null ? 'Desde stock: no disponible' : `${origen.desdeStock.toLocaleString('es-MX')} ${etiquetaUom('pieza')} desde stock`} · {' '}
        {pendientes === null ? 'Compra externa: no disponible' : `${origen.compraExterna.toLocaleString('es-MX')} ${etiquetaUom('pieza')} compra externa`}
      </p>
      <ReadStatus loading={movRead.loading} error={movRead.error} loadingText="Cargando movimientos de consumo…" errorText="Consumo incompleto: falta consultar movimientos." retry={movRead.retry} />
      <ReadStatus loading={pendRead.loading} error={pendRead.error} loadingText="Cargando compras externas…" errorText="Consumo incompleto: falta consultar compras externas." retry={pendRead.retry} />
      {movimientos === null && pendientes === null ? null : (
        <DataTable
          columns={columns}
          data={filtered}
          className="inventory-consumption-table"
          columnClassNames={{ salidaOt: 'text-right whitespace-nowrap', compraExterna: 'text-right whitespace-nowrap', entrada: 'text-right whitespace-nowrap', ajuste: 'text-right whitespace-nowrap' }}
          empty={
            <>
              {movimientos === null || pendientes === null ? 'La consulta está incompleta; faltan fuentes por cargar.' : search.trim() ? 'No hay refacciones que coincidan con la búsqueda.' : 'No hay consumo en este periodo.'}
              <span className="mt-1 block text-muted-foreground">
                Las salidas de visita y las compras externas aparecen aquí.
              </span>
            </>
          }
        />
      )}
      {filtered.length > 0 ? <ul className="inventory-operation-mobile" aria-label="Consumo por refacción">
        {filtered.map((row) => <li key={row.itemId} className="inventory-consumption-item">
          <div className="inventory-identity"><span className="font-medium text-navy">{row.nombre}</span><span className="inventory-secondary">{row.sku}</span></div>
          <dl className="inventory-origin-grid">
            <div><dt>Desde almacén</dt><dd>{movimientos === null ? 'No disponible' : <Link className="inventory-source-link mono" href={`/inventario/movimientos?item=${row.itemId}&tipo=SALIDA_OT&from=${rango.from}&to=${rango.to}`} aria-label={`Ver salidas de almacén de ${row.nombre}`}>{row.salidaOt} {etiquetaUom('pieza')}</Link>}</dd></div>
            <div><dt>Compra externa</dt><dd>{pendientes === null ? 'No disponible' : <Link className="inventory-source-link mono" href={`/inventario/pendientes?item=${row.itemId}&from=${rango.from}&to=${rango.to}`} aria-label={`Ver compras externas de ${row.nombre}`}>{row.compraExterna} {etiquetaUom('pieza')}</Link>}</dd></div>
          </dl>
          <p className="inventory-secondary">Entradas: {movimientos === null ? 'No disponible' : `${row.entrada} ${etiquetaUom('pieza')}`} · Ajustes: {movimientos === null ? 'No disponible' : `${row.ajuste} ${etiquetaUom('pieza')}`}</p>
        </li>)}
      </ul> : null}
    </>
  );
}
