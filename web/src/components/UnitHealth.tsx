'use client';

import type { CSSProperties } from 'react';
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
  variant?: 'compact' | 'standard' | 'detailed';
  onOpen?: () => void;
}) {
  if (!health) {
    return <p className="muted">Cargando salud…</p>;
  }

  if (!health.available || health.status == null || health.score == null) {
    const body = (
      <>
        <span className="health-copy">
          {variant === 'standard' ? (
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
      <button type="button" className="health-display" onClick={onOpen}>
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
      size={variant === 'standard' ? 56 : 48}
    />
  );

  const headline = (
    <span className="health-copy">
      {variant === 'standard' ? (
        <span className="health-kicker">Salud de la unidad</span>
      ) : null}
      <span className="health-score">{health.score}%</span>
      <span className="health-label">{health.label}</span>
      {health.derivedAlert ? (
        <span className="health-note">Alerta activa</span>
      ) : null}
    </span>
  );

  if (variant === 'detailed') {
    return (
      <div className="flex flex-col gap-3" style={style}>
        <div className="flex items-center gap-3">
          {ring}
          {headline}
        </div>
        {health.cap ? (
          <p className="text-[13px]">
            Score calculado: {Math.round(health.rawScore ?? health.score)}% ·
            Resultado final: {health.score}%.{' '}
            {health.drivers.find((d) => d.type === 'CAP')?.message}
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {health.breakdown.map((dim) => (
            <li key={dim.id}>
              <div className="flex justify-between text-[13px] font-medium">
                <span>{DIM_LABEL[dim.id] ?? dim.id}</span>
                <span>
                  {dim.availability === 'APPLICABLE' && dim.score != null
                    ? `${Math.round(dim.score)}/100`
                    : dim.availability === 'NOT_APPLICABLE'
                      ? 'No aplica'
                      : 'Sin datos'}
                </span>
              </div>
              <p className="muted text-[12px]">
                Peso: {dim.weight}%
                {dim.contribution != null
                  ? ` · Contribución: ${dim.contribution.toFixed(1)} puntos`
                  : null}
              </p>
            </li>
          ))}
        </ul>
        {health.rawScore != null ? (
          <p className="text-[12px] text-muted-foreground">
            Resultado: {health.rawScore.toFixed(1)} → {health.score}%
          </p>
        ) : null}
        <div>
          <h3 className="subhead">Principales factores</h3>
          <ul className="flex flex-col gap-1 text-[13px]">
            {health.drivers.map((d) => (
              <li key={`${d.type}-${d.message}`}>{d.message}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn('health-display', 'standard')}
      style={style}
      onClick={onOpen}
      aria-label={`Salud de la unidad: ${health.score}% ${health.label}`}
    >
      {ring}
      {headline}
    </button>
  );
}
