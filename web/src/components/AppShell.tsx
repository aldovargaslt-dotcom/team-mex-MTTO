'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandPlate } from '@/components/BrandPlate';
import { Badge } from '@/components/ui/badge';
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
      <header className="bg-navy text-[var(--shell-ink)]">
        <div className="mx-auto flex min-h-14 max-w-[1040px] flex-wrap items-center gap-3 px-4 py-2 md:gap-5">
          <Link href={role ? '/unidades' : '/'} className="flex items-center py-1">
            <BrandPlate />
          </Link>
          {!isHome && ready && role ? (
            <nav className="flex flex-1 flex-wrap gap-1" aria-label="Principal">
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
                <Badge variant="navy" className="bg-white/10 font-normal">
                  {etiquetaRol(role)}
                </Badge>
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
        'inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-white/80 hover:bg-white/10 hover:text-white',
        active && 'bg-white font-medium text-navy hover:bg-white hover:text-navy',
      )}
    >
      {children}
    </Link>
  );
}
