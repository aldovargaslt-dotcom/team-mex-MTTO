'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Menu, Truck } from 'lucide-react';
import { BrandPlate } from '@/components/BrandPlate';
import { Campanita } from '@/components/Campanita';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { etiquetaRol, useRole } from '@/lib/role';
import type { Role } from '@/lib/types';

const NAV_ITEMS: {
  href: string;
  label: string;
  roles: Role[];
}[] = [
  { href: '/inicio', label: 'Inicio', roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  {
    href: '/ordenes',
    label: 'Órdenes',
    roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'],
  },
  { href: '/logistica', label: 'Inicio', roles: ['LOGISTICA'] },
  { href: '/flota', label: 'Movimientos', roles: ['LOGISTICA', 'ADMIN_DIRECTIVO'] },
  { href: '/unidades', label: 'Unidades', roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/andon', label: 'Mantenimiento vencido', roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  {
    href: '/inventario',
    label: 'Inventario',
    roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'],
  },
  { href: '/choferes', label: 'Choferes', roles: ['ADMIN_DIRECTIVO'] },
  {
    href: '/configuracion/alertas',
    label: 'Configuración',
    roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA'],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLogistica, clearRole, ready } = useRole();
  const isHome = pathname === '/';
  const showChrome = Boolean(!isHome && ready && role);
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => role && item.roles.includes(role));
  const homeHref = isLogistica ? '/logistica' : '/inicio';

  function cambiarRol() {
    setMenuOpen(false);
    clearRole();
    router.push('/');
  }

  return (
    <div className="app">
      <header className="shell-header">
        <div className="shell-header__bar">
          <Link href={role ? homeHref : '/'} className="shell-header__brand">
            <BrandPlate />
          </Link>
          {showChrome ? (
            <nav className="shell-header__nav hidden md:flex" aria-label="Principal">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  active={Boolean(pathname?.startsWith(item.href))}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
          <div className="shell-header__actions">
            {showChrome ? (
              <>
                <Campanita />
                <span className="shell-header__role hidden md:inline">
                  {etiquetaRol(role!)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="shell-header__role-switch hidden md:inline-flex"
                  onClick={cambiarRol}
                >
                  Cambiar rol
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shell-header__menu md:hidden"
                  aria-label="Abrir menú"
                  aria-expanded={menuOpen}
                  aria-controls="shell-menu"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu aria-hidden className="size-5" strokeWidth={2} />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      {showChrome ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            id="shell-menu"
            side="right"
            className="w-[min(100%,20rem)] sm:max-w-xs"
            onOpenAutoFocus={(event) => {
              const root = event.currentTarget as HTMLElement;
              const current = root.querySelector<HTMLElement>(
                '.shell-menu-link.active',
              );
              const first = root.querySelector<HTMLElement>('.shell-menu-link');
              const target = current ?? first;
              if (!target) return;
              event.preventDefault();
              target.focus();
            }}
          >
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
              <SheetDescription>{etiquetaRol(role!)}</SheetDescription>
            </SheetHeader>
            <nav className="shell-menu-nav" aria-label="Principal">
              {items.map((item) => {
                const active = Boolean(pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('shell-menu-link', active && 'active')}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <SheetFooter>
              <Button type="button" variant="quiet" onClick={cambiarRol}>
                Cambiar rol
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
      {showChrome && isLogistica ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden" aria-label="Navegación de Logística">
          <Link href="/logistica" aria-current={pathname === '/logistica' ? 'page' : undefined} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-xs', pathname === '/logistica' ? 'font-semibold text-navy' : 'text-muted-foreground')}>
            <Home className="size-5" aria-hidden />Inicio
          </Link>
          <Link href="/flota" aria-current={pathname?.startsWith('/flota') ? 'page' : undefined} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-xs', pathname?.startsWith('/flota') ? 'font-semibold text-navy' : 'text-muted-foreground')}>
            <Truck className="size-5" aria-hidden />Movimientos
          </Link>
        </nav>
      ) : null}
      <main
        className={
          isHome
            ? 'main main-home'
            : pathname?.startsWith('/ordenes')
              ? 'main main-ordenes'
              : isLogistica ? 'main pb-20 md:pb-4' : 'main'
        }
      >
        {children}
      </main>
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
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-9 items-center rounded-none px-2.5 text-[13px] text-white/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active &&
          'font-medium text-white shadow-[inset_0_-2px_0_#ea7515]',
      )}
    >
      {children}
    </Link>
  );
}
