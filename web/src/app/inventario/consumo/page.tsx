'use client';

import { Suspense, useMemo } from 'react';
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

  const columns: ColumnDef<ConsumoSku, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
      },
      { accessorKey: 'nombre', header: 'Refacción' },
      {
        accessorKey: 'salidaOt',
        header: 'Salida OT',
        cell: ({ row }) => (
          <span className="mono">
            {movimientos === null ? 'No disponible' : `${row.original.salidaOt} ${etiquetaUom('pieza')}`}
          </span>
        ),
      },
      {
        accessorKey: 'compraExterna',
        header: 'Compra externa',
        cell: ({ row }) => (
          <span className="mono">
            {pendientes === null ? 'No disponible' : `${row.original.compraExterna} ${etiquetaUom('pieza')}`}
          </span>
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
    [movimientos, pendientes],
  );

  return (
    <>
      <PageHeader
        title="Consumo"
        lede="Totales del periodo por refacción. El libro de movimientos no cambia."
      />

      <ListFilter
        label="Periodo"
        value={periodo}
        options={PERIODOS_CONSUMO}
        onChange={setPeriodo}
      />

      <p className="mb-3 text-xs text-muted-foreground">
        {movimientos === null ? 'Desde stock: no disponible' : `${origen.desdeStock.toLocaleString('es-MX')} ${etiquetaUom('pieza')} desde stock`} · {' '}
        {pendientes === null ? 'Compra externa: no disponible' : `${origen.compraExterna.toLocaleString('es-MX')} ${etiquetaUom('pieza')} compra externa`}
      </p>
      <ReadStatus loading={movRead.loading} error={movRead.error} loadingText="Cargando movimientos de consumo…" errorText="Consumo incompleto: falta consultar movimientos." retry={movRead.retry} />
      <ReadStatus loading={pendRead.loading} error={pendRead.error} loadingText="Cargando compras externas…" errorText="Consumo incompleto: falta consultar compras externas." retry={pendRead.retry} />
      {movimientos === null && pendientes === null ? null : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(row) =>
            router.push(
              `/inventario/movimientos?item=${row.itemId}&from=${rango.from}&to=${rango.to}`,
            )
          }
          empty={
            <>
              {movimientos === null || pendientes === null ? 'La consulta está incompleta; faltan fuentes por cargar.' : 'No hay consumo en este periodo.'}
              <span className="mt-1 block text-muted-foreground">
                Las salidas de visita y las compras externas aparecen aquí.
              </span>
            </>
          }
        />
      )}
    </>
  );
}
