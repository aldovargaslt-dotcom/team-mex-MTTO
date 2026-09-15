'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaMinimo, etiquetaUom, magnitudExistencia } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
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
import { ListFilter } from '@/components/ListFilter';
import { RefaccionFicha } from '@/components/RefaccionFicha';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const FILTROS: { id: 'TODOS' | AlertaStock; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'BAJO', label: 'Bajo' },
  { id: 'AGOTADO', label: 'Agotado' },
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
  const [rows, setRows] = useState<StockRow[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [minDraft, setMinDraft] = useState<Record<string, string>>({});
  const [ficha, setFicha] = useState<ItemInventario | null>(null);
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<MovimientoSheetMode | null>(null);
  const [lockItem, setLockItem] = useState(false);
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [savingAlertas, setSavingAlertas] = useState(false);

  async function cargar() {
    const [data, tps, provs] = await Promise.all([
      api<StockRow[]>('/inventario/stock', { role: role!, userId }),
      api<TipoVehiculo[]>('/unidades/tipos', { role: role!, userId }),
      api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }),
    ]);
    setRows(data);
    setTipos(tps);
    setProveedores(provs.filter((p) => p.activo));
    setMinDraft(
      Object.fromEntries(
        data.map((row) => [row.itemId, row.minQty == null ? '' : String(row.minQty)]),
      ),
    );
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar las existencias.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function abrirEntrada() {
    setLockItem(false);
    setItemId(rows[0]?.itemId ?? '');
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

  const filtered = useMemo(() => {
    if (filtro === 'TODOS') return rows;
    return rows.filter((row) => row.alerta === filtro);
  }, [rows, filtro]);

  const columns: ColumnDef<StockRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
      },
      { accessorKey: 'nombre', header: 'Nombre' },
      { accessorKey: 'familia', header: 'Categoría' },
      {
        accessorKey: 'qty',
        header: 'Cant.',
        cell: ({ row }) => (
          <span className="mono">{magnitudExistencia(row.original)}</span>
        ),
      },
      {
        id: 'min',
        header: 'Mínimo',
        cell: ({ row }) => etiquetaMinimo(row.original.minQty),
      },
      {
        id: 'alerta',
        header: 'Estado',
        cell: ({ row }) => <StockAlertaBadge alerta={row.original.alerta} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Existencias"
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
              onClick={abrirEntrada}
              disabled={rows.length === 0}
            >
              Registrar entrada
            </Button>
          </>
        }
      />
      <ListFilter
        label="Filtro de existencias"
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
        <DataTable
          columns={columns}
          data={filtered}
          empty={emptyExistencias(filtro)}
          onRowClick={(row) => void abrirFicha(row)}
        />
      ) : null}

      <RefaccionFicha
        item={ficha}
        tipos={tipos}
        proveedores={proveedores}
        role={role ?? ''}
        userId={userId}
        onClose={() => setFicha(null)}
        onChanged={(updated) => {
          if (updated) setFicha(updated);
          void cargar();
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
                      placeholder="Sin mínimo"
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
