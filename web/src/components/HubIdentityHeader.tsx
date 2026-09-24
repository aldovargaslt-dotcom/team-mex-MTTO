'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { UnitHealth } from '@/components/UnitHealth';
import { formatFecha } from '@/lib/format';
import type { UnidadHealth } from '@/lib/types';

export function HubIdentityHeader({
  numeroInterno,
  estado,
  motivoInactivacion,
  marcaModelo,
  anio,
  tipoNombre,
  tipoDescripcion,
  tipoIcono,
  fotoDataUrl,
  placas,
  vin,
  updatedAt,
  health,
  healthState,
  onOpenHealth,
  actions,
}: {
  numeroInterno: string;
  estado: 'ACTIVA' | 'INACTIVA';
  motivoInactivacion?: string | null;
  marcaModelo: string | null;
  anio: number | null;
  tipoNombre: string;
  tipoDescripcion?: string | null;
  tipoIcono?: string | null;
  fotoDataUrl?: string | null;
  placas: string;
  vin: string | null;
  updatedAt?: string | null;
  health: UnidadHealth | null;
  healthState: 'loading' | 'ready' | 'error';
  onOpenHealth: () => void;
  actions: ReactNode;
}) {
  const lineaMarca = marcaModelo
    ? `${marcaModelo}${anio ? ` · ${anio}` : ''}`
    : null;

  return (
    <header className="hub-identity">
      <div className="hub-identity__bar">
        <div className="hub-identity__nav">
          <Link href="/unidades" className="hub-identity__back">
            <ChevronLeft className="size-4" aria-hidden />
            Volver a unidades
          </Link>
          <p className="hub-identity__crumb">
            <Link href="/unidades">Unidades</Link>
            <span aria-hidden> › </span>
            <span>{numeroInterno}</span>
          </p>
        </div>
        {actions ? <div className="hub-identity__actions">{actions}</div> : null}
      </div>

      <div className="hub-identity__body">
        <div className="hub-identity__who">
          <div className="hub-unit-photo" aria-hidden>
            <UnidadMarca
              foto={fotoDataUrl}
              nombre={tipoNombre}
              icono={tipoIcono}
              size="lg"
            />
          </div>
          <div className="min-w-0">
            <h1 className="hub-identity__title">
              {numeroInterno} <StatusBadge estado={estado} />
            </h1>
            {lineaMarca ? <p className="lede">{lineaMarca}</p> : null}
            <p className={lineaMarca ? 'muted mt-0.5' : 'lede'}>
              {tipoNombre}
              {tipoDescripcion ? ` · ${tipoDescripcion}` : ''}
            </p>
            {motivoInactivacion === 'ENVIO_ESPECIAL' ? (
              <p className="muted mt-0.5">Envío especial</p>
            ) : null}
            <dl className="hub-identity__meta">
              <div>
                <dt>Placas</dt>
                <dd>{placas}</dd>
              </div>
              {vin ? (
                <div>
                  <dt>VIN</dt>
                  <dd className="mono">{vin}</dd>
                </div>
              ) : null}
              {updatedAt ? (
                <div>
                  <dt>Última actualización</dt>
                  <dd>{formatFecha(updatedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
        <div className="hub-identity__health">
          {healthState === 'loading' && !health ? (
            <div className="health-display header">
              <span className="health-copy">
                <span className="health-kicker">Salud de la unidad</span>
                <span className="muted">Cargando salud…</span>
              </span>
            </div>
          ) : healthState === 'error' && !health ? (
            <div className="health-display header">
              <span className="health-copy">
                <span className="health-kicker">Salud de la unidad</span>
                <span className="health-label">Health no disponible</span>
              </span>
            </div>
          ) : health ? (
            <UnitHealth
              health={health}
              variant="header"
              onOpen={onOpenHealth}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function HubMasAcciones({ items }: { items: ReactNode }) {
  function cerrar(event: MouseEvent<HTMLElement>) {
    const menu = event.currentTarget.closest('details');
    if (menu) menu.open = false;
  }

  return (
    <details className="unidades-admin-menu hub-more-menu">
      <summary>
        Más acciones
        <ChevronDown className="size-3.5" aria-hidden />
      </summary>
      <div className="unidades-admin-menu__panel" role="menu" onClick={cerrar}>
        {items}
      </div>
    </details>
  );
}
