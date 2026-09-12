'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import type { ItemInventario, Proveedor, TipoVehiculo } from '@/lib/types';
import { StockAlertaBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, Note } from '@/components/ui/field';
import { Hint } from '@/components/ui/hint';
import { Input, NativeSelect } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function RefaccionFicha({
  item,
  tipos,
  proveedores,
  role,
  userId,
  onClose,
  onChanged,
  onAjuste,
}: {
  item: ItemInventario | null;
  tipos: TipoVehiculo[];
  proveedores: Proveedor[];
  role: string;
  userId?: string;
  onClose: () => void;
  onChanged: (item?: ItemInventario) => void;
  onAjuste: (item: ItemInventario) => void;
}) {
  const [minQty, setMinQty] = useState('');
  const [provId, setProvId] = useState('');
  const [codigoProv, setCodigoProv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<ItemInventario | null>(item);

  useEffect(() => {
    setLocal(item);
    setMinQty(item?.minQty == null ? '' : String(item.minQty));
    setProvId('');
    setCodigoProv('');
    setError(null);
  }, [item]);

  const detalle = local;

  async function refresh() {
    if (!detalle) return;
    const updated = await api<ItemInventario>(
      `/inventario/items/${detalle.id}`,
      { role, userId },
    );
    setLocal(updated);
    setMinQty(updated.minQty == null ? '' : String(updated.minQty));
    onChanged(updated);
  }

  async function guardarMin(event: FormEvent) {
    event.preventDefault();
    if (!detalle) return;
    const next = minQty.trim() === '' ? null : Number(minQty);
    if (next !== null && (!Number.isInteger(next) || next < 0)) {
      setError('Indique un número entero, o déjelo vacío.');
      return;
    }
    if (next === detalle.minQty) return;
    setError(null);
    try {
      await api(`/inventario/items/${detalle.id}`, {
        role,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ minQty: next }),
      });
      notifyInboxChanged();
      await refresh();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo guardar cuándo avisar.',
      );
    }
  }

  async function toggleActivo() {
    if (!detalle) return;
    setError(null);
    try {
      await api(`/inventario/items/${detalle.id}`, {
        role,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ activo: !detalle.activo }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar.');
    }
  }

  async function toggleCompat(tipoId: string, checked: boolean) {
    if (!detalle) return;
    setError(null);
    try {
      if (checked) {
        await api(`/inventario/items/${detalle.id}/compatibilidad`, {
          role,
          userId,
          method: 'POST',
          body: JSON.stringify({ tipoVehiculoId: tipoId }),
        });
      } else {
        await api(`/inventario/items/${detalle.id}/compatibilidad/${tipoId}`, {
          role,
          userId,
          method: 'DELETE',
        });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo guardar.');
    }
  }

  async function addProveedor(event: FormEvent) {
    event.preventDefault();
    if (!detalle) return;
    setError(null);
    try {
      await api(`/inventario/items/${detalle.id}/proveedores`, {
        role,
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
      await refresh();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo agregar el proveedor.',
      );
    }
  }

  return (
    <Sheet
      open={item != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>
            {detalle ? `${detalle.sku} · ${detalle.nombre}` : 'Refacción'}
          </SheetTitle>
          <SheetDescription>
            Stock, mínimo y compatibilidad. La lista queda de consulta.
          </SheetDescription>
        </SheetHeader>
        {detalle ? (
          <div className="grid gap-3 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="muted">
                Stock {detalle.stock} {etiquetaUom(detalle.uom)}
              </p>
              <StockAlertaBadge alerta={detalle.alerta} />
            </div>
            <FormAlert>{error}</FormAlert>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={guardarMin}
            >
              <Field
                label="Mínimo"
                htmlFor="fichaStockMin"
                hint={
                  <p className="text-[12px] text-muted-foreground">
                    Piezas o menos. Vacío = no avisar de este producto.
                  </p>
                }
              >
                <Input
                  id="fichaStockMin"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="Sin mínimo"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="w-[7rem]"
                />
              </Field>
              <Button type="submit" variant="outline" size="compact">
                Guardar
              </Button>
            </form>
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
              Vehículos
              <Hint label="En qué tipos de unidad se puede usar." />
            </p>
            <div className="chip-row">
              {tipos.map((tipo) => (
                <label key={tipo.id} className="check">
                  <input
                    type="checkbox"
                    checked={detalle.tipoVehiculoIds.includes(tipo.id)}
                    onChange={(e) =>
                      void toggleCompat(tipo.id, e.target.checked)
                    }
                  />
                  {tipo.nombre}
                </label>
              ))}
            </div>
            {detalle.tipoVehiculoIds.length === 0 && tipos.length > 0 ? (
              <Note variant="warn">Elija al menos un tipo de vehículo.</Note>
            ) : null}
            <p className="muted">Proveedores</p>
            {detalle.proveedores.length === 0 ? (
              <p className="muted">Ninguno.</p>
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
            <form className="inline-form" onSubmit={addProveedor}>
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
                placeholder="Código"
                required
                aria-label="Código proveedor"
                className="h-9 min-h-9 w-[180px]"
              />
              <Button size="compact" type="submit" variant="outline">
                Agregar
              </Button>
            </form>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant={detalle.activo ? 'dangerSoft' : 'outline'}
                size="compact"
                onClick={() => void toggleActivo()}
              >
                {detalle.activo ? 'Inactivar' : 'Activar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="compact"
                onClick={() => onAjuste(detalle)}
              >
                Ajuste
              </Button>
              <Button asChild variant="outline" size="compact">
                <Link href={`/inventario/movimientos?item=${detalle.id}`}>
                  Movimientos
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
