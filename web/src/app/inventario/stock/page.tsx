'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import type { AlertaStock, StockRow } from '@/lib/types';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const FILTROS: { id: 'TODOS' | AlertaStock; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'BAJO', label: 'Bajo' },
  { id: 'AGOTADO', label: 'Agotado' },
];

export default function StockPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | AlertaStock>('TODOS');
  const [minDraft, setMinDraft] = useState<Record<string, string>>({});
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<'entrada' | 'ajuste' | null>(null);
  const [qty, setQty] = useState('1');
  const [nota, setNota] = useState('');

  async function cargar() {
    const data = await api<StockRow[]>('/inventario/stock', { role: role!, userId });
    setRows(data);
    setMinDraft(
      Object.fromEntries(
        data.map((row) => [row.itemId, row.minQty == null ? '' : String(row.minQty)]),
      ),
    );
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(err instanceof HttpError ? err.message : 'No se pudo cargar el stock.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function abrir(id: string, next: 'entrada' | 'ajuste') {
    setItemId(id);
    setMode(next);
    setQty(next === 'ajuste' ? '-1' : '1');
    setNota('');
    setError(null);
  }

  async function guardarMin(row: StockRow) {
    const raw = minDraft[row.itemId] ?? '';
    const next = raw.trim() === '' ? null : Number(raw);
    if (next !== null && (!Number.isInteger(next) || next < 0)) {
      setError('El mínimo debe ser un entero ≥ 0, o vacío para no alertar.');
      return;
    }
    if (next === row.minQty) return;
    setError(null);
    try {
      await api(`/inventario/items/${row.itemId}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ minQty: next }),
      });
      notifyInboxChanged();
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo guardar el mínimo.');
    }
  }

  async function aplicar(event: FormEvent) {
    event.preventDefault();
    if (!itemId || !mode) return;
    setError(null);
    try {
      if (mode === 'entrada') {
        await api('/inventario/movimientos/entrada', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId,
            qty: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      } else {
        await api('/inventario/movimientos/ajuste', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId,
            qtyDelta: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      }
      setItemId('');
      setMode(null);
      notifyInboxChanged();
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo registrar el movimiento.');
    }
  }

  const selected = rows.find((row) => row.itemId === itemId);

  const filtered = useMemo(() => {
    if (filtro === 'TODOS') return rows;
    return rows.filter((row) => row.alerta === filtro);
  }, [rows, filtro]);

  const empty =
    filtro === 'TODOS' ? 'No hay SKUs en stock.' : 'Sin items en stock bajo.';

  const columns: ColumnDef<StockRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
      },
      { accessorKey: 'nombre', header: 'Nombre' },
      { accessorKey: 'familia', header: 'Familia' },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.qty} {etiquetaUom(row.original.uom)}
          </span>
        ),
      },
      {
        id: 'min',
        header: 'Min',
        cell: ({ row }) => (
          <Input
            aria-label={`Mínimo ${row.original.sku}`}
            className="h-11 min-h-11 w-[4.5rem] md:h-10 md:min-h-10"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="—"
            value={minDraft[row.original.itemId] ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              setMinDraft((current) => ({
                ...current,
                [row.original.itemId]: e.target.value,
              }))
            }
            onBlur={() => void guardarMin(row.original)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        ),
      },
      {
        id: 'alerta',
        header: 'Estado',
        cell: ({ row }) => <StockAlertaBadge alerta={row.original.alerta} />,
      },
      {
        id: 'acciones',
        header: '',
        cell: ({ row }) => (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => abrir(row.original.itemId, 'entrada')}
            >
              Entrada
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => abrir(row.original.itemId, 'ajuste')}
            >
              Ajuste
            </Button>
          </div>
        ),
      },
    ],
    [minDraft, role, userId],
  );

  return (
    <>
      <PageHeader
        title="Stock"
        lede="Almacén único. Mínimo opt-in por SKU: vacío = sin alerta. No se permiten existencias negativas."
        actions={
          <Button
            type="button"
            onClick={() => abrir(rows[0]?.itemId ?? '', 'entrada')}
            disabled={rows.length === 0}
          >
            Registrar entrada
          </Button>
        }
      />
      <nav className="subnav" aria-label="Filtro de stock bajo">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filtro === f.id ? 'active' : ''}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
          </button>
        ))}
      </nav>
      <FormAlert>{error}</FormAlert>
      <DataTable columns={columns} data={filtered} empty={empty} />

      <Sheet
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMode(null);
            setItemId('');
          }
        }}
      >
        <SheetContent side="bottom" className="sm:max-w-none">
          <SheetHeader>
            <SheetTitle>
              {mode === 'ajuste' ? 'Ajuste de stock' : 'Registrar entrada'}
            </SheetTitle>
            <SheetDescription>
              {selected
                ? `${selected.sku} · ${selected.nombre}`
                : 'Elija el SKU, la cantidad y una nota opcional.'}
            </SheetDescription>
          </SheetHeader>
          <form className="grid gap-3 px-4 pb-4" onSubmit={aplicar}>
            <Field label="SKU" htmlFor="stockItem">
              <NativeSelect
                id="stockItem"
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">Seleccione</option>
                {rows.map((row) => (
                  <option key={row.itemId} value={row.itemId}>
                    {row.sku} · {row.nombre} ({row.qty} {etiquetaUom(row.uom)})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label={mode === 'ajuste' ? 'Ajuste (con signo)' : 'Cantidad'}
              htmlFor="qty"
            >
              <Input
                id="qty"
                type="number"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={mode === 'entrada' ? 1 : undefined}
                step={1}
              />
            </Field>
            <Field label="Nota" htmlFor="nota">
              <Textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <SheetFooter className="p-0">
              <Button type="submit">
                {mode === 'entrada' ? 'Registrar entrada' : 'Aplicar ajuste'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMode(null);
                  setItemId('');
                }}
              >
                Cancelar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
