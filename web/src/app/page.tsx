'use client';

import { useRouter } from 'next/navigation';
import { etiquetaRol, useRole } from '@/lib/role';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { setRole, role, ready } = useRole();
  const router = useRouter();

  function elegir(next: Role) {
    setRole(next);
    router.push(next === 'LOGISTICA' ? '/flota' : '/unidades');
  }

  return (
    <div className="home">
      <div className="home-card">
        <p className="text-xs text-muted-foreground">TEAM MEX</p>
        <h1>Operación de unidades</h1>
        <p className="lede">
          Seleccione un rol para continuar.
        </p>
        {ready && role ? (
          <p className="note">
            Rol actual: <strong>{etiquetaRol(role)}</strong>
          </p>
        ) : null}
        <div className="role-choices">
          <Button
            type="button"
            className="w-full"
            onClick={() => elegir('SUPERVISOR')}
          >
            Entrar como supervisor
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => elegir('ADMIN_DIRECTIVO')}
          >
            Entrar como administrador directivo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => elegir('LOGISTICA')}
          >
            Entrar como logística
          </Button>
        </div>
      </div>
    </div>
  );
}
