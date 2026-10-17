'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Boxes, ClipboardList, Home, PanelLeftClose, PanelLeftOpen,
  Settings, Truck, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import { BrandPlate } from '@/components/BrandPlate';
import { cn } from '@/lib/utils';

type Destination = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  '/inicio': Home, '/ordenes': ClipboardList, '/unidades': Truck,
  '/inventario': Boxes, '/andon': Wrench, '/flota': Truck,
  '/choferes': Users, '/configuracion/usuarios': Users,
};

export function isWorkspaceDestination(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

function SidebarDestination({ item, active, collapsed }: {
  item: Destination; active: boolean; collapsed: boolean;
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
  return (
    <Link
      href={item.href === '/inventario' ? '/inventario/stock' : item.href}
      className={cn('workspace-sidebar__link', active && 'active')}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      aria-describedby={collapsed && position ? id : undefined}
      onFocus={(event) => reveal(event.currentTarget)}
      onBlur={() => setPosition(null)}
      onMouseEnter={(event) => reveal(event.currentTarget)}
      onMouseLeave={(event) => {
        if (document.activeElement !== event.currentTarget) {
          closeTimer.current = setTimeout(() => setPosition(null), 150);
        }
      }}
      onClick={() => setPosition(null)}
      onKeyDown={(event) => { if (event.key === 'Escape') setPosition(null); }}
    >
      <Icon className="size-5 shrink-0" aria-hidden strokeWidth={1.75} />
      <span className="workspace-sidebar__label">{item.label}</span>
      {collapsed && position ? createPortal(
        <span id={id} role="tooltip" className="workspace-sidebar__tooltip" style={position}
          onMouseEnter={keepOpen} onMouseLeave={() => setPosition(null)}>{item.label}</span>,
        document.body,
      ) : null}
    </Link>
  );
}

export function WorkspaceSidebar({ items, pathname, collapsed, onToggle, homeHref }: {
  items: Destination[]; pathname: string | null; collapsed: boolean;
  onToggle: () => void; homeHref: string;
}) {
  const primary = items.filter((item) => ['/inicio', '/ordenes', '/unidades', '/inventario'].includes(item.href));
  const secondary = items.filter((item) => !primary.includes(item));
  function links(destinations: Destination[]): ReactNode {
    return destinations.map((item) => <SidebarDestination key={item.href} item={item}
      active={isWorkspaceDestination(pathname, item.href)} collapsed={collapsed} />);
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
