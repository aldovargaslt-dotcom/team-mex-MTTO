'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
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

const NAV_ITEMS = [
  { href: '/unidades', label: 'Unidades' },
  { href: '/andon', label: 'Andon' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/tipos', label: 'Tipos', adminOnly: true },
  { href: '/choferes', label: 'Choferes', adminOnly: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, clearRole, ready } = useRole();
  const isHome = pathname === '/';
  const showChrome = Boolean(!isHome && ready && role);
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !('adminOnly' in item) || isAdmin);

  function cambiarRol() {
    setMenuOpen(false);
    clearRole();
    router.push('/');
  }

  return (
    <div className="app">
      <header className="shell-header">
        <div className="shell-header__bar">
          <Link href={role ? '/unidades' : '/'} className="shell-header__brand">
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
              <Button type="button" variant="secondary" onClick={cambiarRol}>
                Cambiar rol
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
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
