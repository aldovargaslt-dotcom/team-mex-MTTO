'use client';

import { FormEvent, KeyboardEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import type { AlertaStock, StockRow } from '@/lib/types';
import { ListFilter } from '@/components/ListFilter';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function parseAlerta(raw: string | null): 'TODOS' | AlertaStock {
  if (raw === 'BAJO' || raw === 'AGOTADO') return raw;
  return 'TODOS';
}

export default function StockPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando stock…</p>}>
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
  const [rows, setRows] = useState<StockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [minDraft, setMinDraft] = useState<Record<string, string>>({});
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<'entrada' | 'ajuste' | null>(null);
  const [qty, setQty] = useState('1');
  const [nota, setNota] = useState('');
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [savingAlertas, setSavingAlertas] = useState(false);

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
      setError('Indique un número entero, o déjelo vacío.');
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
      setError(err instanceof HttpError ? err.message : 'No se pudo guardar cuándo avisar.');
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

  async function guardarAlertas(event: FormEvent) {
    event.preventDefault();
    setError(null);
    for (const row of rows) {
      const raw = minDraft[row.itemId] ?? '';
      const next = raw.trim() === '' ? null : Number(raw);
      if (next !== null && (!Number.isInteger(next) || next < 0)) {
        setError('Indique un número entero, o déjelo vacío.');
        return;
      }
    }
    setSavingAlertas(true);
    try {
      for (const row of rows) {
        const raw = minDraft[row.itemId] ?? '';
        const next = raw.trim() === '' ? null : Number(raw);
        if (next === row.minQty) continue;
        await api(`/inventario/items/${row.itemId}`, {
          role: role!,
          userId,
          method: 'PATCH',
          body: JSON.stringify({ minQty: next }),
        });
      }
      notifyInboxChanged();
      setAlertasOpen(false);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo guardar cuándo avisar.',
      );
    } finally {
      setSavingAlertas(false);
    }
  }

  const selected = rows.find((row) => row.itemId === itemId);

  const filtered = useMemo(() => {
    if (filtro === 'TODOS') return rows;
    return rows.filter((row) => row.alerta === filtro);
  }, [rows, filtro]);

  const empty =
    filtro === 'TODOS' ? 'Aún no hay existencias.' : 'Nada en este filtro.';

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
        header: 'Cant.',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.qty} {etiquetaUom(row.original.uom)}
          </span>
        ),
      },
      {
        id: 'min',
        header: () => (
          <span title="Piezas o menos. Vacío = no avisar de este producto.">
            Avisar si quedan
          </span>
        ),
        cell: ({ row }) => (
          <Input
            aria-label={`Avisar si quedan ${row.original.sku}`}
            className="h-11 min-h-11 w-[5.5rem] md:h-10 md:min-h-10"
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
              variant="entrada"
              size="compact"
              onClick={() => abrir(row.original.itemId, 'entrada')}
            >
              Entrada
            </Button>
            <Button
              type="button"
              variant="outline"
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
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode(null);
                setItemId('');
                setError(null);
                setAlertasOpen(true);
              }}
              disabled={rows.length === 0}
            >
              Configurar alertas
            </Button>
            <Button
              type="button"
              onClick={() => abrir(rows[0]?.itemId ?? '', 'entrada')}
              disabled={rows.length === 0}
            >
              Registrar entrada
            </Button>
          </>
        }
      />
      <ListFilter
        label="Filtro de stock"
        value={filtro}
        options={FILTROS}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          if (next === 'TODOS') params.delete('alerta');
          else params.set('alerta', next);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      />
      <FormAlert>{error}</FormAlert>
      {rows.length > 0 || !error ? (
        <DataTable columns={columns} data={filtered} empty={empty} />
      ) : null}

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
            <SheetTitle>{mode === 'ajuste' ? 'Ajuste' : 'Entrada'}</SheetTitle>
            <SheetDescription>
              {selected
                ? `${selected.sku} · ${selected.nombre}`
                : 'Elija el ítem y la cantidad.'}
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
              label={mode === 'ajuste' ? 'Cambio' : 'Cantidad'}
              htmlFor="qty"
              help={
                mode === 'ajuste'
                  ? 'Positivo suma. Negativo resta.'
                  : undefined
              }
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
              <Button
                type="submit"
                variant={mode === 'ajuste' ? 'outline' : 'default'}
              >
                {mode === 'entrada' ? 'Registrar entrada' : 'Ajustar'}
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

      <Dialog
        open={alertasOpen}
        onOpenChange={(next) => {
          if (!next) {
            setMinDraft(
              Object.fromEntries(
                rows.map((row) => [
                  row.itemId,
                  row.minQty == null ? '' : String(row.minQty),
                ]),
              ),
            );
          }
          setAlertasOpen(next);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <form
            className="grid max-h-[calc(90vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
            onSubmit={guardarAlertas}
          >
            <DialogHeader>
              <DialogTitle className="text-[16px]">Alertas de inventario</DialogTitle>
              <DialogDescription>
                Te avisamos en la campanita cuando un producto se esté acabando.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 space-y-3 overflow-y-auto py-3">
              {rows.map((row) => (
                <div
                  key={row.itemId}
                  className="rounded-md border border-border p-3"
                >
                  <p className="text-sm font-semibold text-navy">{row.nombre}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    <span className="mono">{row.sku}</span>
                    {' · '}
                    {row.qty} {etiquetaUom(row.uom)}
                  </p>
                  <Field
                    label="Avisar cuando queden"
                    htmlFor={`alertaMin-${row.itemId}`}
                    hint={
                      <p className="text-[12px] text-muted-foreground">
                        Piezas o menos. Vacío = no avisar de este producto.
                      </p>
                    }
                  >
                    <Input
                      id={`alertaMin-${row.itemId}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      placeholder="—"
                      value={minDraft[row.itemId] ?? ''}
                      onChange={(e) =>
                        setMinDraft((current) => ({
                          ...current,
                          [row.itemId]: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              ))}
              <FormAlert>{alertasOpen ? error : null}</FormAlert>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMinDraft(
                    Object.fromEntries(
                      rows.map((row) => [
                        row.itemId,
                        row.minQty == null ? '' : String(row.minQty),
                      ]),
                    ),
                  );
                  setAlertasOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingAlertas || rows.length === 0}>
                {savingAlertas ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
