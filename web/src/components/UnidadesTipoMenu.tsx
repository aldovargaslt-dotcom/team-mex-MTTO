'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function UnidadesTipoMenu({
  tipoNombre,
  onEditar,
  onEliminar,
}: {
  tipoNombre: string;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="unidades-tipo-menu__trigger"
        aria-label={`Acciones del tipo ${tipoNombre}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="sm:max-w-none pb-8">
          <SheetHeader>
            <SheetTitle>Tipo {tipoNombre}</SheetTitle>
            <SheetDescription>
              Editar o eliminar aplica a este tipo, no a una unidad.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                onEditar();
              }}
            >
              Editar tipo
            </Button>
            <Button
              type="button"
              variant="dangerSoft"
              onClick={() => {
                setOpen(false);
                onEliminar();
              }}
            >
              Eliminar tipo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
