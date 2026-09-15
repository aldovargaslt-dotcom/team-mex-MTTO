'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { OtLink, useOtLabels } from '@/components/OtLink';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, HttpError } from '@/lib/api';
import { etiquetaMovimiento, etiquetaUom, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { ItemInventario, Movimiento, TipoMovimiento } from '@/lib/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PERIODOS = [
  { id: 'TODO', label: 'Todo' },
  { id: 'HOY', label: 'Hoy' },
  { id: '7D', label: '7 d' },
  { id: '30D', label: '30 d' },
  { id: 'MES', label: 'Este mes' },
  { id: 'CUSTOM', label: 'Personalizado' },
] as const;

type Periodo = (typeof PERIODOS)[number]['id'];

const TIPOS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'ENTRADA', label: 'Entrada' },
  { id: 'SALIDA_OT', label: 'Salida' },
  { id: 'AJUSTE', label: 'Ajuste' },
] as const;

function ymdUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(base: Date, days: number) {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  );
}

function startOfUtcMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function formatDia(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function parseTipo(raw: string | null): TipoMovimiento | null {
  if (raw === 'ENTRADA' || raw === 'SALIDA_OT' || raw === 'AJUSTE') return raw;
  return null;
}

function inferPeriodo(from: string | null, to: string | null): Periodo {
  if (!from && !to) return 'TODO';
  const now = new Date();
  const today = ymdUtc(now);
  const d7 = ymdUtc(addUtcDays(now, -6));
  const d30 = ymdUtc(addUtcDays(now, -29));
  const mes = ymdUtc(startOfUtcMonth(now));
  if (from === today && to === today) return 'HOY';
  if (from === d7 && to === today) return '7D';
  if (from === d30 && to === today) return '30D';
  if (from === mes && to === today) return 'MES';
  return 'CUSTOM';
}

function datesForPeriod(id: Periodo): { from: string | null; to: string | null } {
  if (id === 'TODO') return { from: null, to: null };
  const now = new Date();
  const to = ymdUtc(now);
  if (id === 'HOY') return { from: to, to };
  if (id === '7D') return { from: ymdUtc(addUtcDays(now, -6)), to };
  if (id === '30D') return { from: ymdUtc(addUtcDays(now, -29)), to };
  if (id === 'MES') return { from: ymdUtc(startOfUtcMonth(now)), to };
  return { from: to, to };
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando movimientos…</p>}>
      <MovimientosContent />
    </Suspense>
  );
}

