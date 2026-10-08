'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, ClipboardList, Home, Menu, Settings, Truck } from 'lucide-react';
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
  { href: '/mi-trabajo', label: 'Mi trabajo', roles: ['MECANICO'] },
];

const SUPERVISOR_PRIMARY = new Set([
  '/inicio',
  '/ordenes',
  '/unidades',
  '/inventario',
]);

const SUPERVISOR_BOTTOM_NAV = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/ordenes', label: 'Órdenes', icon: ClipboardList },
  { href: '/unidades', label: 'Unidades', icon: Truck },
  { href: '/inventario', label: 'Inventario', icon: Boxes },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, roles, isLogistica, clearRole, ready, development } = useRole();
  const isHome = pathname === '/';
  const isCheckWorkflow = pathname?.startsWith('/checks/');
  const showChrome = Boolean(!isHome && ready && role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    if (ready && !role && !isHome) router.replace('/');
  }, [ready, role, isHome, router]);

  const allItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));
  const items =
    role === 'SUPERVISOR'
      ? allItems.filter((item) => SUPERVISOR_PRIMARY.has(item.href))
      : allItems;
  const menuItems =
    role === 'SUPERVISOR'
      ? allItems.filter((item) => !SUPERVISOR_PRIMARY.has(item.href))
      : role === 'ADMIN_DIRECTIVO'
        ? [...allItems, { href: '/configuracion/usuarios', label: 'Usuarios' }]
        : allItems;
  const homeHref = isLogistica ? '/logistica' : role === 'MECANICO' ? '/mi-trabajo' : '/inicio';

  async function cambiarRol() {
    setLogoutError('');
    try {
      await clearRole();
      setMenuOpen(false);
      router.push('/');
    } catch {
      setLogoutError('No se pudo cerrar sesión. Intenta de nuevo.');
    }
  }

  return (
    <div className="app">
      {!isCheckWorkflow ? <header className="shell-header">
        <div className="shell-header__bar">
          <Link href={role ? homeHref : '/'} className="shell-header__brand">
            <BrandPlate />
          </Link>
          {role === 'MECANICO' && pathname === '/mi-trabajo' ? (
            <span className="flex min-w-0 flex-col leading-tight md:hidden">
              <span className="truncate text-sm font-semibold text-white">TEAM MEX MTTO</span>
            </span>
          ) : null}
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
                {role === 'SUPERVISOR' ? (
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
                  >
                    <Link href="/configuracion/alertas" aria-label="Configuración">
                      <Settings aria-hidden className="size-4" />
                    </Link>
                  </Button>
                ) : null}
                <span className="shell-header__role hidden md:inline">
                  {etiquetaRol(role!)}
                </span>
                {!development && roles.length > 1 ? (
                  <Button asChild variant="ghost" className="shell-header__role-switch hidden md:inline-flex">
                    <Link href="/">Elegir rol</Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="shell-header__role-switch hidden md:inline-flex"
                  onClick={cambiarRol}
                >
                  {development ? 'Cambiar rol' : 'Cerrar sesión'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'shell-header__menu',
                    role === 'SUPERVISOR' ? '' : 'md:hidden',
                  )}
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
      </header> : null}
      {showChrome && !isCheckWorkflow ? (
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
              {menuItems.map((item) => {
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
              {!development && roles.length > 1 ? (
                <Button asChild variant="secondary">
                  <Link href="/" onClick={() => setMenuOpen(false)}>Elegir rol</Link>
                </Button>
              ) : null}
              <Button type="button" variant="quiet" onClick={cambiarRol}>
                {development ? 'Cambiar rol' : 'Cerrar sesión'}
              </Button>
            </SheetFooter>
            {logoutError ? <p role="alert" className="px-4 text-sm text-destructive">{logoutError}</p> : null}
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
      {showChrome && role === 'SUPERVISOR' ? (
        <nav className="supervisor-bottom-nav md:hidden" aria-label="Navegación del Supervisor">
          {SUPERVISOR_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/inicio'
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('supervisor-bottom-nav__item', active && 'active')}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <main
        className={
          isHome
            ? 'main main-home'
            : pathname?.startsWith('/ordenes')
              ? 'main main-ordenes'
              : isLogistica || role === 'SUPERVISOR'
                ? 'main pb-20 md:pb-4'
                : 'main'
        }
      >
        {logoutError && !menuOpen ? <p role="alert" className="text-sm text-destructive">{logoutError}</p> : null}
        {isHome || (ready && role) ? children : <p role="status">Verificando sesión…</p>}
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
