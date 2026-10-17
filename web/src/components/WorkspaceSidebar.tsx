'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Boxes, ClipboardList, Home, PanelLeftClose, PanelLeftOpen,
  Settings, Truck, Users, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { BrandPlate } from '@/components/BrandPlate';
import { cn } from '@/lib/utils';
import { INVENTORY_OPS, INVENTORY_CATALOG, isInventoryDestination } from '@/lib/inventory-navigation';

type Destination = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  '/inicio': Home, '/ordenes': ClipboardList, '/unidades': Truck,
  '/inventario': Boxes, '/flota': Truck,
  '/choferes': Users, '/configuracion/usuarios': Users,
};

export function isWorkspaceDestination(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

function SidebarDestination({ item, active, collapsed, onOpen, expanded, controls }: {
  item: Destination; active: boolean; collapsed: boolean; onOpen?: () => void; expanded?: boolean; controls?: string;
}) {
  const Icon = ICONS[item.href] ?? Settings;
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
    className: cn('workspace-sidebar__link', active && 'active'),
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
    <Icon className="size-5 shrink-0" aria-hidden strokeWidth={1.75} />
    <span className="workspace-sidebar__label">{item.label}</span>
    {onOpen && !collapsed ? <ChevronDown aria-hidden className={cn('workspace-sidebar__chevron size-4', expanded && 'is-open')} /> : null}
    {collapsed && position ? createPortal(
      <span id={id} role="tooltip" className="workspace-sidebar__tooltip" style={position}
        onMouseEnter={keepOpen} onMouseLeave={() => setPosition(null)}>{item.label}</span>, document.body,
    ) : null}
  </>;
  return onOpen ? <button {...interaction} type="button" aria-expanded={expanded} aria-controls={controls}
    onClick={() => { setPosition(null); onOpen(); }}>{content}</button>
    : <Link {...interaction} href={item.href} aria-current={active ? 'page' : undefined}
      onClick={() => setPosition(null)}>{content}</Link>;

}

export function WorkspaceSidebar({ items, pathname, collapsed, onToggle, homeHref }: {
  items: Destination[]; pathname: string | null; collapsed: boolean;
  onToggle: () => void; homeHref: string;
}) {
  const [moduleOverride, setModuleOverride] = useState<{ pathname: string | null; open: boolean } | null>(null);
  const inventoryActive = isWorkspaceDestination(pathname, '/inventario');
  const inventoryOpen = !collapsed && (moduleOverride?.pathname === pathname ? moduleOverride.open : inventoryActive);
  const inventoryId = useId();
  const primary = items.filter((item) => ['/inicio', '/ordenes', '/unidades', '/inventario'].includes(item.href));
  const secondary = items.filter((item) => !primary.includes(item));
  function links(destinations: Destination[]): ReactNode {
    return destinations.map((item) => item.href === '/inventario' ? (
      <div key={item.href} className="workspace-sidebar__module">
        <SidebarDestination item={item} active={inventoryActive} collapsed={collapsed}
          expanded={inventoryOpen} controls={inventoryId} onOpen={() => {
            if (collapsed) onToggle();
            setModuleOverride({ pathname, open: collapsed || !inventoryOpen });
          }} />
        <div id={inventoryId} hidden={!inventoryOpen} className="workspace-sidebar__subnav">
          {INVENTORY_OPS.map(inventoryLink)}
          <p className="workspace-sidebar__subheading">Catálogo</p>
          <div className="workspace-sidebar__catalog">{INVENTORY_CATALOG.map(inventoryLink)}</div>
        </div>
      </div>
    ) : <SidebarDestination key={item.href} item={item}
      active={isWorkspaceDestination(pathname, item.href)} collapsed={collapsed} />);
  }
  function inventoryLink(link: (typeof INVENTORY_OPS)[number]) {
    const active = isInventoryDestination(pathname, link.href, link.exact);
    return <Link key={link.href} href={link.href} className={cn('workspace-sidebar__sublink', active && 'active')}
      aria-current={active ? 'page' : undefined}>{link.label}</Link>;

  }
  return (
    <aside className="workspace-sidebar" aria-label="Área de trabajo">
      <Link href={homeHref} className="workspace-sidebar__brand" aria-label="Team Mex — Inicio">
        <BrandPlate />
        <span className="workspace-sidebar__label">Mantenimiento</span>
      </Link>
      <nav id="workspace-navigation" className="workspace-sidebar__nav" aria-label="Principal">
        <div className="workspace-sidebar__group">{links(primary)}</div>
        {secondary.length ? <div className="workspace-sidebar__group workspace-sidebar__group--secondary">{links(secondary)}</div> : null}
      </nav>
      <button type="button" className="workspace-sidebar__toggle" onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú' : 'Plegar menú'} aria-expanded={!collapsed}
        aria-controls="workspace-navigation" title={collapsed ? 'Expandir menú' : 'Plegar menú'}>
        {collapsed ? <PanelLeftOpen className="size-5 shrink-0" aria-hidden /> : <PanelLeftClose className="size-5 shrink-0" aria-hidden />}
        <span className="workspace-sidebar__label">Plegar menú</span>
      </button>
    </aside>
  );
}
