'use client';

import type { CSSProperties } from 'react';
import { CircleHelp } from 'lucide-react';
import { getHealthSemantic } from '@/lib/health-semantic';
import type { HealthStatus, UnidadHealth } from '@/lib/types';
import { cn } from '@/lib/utils';

function Ring({
  pct,
  fg,
  size,
}: {
  pct: number;
  fg: string;
  size: number;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <svg
      className="health-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={fg}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const DIM_LABEL: Record<string, string> = {
  maintenance: 'Mantenimiento',
  alerts: 'Alertas',
  inspections: 'Inspecciones',
};

export function UnitHealth({
  health,
  variant = 'standard',
  onOpen,
}: {
  health: UnidadHealth | null;
  variant?: 'compact' | 'standard' | 'detailed' | 'embedded';
  onOpen?: () => void;
}) {
  const showKicker = variant === 'standard';

  if (!health) {
    return <p className="muted">Cargando salud…</p>;
  }

  if (!health.available || health.status == null || health.score == null) {
    const body = (
      <>
        <span className="health-copy">
          {showKicker ? (
            <span className="health-kicker">Salud de la unidad</span>
          ) : null}
          <span className="health-label">{health.label}</span>
          <span className="health-note">
            {health.message ??
              'No hay información suficiente para calcular la salud.'}
          </span>
        </span>
      </>
    );
    if (variant === 'detailed') {
      return <div className="flex flex-col gap-2">{body}</div>;
    }
    return (
      <button
        type="button"
        className={cn('health-display', variant === 'embedded' && 'embedded')}
        onClick={onOpen}
      >
        {body}
      </button>
    );
  }

  const semantic = getHealthSemantic(health.status as HealthStatus);
  const style = { '--health-fg': semantic.fg } as CSSProperties;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className="health-display"
        style={style}
        onClick={onOpen}
      >
        <span className="health-score">{health.score}%</span>
        <span className="health-label">{health.label}</span>
      </button>
    );
  }

  const ring = (
    <Ring
      pct={health.score}
      fg={semantic.fg}
      size={variant === 'detailed' ? 48 : 56}
    />
  );

  const headline = (
    <span className="health-copy">
      {showKicker ? (
        <span className="health-kicker">Salud de la unidad</span>
      ) : null}
      <span className="health-score">{health.score}%</span>
      <span className="health-label">{health.label}</span>
      {variant === 'standard' ? (
        <span className="health-note health-note-help">
          <CircleHelp className="size-3.5" aria-hidden />
          Por qué
        </span>
      ) : health.derivedAlert ? (
        <span className="health-note">Alerta activa</span>
      ) : null}
    </span>
  );

  if (variant === 'detailed') {
    const principal = health.drivers.find((d) => d.type !== 'CAP');
    return (
      <div className="flex flex-col gap-3" style={style}>
        <div className="flex items-center gap-3">
          {ring}
          {headline}
        </div>
        <ul className="flex flex-col gap-2">
          {health.breakdown.map((dim) => (
            <li
              key={dim.id}
              className="flex justify-between gap-3 text-[13px]"
            >
              <span className="font-medium">
                {DIM_LABEL[dim.id] ?? dim.id}
              </span>
              <span className="tabular-nums text-right">
                {dim.availability === 'APPLICABLE' && dim.score != null
                  ? `${Math.round(dim.score)}/100 × ${dim.weight}%`
                  : dim.availability === 'NOT_APPLICABLE'
                    ? `No aplica × ${dim.weight}%`
                    : 'Sin datos'}
              </span>
            </li>
          ))}
        </ul>
        {principal ? (
          <p className="text-[13px]">
            <span className="font-medium">Factor principal: </span>
            {principal.type === 'MAINTENANCE_OVERDUE'
              ? 'Mantenimiento vencido'
              : principal.message}
          </p>
        ) : null}
        {health.cap ? (
          <p className="text-[13px]">
            {health.drivers.find((d) => d.type === 'CAP')?.message ??
              'Health limitado por una condición crítica.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'health-display',
        variant === 'embedded' ? 'embedded' : 'standard',
      )}
      style={style}
      onClick={onOpen}
      aria-label={`Salud de la unidad: ${health.score}% ${health.label}`}
    >
      {ring}
      {headline}
    </button>
  );
}
