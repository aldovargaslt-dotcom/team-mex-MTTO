'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRole } from '@/lib/role';

export function RoleGate({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { ready, role, isAdmin } = useRole();

  if (!ready) {
    return <p className="muted">Cargando sesión…</p>;
  }

  if (!role) {
    return (
      <div className="empty-state">
        <h2>Seleccione un rol</h2>
        <p>Para consultar unidades necesita indicar si es supervisor o administrador.</p>
        <Button asChild>
          <Link href="/">Ir a selección de rol</Link>
        </Button>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="empty-state">
        <h2>Acceso restringido</h2>
        <p>
          Esta sección es exclusiva del administrador directivo. El supervisor
          consulta unidades, registra visitas y opera el catálogo de inventario.
        </p>
        <Button asChild variant="secondary">
          <Link href="/unidades">Volver a unidades</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
