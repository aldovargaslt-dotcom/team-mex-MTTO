'use client';

import type { MouseEvent } from 'react';
import { ChevronDown } from 'lucide-react';

export function UnidadesAdminMenu({
  onNuevoTipo,
  onAlertas,
  onSalud,
}: {
  onNuevoTipo: () => void;
  onAlertas: () => void;
  onSalud: () => void;
}) {
  function cerrar(event: MouseEvent<HTMLButtonElement>) {
    const menu = event.currentTarget.closest('details');
    if (menu) menu.open = false;
  }

  return (
    <details className="unidades-admin-menu">
      <summary>
        Administrar
        <ChevronDown className="size-3.5" aria-hidden />
      </summary>
      <div className="unidades-admin-menu__panel" role="menu">
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            cerrar(event);
            onNuevoTipo();
          }}
        >
          Nuevo tipo
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            cerrar(event);
            onAlertas();
          }}
        >
          Configurar alertas
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            cerrar(event);
            onSalud();
          }}
        >
          Configuración de salud
        </button>
      </div>
    </details>
  );
}
