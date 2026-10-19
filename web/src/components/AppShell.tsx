'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen, LogOut, ChevronsUpDown } from 'lucide-react';
import { InventorySectionMenu } from '@/components/InventorySectionMenu';
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
import { ApplicationNavigation, applicationNavigation, applicationBottomNavigation, navigationIsActive } from '@/components/ApplicationNavigation';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, roles, isLogistica, clearRole, ready, development } = useRole();
  const isHome = pathname === '/';
  const isCheckWorkflow = pathname?.startsWith('/checks/');
  const showChrome = Boolean(!isHome && ready && role);
  const maintenanceVisual = Boolean(showChrome && !isCheckWorkflow && (((role === 'SUPERVISOR' || role === 'ADMIN_DIRECTIVO') && (pathname.startsWith('/ordenes') || pathname.startsWith('/unidades') || pathname.startsWith('/analisis-mantenimiento'))) || (role === 'MECANICO' && pathname.startsWith('/mi-trabajo'))));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    if (ready && !role && !isHome) router.replace('/');
  }, [ready, role, isHome, router]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuItems = applicationNavigation(role);
  const bottomItems = applicationBottomNavigation(role);
  const currentItem = menuItems.find((item) => navigationIsActive(pathname, item.href));
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
    <div className={cn('app', maintenanceVisual && 'app--maintenance', maintenanceVisual && role === 'MECANICO' && 'app--mechanic-visual', showChrome && !isCheckWorkflow && 'app-workspace', pathname?.startsWith('/unidades') && 'app-workspace--units', sidebarCollapsed && 'app-workspace--collapsed')}>
      {showChrome && !isCheckWorkflow ? (
        <aside id="desktop-navigation" className="app-sidebar" aria-label="Navegación de la aplicación">
          <Link href={homeHref} className="app-sidebar__brand" aria-label="Team Mex, inicio"><BrandPlate /></Link>
          <div className="app-sidebar__caption">MANTENIMIENTO DE FLOTA</div>
          <ApplicationNavigation items={menuItems} pathname={pathname} collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} />
          <div className="app-sidebar__session">
            <span className="app-sidebar__avatar" aria-hidden>{role?.slice(0, 1)}</span>
            <div><strong>{etiquetaRol(role!)}</strong><span>{development ? 'Entorno de desarrollo' : 'Sesión activa'}</span></div>
          </div>
          {!development && roles.length > 1 ? <Link className="app-sidebar__link" href="/" aria-label="Elegir rol" title={sidebarCollapsed ? "Elegir rol" : undefined}><ChevronsUpDown className="size-4" aria-hidden /><span>Elegir rol</span></Link> : null}
          <button type="button" className="app-sidebar__link" onClick={cambiarRol} aria-label={development ? 'Cambiar rol' : 'Cerrar sesión'} title={development ? 'Cambiar rol' : 'Cerrar sesión'}>
            <LogOut aria-hidden className="size-4" /><span>{development ? 'Cambiar rol' : 'Cerrar sesión'}</span>
          </button>
        </aside>
      ) : null}
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
          {showChrome ? <div className="app-topbar-context">
            <Button variant="secondary" size="icon" aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'} aria-expanded={!sidebarCollapsed} aria-controls="desktop-navigation" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            </Button>
            <span>Operación</span><span aria-hidden>/</span><strong>{currentItem?.label ?? 'Mantenimiento'}</strong>
          </div> : null}
          <div className="shell-header__actions">
            {showChrome ? (
              <>
                <Campanita />
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
                    'md:hidden',
                  )}
                  ref={menuTrigger}
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
            side="left"
            className="w-[min(100%,20rem)] sm:max-w-xs"
            onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }}
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
            <ApplicationNavigation items={menuItems} pathname={pathname} mobile onNavigate={() => setMenuOpen(false)} />
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
      {showChrome && !isCheckWorkflow && bottomItems.length ? (
        <nav className={cn('supervisor-bottom-nav md:hidden', isLogistica && 'application-bottom-nav--logistics')} aria-label={isLogistica ? 'Navegación de Logística' : role === 'ADMIN_DIRECTIVO' ? 'Navegación del Administrador' : 'Navegación del Supervisor'}>
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = navigationIsActive(pathname, item.href);
            if (active && item.href === '/inventario') return <InventorySectionMenu key={item.href} placement="bottom-nav" />;
            return <Link key={item.href} href={item.href === '/inventario' ? '/inventario/stock' : item.href}
              aria-current={active ? 'page' : undefined} className={cn('supervisor-bottom-nav__item', active && 'active')}>
              <Icon className="size-5" aria-hidden />{item.label}
            </Link>;
          })}
        </nav>
      ) : null}
      <main
        className={
          isHome
            ? 'main main-home'
            : pathname?.startsWith('/ordenes')
              ? 'main main-ordenes'
              : isLogistica || role === 'SUPERVISOR' || role === 'ADMIN_DIRECTIVO'
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
