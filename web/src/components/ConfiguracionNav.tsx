'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role';

/** Ubicación de sección (patrón 3 + chrome `.subnav`). No es sidebar de settings. */
export function ConfiguracionNav() {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  return (
    <nav className="subnav" aria-label="Configuración">
      <span className="inline-flex min-h-[var(--tap)] items-center px-2 text-[13px] text-muted-foreground">
        Configuración
      </span>
      <Link
        href="/configuracion/alertas"
        className={pathname === '/configuracion/alertas' ? 'active' : undefined}
        aria-current={
          pathname === '/configuracion/alertas' ? 'page' : undefined
        }
      >
        Alertas
      </Link>
      {isAdmin ? (
        <Link
          href="/configuracion/usuarios"
          className={
            pathname === '/configuracion/usuarios' ? 'active' : undefined
          }
          aria-current={
            pathname === '/configuracion/usuarios' ? 'page' : undefined
          }
        >
          Usuarios
        </Link>
      ) : null}
    </nav>
  );
}
