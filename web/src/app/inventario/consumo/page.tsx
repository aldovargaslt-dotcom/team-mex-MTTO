'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
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
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [pendientes, setPendientes] = useState<PendienteComprobante[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function setPeriodo(next: (typeof PERIODOS_CONSUMO)[number]['id']) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === '30D') params.delete('periodo');
    else params.set('periodo', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (!role) return;
    const params = new URLSearchParams();
    params.set('from', rango.from);
    params.set('to', rango.to);
    setLoading(true);
    void (async () => {
      try {
        const [movs, pend] = await Promise.all([
          api<Movimiento[]>(`/inventario/movimientos?${params}`, {
            role,
            userId,
          }),
          api<PendienteComprobante[]>('/inventario/pendientes-comprobante', {
            role,
            userId,
          }),
        ]);
        setMovimientos(movs);
        setPendientes(pend);
        setError(null);
      } catch (err) {
        setMovimientos([]);
        setPendientes([]);
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudo cargar el consumo.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [role, userId, rango.from, rango.to]);

  const rows = useMemo(
    () => agregarConsumo(movimientos, pendientes, rango.from, rango.to),
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
            {row.original.salidaOt} {etiquetaUom('pieza')}
          </span>
        ),
      },
      {
        accessorKey: 'compraExterna',
        header: 'Compra externa',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.compraExterna} {etiquetaUom('pieza')}
          </span>
        ),
      },
      {
        accessorKey: 'entrada',
        header: 'Entrada',
        cell: ({ row }) => (
          <span className="mono text-muted-foreground">
            {row.original.entrada} {etiquetaUom('pieza')}
          </span>
        ),
      },
      {
        accessorKey: 'ajuste',
        header: 'Ajuste',
        cell: ({ row }) => (
          <span className="mono text-muted-foreground">
            {row.original.ajuste} {etiquetaUom('pieza')}
          </span>
        ),
      },
    ],
    [],
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
        {origen.desdeStock.toLocaleString('es-MX')} {etiquetaUom('pieza')} desde
        stock · {origen.compraExterna.toLocaleString('es-MX')}{' '}
        {etiquetaUom('pieza')} compra externa
      </p>

      <FormAlert>{error}</FormAlert>
      {loading && rows.length === 0 && !error ? (
        <p className="muted">Cargando consumo…</p>
      ) : (
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
              No hay consumo en este periodo.
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
