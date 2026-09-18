'use client';

import Link from 'next/link';
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
  { id: 'tecnica', label: 'Información técnica', icon: ClipboardList },
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
}: {
  unidadId: string;
  vista: HubVista;
}) {
  return (
    <nav className="hub-side" aria-label="Acciones de la unidad">
      <p className="hub-side__title">Acciones</p>
      <div className="hub-side__links">
        {VISTAS.map((item) => {
          const href =
            item.id === 'resumen'
              ? `/unidades/${unidadId}`
              : `/unidades/${unidadId}?vista=${item.id}`;
          const active = vista === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
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
