'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandPlate } from '@/components/BrandPlate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { etiquetaRol, useRole } from '@/lib/role';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, clearRole, ready } = useRole();
  const isHome = pathname === '/';

  return (
    <div className="app">
      <header className="bg-shell text-[var(--shell-ink)]">
        <div className="mx-auto flex min-h-12 max-w-[1040px] flex-wrap items-center gap-3 px-4 py-1.5 md:gap-5">
          <Link href={role ? '/unidades' : '/'} className="flex items-center py-1">
            <BrandPlate />
          </Link>
          {!isHome && ready && role ? (
            <nav className="flex flex-1 flex-wrap gap-0.5" aria-label="Principal">
              <NavLink href="/unidades" active={Boolean(pathname?.startsWith('/unidades'))}>
                Unidades
              </NavLink>
              <NavLink href="/inventario" active={Boolean(pathname?.startsWith('/inventario'))}>
                Inventario
              </NavLink>
              {isAdmin ? (
                <>
                  <NavLink href="/tipos" active={Boolean(pathname?.startsWith('/tipos'))}>
                    Tipos
                  </NavLink>
                  <NavLink href="/choferes" active={Boolean(pathname?.startsWith('/choferes'))}>
                    Choferes
                  </NavLink>
                </>
              ) : null}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {ready && role && !isHome ? (
              <>
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
                  {etiquetaRol(role)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    clearRole();
                    router.push('/');
                  }}
                >
                  Cambiar rol
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className={isHome ? 'main main-home' : 'main'}>{children}</main>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-9 items-center rounded-none px-2.5 text-[13px] text-white/65 hover:text-white',
        active &&
          'font-medium text-white shadow-[inset_0_-2px_0_#ea7515]',
      )}
    >
      {children}
    </Link>
  );
}
