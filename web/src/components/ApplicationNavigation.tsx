'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ANALYSIS_NAV } from '@/lib/maintenance-analysis';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { INVENTORY_OPS, INVENTORY_CATALOG, isInventoryDestination } from '@/lib/inventory-navigation';
import { BarChart3, ChevronDown, Boxes, ClipboardList, Home, Settings, Truck, Users, Wrench, type LucideIcon } from 'lucide-react';
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
  { href: '/analisis-mantenimiento', label: 'Análisis', icon: BarChart3, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO'] },
  { href: '/choferes', label: 'Choferes', icon: Users, roles: ['ADMIN_DIRECTIVO'] },
  { href: '/configuracion/alertas', label: 'Configuración', icon: Settings, roles: ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA'] },
  { href: '/mi-trabajo', label: 'Mi trabajo', icon: Wrench, roles: ['MECANICO'] },
  { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN_DIRECTIVO'] },
];

export function applicationNavigation(role: Role | null) {
  return ITEMS.filter((item) => role && item.roles.includes(role) && (item.href !== '/analisis-mantenimiento' || process.env.NEXT_PUBLIC_MAINTENANCE_ANALYSIS_ENABLED !== 'false'));
}
export function applicationBottomNavigation(role: Role | null) {
  const destinations = (role === 'SUPERVISOR' || role === 'ADMIN_DIRECTIVO')
    ? ['/inicio', '/ordenes', '/unidades', '/inventario']
    : role === 'LOGISTICA' ? ['/logistica', '/flota'] : [];
  return applicationNavigation(role).filter((item) => destinations.includes(item.href));
}
export function navigationIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarDestination({ item, active, collapsed, onOpen, expanded, controls }: {
  item: NavigationItem; active: boolean; collapsed: boolean; onOpen?: () => void; expanded?: boolean; controls?: string;
}) {
  const Icon = item.icon;
  const id = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!collapsed) return;
    const hide = () => setPosition(null);
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('resize', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('keydown', dismiss);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [collapsed]);
  function keepOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function reveal(element: HTMLElement) {
    keepOpen();
    const rect = element.getBoundingClientRect();
    setPosition({ top: Math.max(8, Math.min(rect.top, window.innerHeight - 52)), left: rect.right + 12 });
  }
  const interaction = {
    className: cn('app-sidebar__link', active && 'is-active'),
    'aria-label': collapsed && onOpen ? `${item.label}: mostrar secciones` : item.label,
    'aria-describedby': collapsed && position ? id : undefined,
    onFocus: (event: React.FocusEvent<HTMLElement>) => reveal(event.currentTarget),
    onBlur: () => setPosition(null),
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => reveal(event.currentTarget),
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      if (document.activeElement !== event.currentTarget) closeTimer.current = setTimeout(() => setPosition(null), 150);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') setPosition(null); },
  };
  const content = <>
    <Icon className="size-4 shrink-0" aria-hidden strokeWidth={1.75} />
    <span className="app-sidebar__label">{item.label}</span>
    {onOpen && !collapsed ? <ChevronDown aria-hidden className={cn('app-sidebar__chevron size-4', expanded && 'is-open')} /> : null}
    {collapsed && position ? createPortal(
      <span id={id} role="tooltip" className="app-sidebar__tooltip" style={position}
        onMouseEnter={keepOpen} onMouseLeave={() => setPosition(null)}>{item.label}</span>, document.body,
    ) : null}
  </>;
  return onOpen ? <button {...interaction} aria-current={active ? 'location' : undefined} type="button" aria-expanded={expanded} aria-controls={controls}
    onClick={() => { setPosition(null); onOpen(); }}>{content}</button>
    : <Link {...interaction} href={item.href} aria-current={active ? 'page' : undefined}
      onClick={() => setPosition(null)}>{content}</Link>;

}

/** Shared main catalog; inventory destinations retain their existing owner catalog. */
export function ApplicationNavigation({ items, pathname, mobile = false, collapsed = false, onNavigate, onExpand }: {
  items: ReturnType<typeof applicationNavigation>;
  pathname: string;
  mobile?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
}) {
  const router = useRouter();
  const analysisId = useId();
  const [analysisOverride, setAnalysisOverride] = useState<{pathname:string;open:boolean}|null>(null);
  const analysisActive = navigationIsActive(pathname, '/analisis-mantenimiento');
  const analysisOpen = !collapsed && (analysisOverride?.pathname === pathname ? analysisOverride.open : analysisActive);
  const inventoryId = useId();
  const [override, setOverride] = useState<{pathname:string;open:boolean}|null>(null);
  const inventoryActive = navigationIsActive(pathname, '/inventario');
  const inventoryOpen = !collapsed && (override?.pathname === pathname ? override.open : inventoryActive);
  return <nav className={mobile ? 'shell-menu-nav' : 'app-sidebar__nav'} aria-label="Principal">
    {items.map((item) => {
      const active = navigationIsActive(pathname, item.href);
      const Icon = item.icon;
      if (!mobile && item.href === '/analisis-mantenimiento') return <div key={item.href} className="app-sidebar__module">
        <SidebarDestination item={item} active={active} collapsed={collapsed} expanded={analysisOpen} controls={analysisId}
          onOpen={() => { if (collapsed) onExpand?.(); setAnalysisOverride({ pathname, open: collapsed || !analysisOpen }); }} />
        <div id={analysisId} hidden={!analysisOpen} className="app-sidebar__subnav">
          {ANALYSIS_NAV.map(link => <Link key={link.href} href={link.href} className={cn('app-sidebar__sublink', pathname === link.href && 'is-active')}
            aria-current={pathname === link.href ? 'page' : undefined} onClick={(event) => {
              if (analysisActive && window.location.search && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault(); router.push(`${link.href}${window.location.search}`);
              }
            }}>{link.label}</Link>)}
        </div>
      </div>;
      if (!mobile && item.href === '/inventario') return <div key={item.href} className="app-sidebar__module">
        <SidebarDestination item={item} active={active} collapsed={collapsed} expanded={inventoryOpen} controls={inventoryId}
          onOpen={() => {if (collapsed) onExpand?.();setOverride({pathname,open:collapsed || !inventoryOpen});}} />
        <div id={inventoryId} hidden={!inventoryOpen} className="app-sidebar__subnav">
          {[{label:'Operación',links:INVENTORY_OPS},{label:'Catálogo',links:INVENTORY_CATALOG}].map(group=><div key={group.label}>
            <p className="app-sidebar__subheading">{group.label}</p>
            {group.links.map(link=><Link key={link.href} href={link.href} className={cn('app-sidebar__sublink',isInventoryDestination(pathname,link.href,link.exact) && 'is-active')}
              aria-current={isInventoryDestination(pathname,link.href,link.exact)?'page':undefined}>{link.label}</Link>)}
          </div>)}
        </div>
      </div>;
      if (!mobile) return <SidebarDestination key={item.href} item={item} active={active} collapsed={collapsed} />;
      return <Link key={item.href} href={item.href === '/inventario' ? '/inventario/stock' : item.href}
        className={cn('shell-menu-link',active && 'active')} aria-current={active?'page':undefined} aria-label={item.label} onClick={onNavigate}>
        <Icon aria-hidden className="size-4 shrink-0" /><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
