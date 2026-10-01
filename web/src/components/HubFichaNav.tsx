'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  ClipboardList,
  History,
  LayoutDashboard,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type HubVista = 'resumen' | 'tecnica' | 'mantenimiento' | 'historial';

const VISTAS: { id: HubVista; label: string; icon: LucideIcon }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'tecnica', label: 'Datos de unidad', icon: ClipboardList },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { id: 'historial', label: 'Historial', icon: History },
];

export function parseHubVista(value: string | null): HubVista {
  if (value === 'tecnica' || value === 'mantenimiento' || value === 'historial') {
    return value;
  }
  return 'resumen';
}

export function HubFichaNav({
  unidadId,
  vista,
  returnTo,
}: {
  unidadId: string;
  vista: HubVista;
  returnTo?: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [vista]);
  return (
    <nav className="hub-side" aria-label="Secciones de la unidad">
      <p className="hub-side__title">Secciones</p>
      <div className="hub-side__links">
        {VISTAS.map((item) => {
          const query = new URLSearchParams();
          if (item.id !== 'resumen') query.set('vista', item.id);
          if (returnTo) query.set('returnTo', returnTo);
          const qs = query.toString();
          const href = `/unidades/${unidadId}${qs ? `?${qs}` : ''}`;
          const active = vista === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              ref={active ? activeRef : undefined}
              href={href}
              className={cn('hub-side__link', active && 'is-active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
