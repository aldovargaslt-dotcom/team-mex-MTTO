'use client';

import Link from 'next/link';

export type HubVista = 'resumen' | 'tecnica' | 'mantenimiento' | 'historial';

const VISTAS: { id: HubVista; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'tecnica', label: 'Información técnica' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'historial', label: 'Historial' },
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
    <nav className="subnav" aria-label="Ficha de la unidad">
      {VISTAS.map((item) => {
        const href =
          item.id === 'resumen'
            ? `/unidades/${unidadId}`
            : `/unidades/${unidadId}?vista=${item.id}`;
        const active = vista === item.id;
        return (
          <Link
            key={item.id}
            href={href}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
