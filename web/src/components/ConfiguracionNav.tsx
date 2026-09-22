'use client';

import Link from 'next/link';

/** Ubicación de sección (patrón 3 + chrome `.subnav`). No es sidebar de settings. */
export function ConfiguracionNav() {
  return (
    <nav className="subnav" aria-label="Configuración">
      <span className="inline-flex min-h-[var(--tap)] items-center px-2 text-[13px] text-muted-foreground">
        Configuración
      </span>
      <Link
        href="/configuracion/alertas"
        className="active"
        aria-current="page"
      >
        Alertas
      </Link>
    </nav>
  );
}
