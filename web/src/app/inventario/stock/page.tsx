'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { StockRow } from '@/lib/types';
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

export default function StockPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<'entrada' | 'ajuste' | null>(null);
  const [qty, setQty] = useState('1');
  const [nota, setNota] = useState('');

  async function cargar() {
    setRows(await api<StockRow[]>('/inventario/stock', { role: role!, userId }));
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
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo registrar el movimiento.');
    }
  }

  const selected = rows.find((row) => row.itemId === itemId);

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
    [],
  );

  return (
    <>
      <PageHeader
        title="Stock"
        lede="Almacén único. No se permiten existencias negativas."
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
      <FormAlert>{error}</FormAlert>
      <DataTable columns={columns} data={rows} empty="No hay SKUs en stock." />

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
