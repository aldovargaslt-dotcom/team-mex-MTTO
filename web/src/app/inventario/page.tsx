'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  ItemInventario,
  Proveedor,
  TipoVehiculo,
} from '@/lib/types';
import {
  InventarioMovimientoSheet,
  type MovimientoSheetMode,
} from '@/components/InventarioMovimientoSheet';
import { NewItemDialog } from '@/components/NewItemDialog';
import { RefaccionFicha } from '@/components/RefaccionFicha';
import { Badge } from '@/components/ui/badge';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function ItemsPage() {
  const { role, userId } = useRole();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [openNuevo, setOpenNuevo] = useState(false);
  const [ficha, setFicha] = useState<ItemInventario | null>(null);
  const [itemId, setItemId] = useState('');
  const [mode, setMode] = useState<MovimientoSheetMode | null>(null);

  async function cargar() {
    const [lista, tps, provs] = await Promise.all([
      api<ItemInventario[]>('/inventario/items', { role: role!, userId }),
      api<TipoVehiculo[]>('/unidades/tipos', { role: role!, userId }),
      api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }),
    ]);
    setItems(lista);
    setTipos(tps);
    setProveedores(provs.filter((p) => p.activo));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar las refacciones.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function toggleActivo(item: ItemInventario) {
    setError(null);
    try {
      await api(`/inventario/items/${item.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ activo: !item.activo }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar.');
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.sku, item.nombre, item.oem ?? '', item.familiaNombre ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [items, q]);

  const columns: ColumnDef<ItemInventario, unknown>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          {row.original.nombre}
          {row.original.oem ? (
            <div className="text-xs text-muted-foreground">
              OEM {row.original.oem}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'familiaNombre',
      header: 'Categoría',
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="mono">
            {row.original.stock} {etiquetaUom(row.original.uom)}
          </span>
          <StockAlertaBadge alerta={row.original.alerta} />
        </div>
      ),
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'success' : 'muted'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant={row.original.activo ? 'dangerSoft' : 'outline'}
            size="compact"
            onClick={() => void toggleActivo(row.original)}
          >
            {row.original.activo ? 'Inactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Refacciones"
        actions={
          <Button type="button" onClick={() => setOpenNuevo(true)}>
            Nueva refacción
          </Button>
        }
      />

      <div className="mb-3">
        <Field label="Buscar" htmlFor="itemSearch">
          <Input
            id="itemSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, código o categoría"
          />
        </Field>
      </div>

      <FormAlert>{error}</FormAlert>

      {items.length > 0 || !error ? (
        <>
          <div className="inventario-refacciones-table">
            <DataTable
              columns={columns}
              data={filtered}
              empty={
                items.length === 0 ? (
                  <>
                    <span className="block font-medium text-navy">
                      Aún no hay refacciones.
                    </span>
                    <span>Agregue la primera con Nueva refacción.</span>
                  </>
                ) : (
                  <>
                    <span className="block font-medium text-navy">
                      Nada que coincida.
                    </span>
                    <span>Ajuste la búsqueda.</span>
                  </>
                )
              }
              onRowClick={(item) => setFicha(item)}
            />
          </div>

          <div className="inventario-refacciones-mobile md:hidden">
            {filtered.length > 0 ? (
              <ul className="inventory-mobile-list" aria-label="Refacciones">
                {filtered.map((item) => (
                  <li className="inventory-mobile-item" key={item.id}>
                    <button
                      type="button"
                      className="inventory-mobile-main"
                      onClick={() => setFicha(item)}
                    >
                      <span className="inventory-mobile-copy">
                        <span className="font-medium text-navy">{item.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          <span className="mono">{item.sku}</span>
                          {item.familiaNombre ? ` · ${item.familiaNombre}` : ''}
                        </span>
                      </span>
                      <span className="inventory-mobile-meta">
                        <span className="mono text-sm">
                          {item.stock} {etiquetaUom(item.uom)}
                        </span>
                        <StockAlertaBadge alerta={item.alerta} />
                      </span>
                    </button>
                    <div className="inventory-mobile-actions">
                      <Badge variant={item.activo ? 'success' : 'muted'}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button
                        type="button"
                        variant={item.activo ? 'dangerSoft' : 'outline'}
                        size="compact"
                        onClick={() => void toggleActivo(item)}
                      >
                        {item.activo ? 'Inactivar' : 'Activar'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="block font-medium text-navy">
                  {items.length === 0
                    ? 'Aún no hay refacciones.'
                    : 'Nada que coincida.'}
                </span>
                <span>
                  {items.length === 0
                    ? 'Agregue la primera con Nueva refacción.'
                    : 'Ajuste la búsqueda.'}
                </span>
              </div>
            )}
          </div>
        </>
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
        onAjuste={(item) => {
          setFicha(null);
          setItemId(item.id);
          setMode('ajuste');
        }}
      />

      <InventarioMovimientoSheet
        mode={mode}
        itemId={itemId}
        rows={items.map((item) => ({
          itemId: item.id,
          sku: item.sku,
          nombre: item.nombre,
          qty: item.stock,
          uom: item.uom,
        }))}
        lockItem
        role={role ?? ''}
        userId={userId}
        onClose={() => {
          setMode(null);
          setItemId('');
        }}
        onApplied={() => cargar()}
        onError={setError}
      />

      <NewItemDialog open={openNuevo} onOpenChange={setOpenNuevo} onCreated={() => cargar()} />
    </>
  );
}
