import { formatDuracion } from './format';
import type { AvisoAndon } from './types';

export const VISTAS_ANDON = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'enterados', label: 'Enterados' },
  { id: 'resueltos', label: 'Resueltos' },
  { id: 'reincidentes', label: 'Reincidentes' },
] as const;

export type VistaAndon = (typeof VISTAS_ANDON)[number]['id'];

export function parseVistaAndon(raw: string | null): VistaAndon {
  if (
    raw === 'enterados' ||
    raw === 'resueltos' ||
    raw === 'reincidentes'
  ) {
    return raw;
  }
  return 'pendientes';
}

export function msEntre(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function fraseDemora(
  from: string | null | undefined,
  to: string | null | undefined,
  mismoDia: 'Resuelto el mismo día' | 'El mismo día' = 'El mismo día',
) {
  const ms = msEntre(from, to);
  if (ms == null || ms < 0) return '—';
  if (ms < 86_400_000) return mismoDia;
  return formatDuracion(ms);
}

export function lineasOvershoot(aviso: Pick<
  AvisoAndon,
  'kmAlAbrir' | 'diasAlAbrir' | 'umbralKm' | 'umbralDias'
>) {
  const lines: string[] = [];
  const dKm = aviso.kmAlAbrir - aviso.umbralKm;
  const dDias = aviso.diasAlAbrir - aviso.umbralDias;
  if (dKm >= 0) {
    lines.push(
      `+${dKm.toLocaleString('es-MX')} km (${aviso.kmAlAbrir.toLocaleString('es-MX')} vs ${aviso.umbralKm.toLocaleString('es-MX')} km)`,
    );
  }
  if (dDias >= 0) {
    lines.push(
      `+${dDias.toLocaleString('es-MX')} días (${aviso.diasAlAbrir.toLocaleString('es-MX')} vs ${aviso.umbralDias.toLocaleString('es-MX')} días)`,
    );
  }
  return lines;
}

export type RankingAndonUnidad = {
  unidadId: string;
  numeroInterno: string;
  avisos: number;
  reincidente: boolean;
};

export function rankingReincidentes(avisos: AvisoAndon[]): RankingAndonUnidad[] {
  const byUnidad = new Map<string, RankingAndonUnidad>();
  for (const aviso of avisos) {
    const current = byUnidad.get(aviso.unidadId);
    if (current) {
      current.avisos += 1;
      current.reincidente = current.avisos >= 2;
      continue;
    }
    byUnidad.set(aviso.unidadId, {
      unidadId: aviso.unidadId,
      numeroInterno: aviso.numeroInterno ?? 'Unidad',
      avisos: 1,
      reincidente: false,
    });
  }
  return [...byUnidad.values()].sort((a, b) => {
    if (a.avisos !== b.avisos) return b.avisos - a.avisos;
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}
