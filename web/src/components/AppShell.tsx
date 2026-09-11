'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandPlate } from '@/components/BrandPlate';
import { etiquetaRol, useRole } from '@/lib/role';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, clearRole, ready } = useRole();
  const isHome = pathname === '/';

  return (
    <div className="app">
      <header className="shell">
        <div className="shell-inner">
          <Link href={role ? '/unidades' : '/'} className="brand">
            <BrandPlate />
          </Link>
          {!isHome && ready && role ? (
            <nav className="nav">
              <Link
                className={pathname?.startsWith('/unidades') ? 'active' : ''}
                href="/unidades"
              >
                Unidades
              </Link>
              {isAdmin ? (
                <>
                  <Link
                    className={pathname?.startsWith('/tipos') ? 'active' : ''}
                    href="/tipos"
                  >
                    Tipos
                  </Link>
                  <Link
                    className={pathname?.startsWith('/choferes') ? 'active' : ''}
                    href="/choferes"
                  >
                    Choferes
                  </Link>
                </>
              ) : null}
            </nav>
          ) : null}
          <div className="shell-actions">
            {ready && role && !isHome ? (
              <>
                <span className="role-pill">{etiquetaRol(role)}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    clearRole();
                    router.push('/');
                  }}
                >
                  Cambiar rol
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className={isHome ? 'main main-home' : 'main'}>{children}</main>
    </div>
  );
}
