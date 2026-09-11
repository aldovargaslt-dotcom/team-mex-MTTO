'use client';

import { useRole } from '@/lib/role';

export function RoleGate({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
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
        <a className="btn btn-primary" href="/">
          Ir a selección de rol
        </a>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="empty-state">
        <h2>Acceso restringido</h2>
        <p>
          Esta sección es exclusiva del administrador directivo. El supervisor
          solo puede consultar unidades y su hub.
        </p>
        <a className="btn btn-secondary" href="/unidades">
          Volver a unidades
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
