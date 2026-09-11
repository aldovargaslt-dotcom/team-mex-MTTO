'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import type { Familia, ItemInventario, Proveedor, TipoVehiculo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FormAlert, Note, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { ColumnDef } from '@tanstack/react-table';

export default function ItemsPage() {
  const { role, userId } = useRole();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [openNuevo, setOpenNuevo] = useState(false);
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [familiaId, setFamiliaId] = useState('');
  const [oem, setOem] = useState('');
  const [tipoIds, setTipoIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [minQty, setMinQty] = useState('');
  const [provId, setProvId] = useState('');
  const [codigoProv, setCodigoProv] = useState('');

  async function cargar() {
    const [lista, fams, tps, provs] = await Promise.all([
      api<ItemInventario[]>('/inventario/items', { role: role!, userId }),
      api<Familia[]>('/inventario/familias', { role: role!, userId }),
      api<TipoVehiculo[]>('/tipos-vehiculo', { role: role!, userId }),
      api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }),
    ]);
    setItems(lista);
    setFamilias(fams.filter((f) => f.activa));
    setTipos(tps);
    setProveedores(provs.filter((p) => p.activo));
    if (!familiaId && fams[0]) setFamiliaId(fams[0].id);
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(err instanceof HttpError ? err.message : 'No se pudieron cargar los ítems.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function toggleTipo(id: string) {
    setTipoIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/inventario/items', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          sku: sku.trim(),
          nombre: nombre.trim(),
          familiaId,
          oem: oem.trim() || undefined,
          tipoVehiculoIds: [...tipoIds],
        }),
      });
      setSku('');
      setNombre('');
      setOem('');
      setTipoIds(new Set());
      setOpenNuevo(false);
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo crear el ítem.');
    }
  }

  async function guardarMin(item: ItemInventario) {
    const next = minQty.trim() === '' ? null : Number(minQty);
    if (next !== null && (!Number.isInteger(next) || next < 0)) {
      setError('El mínimo debe ser un entero ≥ 0, o vacío para no alertar.');
      return;
    }
    if (next === item.minQty) return;
    setError(null);
    try {
      await api(`/inventario/items/${item.id}`, {
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

  async function toggleCompat(item: ItemInventario, tipoId: string, checked: boolean) {
    setError(null);
    try {
      if (checked) {
        await api(`/inventario/items/${item.id}/compatibilidad`, {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({ tipoVehiculoId: tipoId }),
        });
      } else {
        await api(`/inventario/items/${item.id}/compatibilidad/${tipoId}`, {
          role: role!,
          userId,
          method: 'DELETE',
        });
      }
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo guardar la compatibilidad.');
    }
  }

  async function addProveedor(itemId: string, event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api(`/inventario/items/${itemId}/proveedores`, {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          proveedorId: provId,
          codigoProveedor: codigoProv.trim(),
          preferido: true,
        }),
      });
      setProvId('');
      setCodigoProv('');
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo vincular el proveedor.');
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
            <div className="text-xs text-muted-foreground">OEM {row.original.oem}</div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'familiaNombre',
      header: 'Familia',
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
            variant="linkish"
            size="compact"
            onClick={() => {
              const next = openId === row.original.id ? null : row.original.id;
              setOpenId(next);
              if (next) {
                setMinQty(
                  row.original.minQty == null ? '' : String(row.original.minQty),
                );
              }
            }}
          >
            Detalle
          </Button>
          <Button
            type="button"
            variant={row.original.activo ? 'dangerSoft' : 'positive'}
            size="compact"
            onClick={() => void toggleActivo(row.original)}
          >
            {row.original.activo ? 'Inactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

  const detalle = items.find((item) => item.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Ítems"
        lede="SKU único, familia y compatibilidad por tipo de vehículo. UoM: pza."
        actions={
          <Button type="button" onClick={() => setOpenNuevo(true)}>
            Nuevo ítem
          </Button>
        }
      />

      <div className="mb-3">
        <Field label="Buscar" htmlFor="itemSearch">
          <Input
            id="itemSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU, nombre, OEM o familia"
          />
        </Field>
      </div>

      <FormAlert>{error}</FormAlert>

      <DataTable
        columns={columns}
        data={filtered}
        empty="No hay ítems que coincidan. Use Nuevo ítem para dar de alta un SKU."
      />

      {detalle ? (
        <Card className="mt-3 p-4">
          <p className="text-sm font-semibold text-navy">
            {detalle.sku} · {detalle.nombre}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="muted">
              Stock {detalle.stock} {etiquetaUom(detalle.uom)}
            </p>
            <StockAlertaBadge alerta={detalle.alerta} />
          </div>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void guardarMin(detalle);
            }}
          >
            <Field
              label="Mínimo"
              htmlFor="fichaStockMin"
              hint={
                <span className="text-xs text-muted-foreground">
                  Vacío = sin alerta. Supervisor y Admin.
                </span>
              }
            >
              <Input
                id="fichaStockMin"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="—"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="w-[7rem]"
              />
            </Field>
            <Button type="submit" variant="adjust" size="compact">
              Guardar mínimo
            </Button>
          </form>
          <p className="text-sm font-semibold text-navy" style={{ marginTop: 12 }}>
            Compatibilidad
          </p>
          <div className="chip-row">
            {tipos.map((tipo) => (
              <label key={tipo.id} className="check">
                <input
                  type="checkbox"
                  checked={detalle.tipoVehiculoIds.includes(tipo.id)}
                  onChange={(e) =>
                    void toggleCompat(detalle, tipo.id, e.target.checked)
                  }
                />
                {tipo.nombre}
              </label>
            ))}
          </div>
          {detalle.tipoVehiculoIds.length === 0 ? (
            <Note variant="warn">
              Sin compatibilidades este SKU no aparecerá en Piezas.
            </Note>
          ) : null}
          <p className="muted" style={{ marginTop: 10 }}>
            Proveedores
          </p>
          {detalle.proveedores.length === 0 ? (
            <p className="muted">Sin código de proveedor.</p>
          ) : (
            <ul className="plain-list">
              {detalle.proveedores.map((p) => (
                <li key={p.id}>
                  {p.proveedorNombre} · {p.codigoProveedor}
                  {p.preferido ? ' · preferido' : ''}
                </li>
              ))}
            </ul>
          )}
          <form
            className="inline-form"
            onSubmit={(e) => void addProveedor(detalle.id, e)}
          >
            <NativeSelect
              value={provId}
              onChange={(e) => setProvId(e.target.value)}
              required
              aria-label="Proveedor"
              className="h-9 min-h-9 w-auto"
            >
              <option value="">Proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </NativeSelect>
            <Input
              value={codigoProv}
              onChange={(e) => setCodigoProv(e.target.value)}
              placeholder="Código proveedor"
              required
              aria-label="Código proveedor"
              className="h-9 min-h-9 w-[180px]"
            />
            <Button size="compact" type="submit" variant="linkish">
              Vincular
            </Button>
          </form>
        </Card>
      ) : null}

      <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ítem</DialogTitle>
            <DialogDescription>
              El SKU debe ser único. La compatibilidad determina si aparece en Piezas.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={crear}>
            <Field label="SKU" htmlFor="sku">
              <Input
                id="sku"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="FIL-ACEITE-01"
              />
            </Field>
            <Field label="Nombre" htmlFor="itemNombre">
              <Input
                id="itemNombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Filtro de aceite"
              />
            </Field>
            <Field label="Familia" htmlFor="familiaId">
              <NativeSelect
                id="familiaId"
                required
                value={familiaId}
                onChange={(e) => setFamiliaId(e.target.value)}
              >
                <option value="">Seleccione</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="OEM" htmlFor="oem">
              <Input
                id="oem"
                value={oem}
                onChange={(e) => setOem(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Compatibilidad</p>
              <div className="chip-row">
                {tipos.map((tipo) => (
                  <label key={tipo.id} className="check">
                    <input
                      type="checkbox"
                      checked={tipoIds.has(tipo.id)}
                      onChange={() => toggleTipo(tipo.id)}
                    />
                    {tipo.nombre}
                  </label>
                ))}
              </div>
              {tipoIds.size === 0 ? (
                <Note variant="warn">
                  Sin compatibilidades este SKU no aparecerá en Piezas.
                </Note>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenNuevo(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!familiaId}>
                Guardar ítem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
