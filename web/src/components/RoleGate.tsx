'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRole } from '@/lib/role';
import type { Role } from '@/lib/types';

export function RoleGate({
  children,
  adminOnly = false,
  allow,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  allow?: Role[];
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

  const permitted = adminOnly
    ? isAdmin
    : allow
      ? allow.includes(role)
      : true;

  if (!permitted) {
    const home = role === 'LOGISTICA' ? '/flota' : '/inicio';
    return (
      <div className="empty-state">
        <h2>
          {role === 'LOGISTICA'
            ? 'Este módulo no está disponible para logística.'
            : allow?.includes('LOGISTICA')
              ? 'Esta vista es para logística y administración.'
              : 'Acceso restringido al administrador directivo.'}
        </h2>
        <Button asChild variant="secondary">
          <Link href={home}>
            {role === 'LOGISTICA' ? 'Volver' : 'Volver al inicio'}
          </Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
