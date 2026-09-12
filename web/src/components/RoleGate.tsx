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
        <h2>Seleccione un rol.</h2>
        <Button asChild>
          <Link href="/">Ir a selección de rol</Link>
        </Button>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="empty-state">
        <h2>Acceso restringido al administrador directivo.</h2>
        <Button asChild variant="secondary">
          <Link href="/inicio">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