function MovimientosContent() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const item = searchParams.get('item');
  const tipo = parseTipo(searchParams.get('tipo'));
  const periodo = inferPeriodo(from, to);
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Movimiento | null>(null);
  const [itemLabel, setItemLabel] = useState<string | null>(null);
  const labels = useOtLabels(
    rows.map((row) => row.visitaId),
    { role, userId },
  );

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (!role) return;
    const params = new URLSearchParams();
    if (item && UUID_RE.test(item)) params.set('itemId', item);
    if (tipo) params.set('tipo', tipo);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    setLoading(true);
    void (async () => {
      try {
        setRows(
          await api<Movimiento[]>(
            `/inventario/movimientos${qs ? `?${qs}` : ''}`,
            { role, userId },
          ),
        );
        setError(null);
      } catch (err) {
        setRows([]);
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar los movimientos.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [role, userId, item, tipo, from, to]);

  useEffect(() => {
    if (!role || !item || !UUID_RE.test(item)) {
      setItemLabel(null);
      return;
    }
    void api<ItemInventario>(`/inventario/items/${item}`, { role, userId })
      .then((row) => setItemLabel(`${row.sku} · ${row.nombre}`))
      .catch(() => setItemLabel(item.slice(0, 8)));
  }, [role, userId, item]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.sku.toLowerCase().includes(term) ||
        row.nombre.toLowerCase().includes(term) ||
        (row.nota ?? '').toLowerCase().includes(term),
    );
  }, [rows, q]);

  const hayFiltros = Boolean(q.trim() || from || to || tipo || item);

  const columns: ColumnDef<Movimiento, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Fecha',
        cell: ({ row }) => formatFecha(row.original.createdAt),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => etiquetaMovimiento(row.original.tipo),
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
      },
      {
        accessorKey: 'qty',
        header: 'Cant.',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.qty} {etiquetaUom('pieza')}
          </span>
        ),
      },
      {
        accessorKey: 'delta',
        header: 'Cambio',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.delta > 0
              ? `+${row.original.delta}`
              : row.original.delta}
          </span>
        ),
      },
      {
        accessorKey: 'visitaId',
        header: 'Visita',
        cell: ({ row }) => (
          <OtLink visitaId={row.original.visitaId} labels={labels} />
        ),
      },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => row.original.nota || '—',
      },
    ],
    [labels],
  );

  const chips: { key: string; label: string; clear: Record<string, string | null> }[] =
    [];
  if (q.trim()) {
    chips.push({ key: 'q', label: `Buscar: ${q.trim()}`, clear: { q: null } });
  }
  if (periodo !== 'TODO' && (from || to)) {
    const rango =
      from && to && from !== to
        ? `${formatDia(from)} – ${formatDia(to)}`
        : from
          ? `Desde ${formatDia(from)}`
          : to
            ? `Hasta ${formatDia(to)}`
            : 'Periodo';
    chips.push({
      key: 'periodo',
      label: periodo === 'CUSTOM' ? rango : PERIODOS.find((p) => p.id === periodo)!.label,
      clear: { from: null, to: null },
    });
  }
  if (tipo) {
    chips.push({
      key: 'tipo',
      label: etiquetaMovimiento(tipo),
      clear: { tipo: null },
    });
  }
  if (item) {
    chips.push({
      key: 'item',
      label: itemLabel ?? 'Refacción',
      clear: { item: null },
    });
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        lede="Entradas, salidas de visita y ajustes. Sin saldos inventados."
      />

      <div className="mb-3">
        <Field label="Buscar" htmlFor="movQ">
          <Input
            id="movQ"
            value={q}
            onChange={(e) => setParams({ q: e.target.value || null })}
            placeholder="SKU, nombre o nota…"
          />
        </Field>
      </div>

      <ListFilter
        label="Periodo"
        value={periodo}
        options={PERIODOS}
        onChange={(next) => {
          if (next === 'CUSTOM') {
            const dates = from || to ? { from, to } : datesForPeriod('HOY');
            setParams({ from: dates.from, to: dates.to });
            return;
          }
          const dates = datesForPeriod(next);
          setParams({ from: dates.from, to: dates.to });
        }}
      />
      <ListFilter
        label="Tipo de movimiento"
        value={tipo ?? 'TODOS'}
        options={TIPOS}
        onChange={(next) =>
          setParams({ tipo: next === 'TODOS' ? null : next })
        }
      />

      {periodo === 'CUSTOM' ? (
        <div className="filters mb-3">
          <Field label="Desde" htmlFor="movFrom">
            <Input
              id="movFrom"
              type="date"
              value={from ?? ''}
              onChange={(e) => setParams({ from: e.target.value || null })}
            />
          </Field>
          <Field label="Hasta" htmlFor="movTo">
            <Input
              id="movTo"
              type="date"
              value={to ?? ''}
              onChange={(e) => setParams({ to: e.target.value || null })}
            />
          </Field>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="chip-row mb-3" aria-label="Filtros activos">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-[12px] text-navy"
              onClick={() => setParams(chip.clear)}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Quitar {chip.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <FormAlert>{error}</FormAlert>
      {loading && rows.length === 0 && !error ? (
        <p className="muted">Cargando movimientos…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={setDetalle}
          empty={
            hayFiltros ? (
              <>
                No hay movimientos que coincidan.
                <span className="mt-1 block text-muted-foreground">
                  Ajuste la búsqueda o los filtros.
                </span>
              </>
            ) : (
              'Aún no hay movimientos.'
            )
          }
        />
      )}

      <Sheet
        open={detalle != null}
        onOpenChange={(open) => {
          if (!open) setDetalle(null);
        }}
      >
        <SheetContent side="right">
          {detalle ? (
            <>
              <SheetHeader>
                <SheetTitle>{etiquetaMovimiento(detalle.tipo)}</SheetTitle>
                <SheetDescription>
                  <span className="mono">{detalle.sku}</span>
                  {` · ${detalle.nombre}`}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid gap-3 px-4 pb-4 text-sm">
                <div>
                  <dt className="text-[12px] text-muted-foreground">Fecha</dt>
                  <dd>{formatFecha(detalle.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">SKU</dt>
                  <dd className="mono">{detalle.sku}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Tipo</dt>
                  <dd>{etiquetaMovimiento(detalle.tipo)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Cantidad</dt>
                  <dd className="mono">
                    {detalle.qty} {etiquetaUom('pieza')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Cambio</dt>
                  <dd className="mono">
                    {detalle.delta > 0 ? `+${detalle.delta}` : detalle.delta}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Visita</dt>
                  <dd>
                    <OtLink visitaId={detalle.visitaId} labels={labels} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Nota</dt>
                  <dd>{detalle.nota || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Usuario</dt>
                  <dd className="mono">{detalle.createdBy || '—'}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
