'use client';

import Link from 'next/link';
import { Boxes, ClipboardList, Home, Settings, Truck, Users, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

type NavigationItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };

// Shared catalog: presentation never grants access to a route.
const ITEMS: NavigationItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/ordenes', label: 'Órdenes', icon: ClipboardList, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/logistica', label: 'Inicio', icon: Home, roles: ['LOGISTICA'] },
  { href: '/flota', label: 'Movimientos', icon: Truck, roles: ['LOGISTICA', 'ADMIN_DIRECTIVO'] },
  { href: '/unidades', label: 'Unidades', icon: Truck, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/andon', label: 'Mantenimiento vencido', icon: Wrench, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/inventario', label: 'Inventario', icon: Boxes, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/choferes', label: 'Choferes', icon: Users, roles: ['ADMIN_DIRECTIVO'] },
  { href: '/configuracion/alertas', label: 'Configuración', icon: Settings, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA'] },
  { href: '/mi-trabajo', label: 'Mi trabajo', icon: Wrench, roles: ['MECANICO'] },
  { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN_DIRECTIVO'] },
];

export function applicationNavigation(role: Role | null) {
  return ITEMS.filter((item) => role && item.roles.includes(role));
}
export function applicationBottomNavigation(role: Role | null) {
  const destinations = role === 'SUPERVISOR'
    ? ['/inicio', '/ordenes', '/unidades', '/inventario']
    : role === 'LOGISTICA' ? ['/logistica', '/flota'] : [];
  return applicationNavigation(role).filter((item) => destinations.includes(item.href));
}
export function navigationIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Both the persistent rail and mobile Sheet use this renderer. */
export function ApplicationNavigation({ items, pathname, mobile = false, collapsed = false, onNavigate }: {
  items: ReturnType<typeof applicationNavigation>;
  pathname: string;
  mobile?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className={mobile ? 'shell-menu-nav' : 'app-sidebar__nav'} aria-label="Principal">
      {items.map((item) => {
        const active = navigationIsActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href === '/inventario' ? '/inventario/stock' : item.href}
            className={cn(mobile ? 'shell-menu-link' : 'app-sidebar__link', active && (mobile ? 'active' : 'is-active'))}
            aria-current={active ? 'page' : undefined} aria-label={item.label}
            title={collapsed ? item.label : undefined} onClick={onNavigate}>
            <Icon aria-hidden className="size-4 shrink-0" /><span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
