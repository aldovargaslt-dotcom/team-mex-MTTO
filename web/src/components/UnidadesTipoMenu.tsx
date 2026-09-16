'use client';

import type { MouseEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';

export function UnidadesTipoMenu({
  tipoNombre,
  onEditar,
  onEliminar,
}: {
  tipoNombre: string;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  function cerrar(event: MouseEvent<HTMLButtonElement>) {
    const menu = event.currentTarget.closest('details');
    if (menu) menu.open = false;
  }

  return (
    <details className="unidades-tipo-menu">
      <summary aria-label={`Acciones del tipo ${tipoNombre}`}>
        <MoreHorizontal className="size-4" aria-hidden />
      </summary>
      <div className="unidades-tipo-menu__panel" role="menu">
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            cerrar(event);
            onEditar();
          }}
        >
          Editar tipo
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            cerrar(event);
            onEliminar();
          }}
        >
          Eliminar tipo
        </button>
      </div>
    </details>
  );
}
