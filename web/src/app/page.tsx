'use client';

import { useRouter } from 'next/navigation';
import { etiquetaRol, useRole } from '@/lib/role';
import type { Role } from '@/lib/types';

export default function HomePage() {
  const { setRole, role, ready } = useRole();
  const router = useRouter();

  function elegir(next: Role) {
    setRole(next);
    router.push('/unidades');
  }

  return (
    <div className="home">
      <div className="home-card">
        <p className="muted">TEAM MEX</p>
        <h1>Mantenimiento de unidades</h1>
        <p className="lede">
          Seleccione un rol para continuar. Esta pantalla sustituye el inicio de
          sesión mientras el acceso real se implementa.
        </p>
        {ready && role ? (
          <p className="note">
            Rol actual: <strong>{etiquetaRol(role)}</strong>
          </p>
        ) : null}
        <div className="role-choices">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => elegir('SUPERVISOR')}
          >
            Entrar como supervisor
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => elegir('ADMIN_DIRECTIVO')}
          >
            Entrar como administrador directivo
          </button>
        </div>
      </div>
    </div>
  );
}
