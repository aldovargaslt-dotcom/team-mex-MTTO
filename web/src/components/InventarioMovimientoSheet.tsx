'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type MovimientoSheetMode = 'entrada' | 'ajuste';

export type MovimientoSheetRow = {
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  uom?: string | null;
};

export function InventarioMovimientoSheet({
  mode,
  itemId,
  rows,
  lockItem,
  role,
  userId,
  onClose,
  onApplied,
  onError,
}: {
  mode: MovimientoSheetMode | null;
  itemId: string;
  rows: MovimientoSheetRow[];
  lockItem?: boolean;
  role: string;
  userId?: string;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [qty, setQty] = useState('1');
  const [nota, setNota] = useState('');
  const [currentId, setCurrentId] = useState(itemId);

  const selected = rows.find((row) => row.itemId === currentId);

  useEffect(() => {
    if (!mode) return;
    setCurrentId(itemId);
    setQty(mode === 'ajuste' ? '-1' : '1');
    setNota('');
  }, [mode, itemId]);

  async function aplicar(event: FormEvent) {
    event.preventDefault();
    if (!currentId || !mode) return;
    try {
      if (mode === 'entrada') {
        await api('/inventario/movimientos/entrada', {
          role,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId: currentId,
            qty: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      } else {
        await api('/inventario/movimientos/ajuste', {
          role,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId: currentId,
            qtyDelta: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      }
      notifyInboxChanged();
      onClose();
      await onApplied();
    } catch (err) {
      onError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo registrar el movimiento.',
      );
    }
  }

  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="bottom" className="sm:max-w-none">
        <SheetHeader>
          <SheetTitle>{mode === 'ajuste' ? 'Ajuste' : 'Entrada'}</SheetTitle>
          <SheetDescription>
            {selected
              ? `${selected.sku} · ${selected.nombre}`
              : 'Elija la refacción y la cantidad.'}
          </SheetDescription>
        </SheetHeader>
        <form className="grid gap-3 px-4 pb-4" onSubmit={aplicar}>
          <Field label="SKU" htmlFor="movItem">
            <NativeSelect
              id="movItem"
              required
              value={currentId}
              disabled={lockItem}
              onChange={(e) => setCurrentId(e.target.value)}
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
            htmlFor="movQty"
            help={
              mode === 'ajuste' ? 'Positivo suma. Negativo resta.' : undefined
            }
          >
            <Input
              id="movQty"
              type="number"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min={mode === 'entrada' ? 1 : undefined}
              step={1}
            />
          </Field>
          <Field label="Nota" htmlFor="movNota">
            <Textarea
              id="movNota"
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
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
