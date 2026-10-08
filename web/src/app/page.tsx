'use client';
import { useRouter } from 'next/navigation';
import { etiquetaRol, useRole } from '@/lib/role';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
export default function HomePage() {
  const { setRole, role, ready, roles, development, displayName, sessionError, reloadSession } = useRole();
  const router = useRouter();
  const [loginError, setLoginError] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('authError')) {
      setLoginError(true);
      window.history.replaceState(null, '', '/');
    }
  }, []);
  function elegir(next: Role) {
    setRole(next);
    router.push(next === 'LOGISTICA' ? '/flota' : next === 'MECANICO' ? '/mi-trabajo' : '/inicio');
  }
  return (
    <div className="home"><div className="home-card">
      <p className="text-xs text-muted-foreground">TEAM MEX</p>
      <h1>Operación de unidades</h1>
      {!ready ? <p className="lede" role="status">Verificando sesión…</p> : <>
        <p className="lede">{displayName ? `Hola, ${displayName}. Selecciona un rol para continuar.` : development ? 'Seleccione un rol para continuar.' : 'Inicia sesión con tu cuenta para continuar.'}</p>
        {development ? <p className="note">Acceso de prueba local.</p> : null}
        {role ? <p className="note">Rol actual: <strong>{etiquetaRol(role)}</strong></p> : null}
        {sessionError || loginError ? <p className="text-sm text-destructive" role="alert">{sessionError || 'No se pudo iniciar sesión. Verifica tu cuenta o solicita acceso al administrador.'}</p> : null}
        <div className="role-choices">
          {roles.map((granted, index) => <Button key={granted} type="button" className="w-full" variant={index === 0 ? 'default' : 'secondary'} onClick={() => elegir(granted)}>Entrar como {etiquetaRol(granted).toLowerCase()}</Button>)}
          {!development && !roles.length ? <Button asChild className="w-full"><a href="/api/auth/login">Iniciar sesión</a></Button> : null}
          {sessionError ? <Button type="button" variant="secondary" className="w-full" onClick={() => void reloadSession()}>Verificar sesión de nuevo</Button> : null}
        </div>
      </>}
    </div></div>
  );
}
