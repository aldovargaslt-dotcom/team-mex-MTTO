import type { AvisoAndon, UmbralAndon, Unidad, VisitaResumen } from './types';

export const PERIODOS_RANKING = [
  { id: '7D', label: '7 d' },
  { id: '30D', label: '30 d' },
  { id: '90D', label: '90 d' },
] as const;

export type PeriodoRanking = (typeof PERIODOS_RANKING)[number]['id'];

export type RankingUnidad = {
  ultimoCierreAt: string | null;
  ultimoKm: number | null;
  diasDesdeCierre: number | null;
  tKm: number;
  tDias: number;
  rebaso: boolean;
  correctivosPeriodo: number;
  avisosPeriodo: number;
};

export function parsePeriodoRanking(raw: string | null): PeriodoRanking {
  if (raw === '7D' || raw === '90D') return raw;
  return '30D';
}

function ymdUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(base: Date, days: number) {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  );
}

export function datesForPeriodoRanking(
  id: PeriodoRanking,
  now = new Date(),
): { from: string; to: string } {
  const to = ymdUtc(now);
  if (id === '7D') return { from: ymdUtc(addUtcDays(now, -6)), to };
  if (id === '90D') return { from: ymdUtc(addUtcDays(now, -89)), to };
  return { from: ymdUtc(addUtcDays(now, -29)), to };
}

function startOfUtcDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`).getTime();
}

function endOfUtcDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999Z`).getTime();
}

export function inPeriodoIso(
  iso: string | null | undefined,
  from: string,
  to: string,
) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= startOfUtcDay(from) && t <= endOfUtcDay(to);
}

export function diasDesdeCierre(cerradoAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(cerradoAt).getTime()) / 86_400_000));
}

export function rankingDeUnidad(
  unidad: Unidad,
  visitas: VisitaResumen[],
  avisos: AvisoAndon[],
  umbral: UmbralAndon | undefined,
  from: string,
  to: string,
  now = Date.now(),
): RankingUnidad {
  const tKm = umbral?.tKm ?? 10000;
  const tDias = umbral?.tDias ?? 90;
  const cerradas = visitas
    .filter((v) => v.estado === 'CERRADO' && v.cerradoAt)
    .sort(
      (a, b) =>
        new Date(b.cerradoAt as string).getTime() -
        new Date(a.cerradoAt as string).getTime(),
    );
  const ultimo = cerradas[0];
  const ultimoCierreAt = ultimo?.cerradoAt ?? null;
  const ultimoKm = ultimo?.km ?? null;
  const dias = ultimoCierreAt ? diasDesdeCierre(ultimoCierreAt, now) : null;
  const avisosUnidad = avisos.filter((a) => a.unidadId === unidad.id);
  const avisoAbierto = avisosUnidad.find(
    (a) => a.estado === 'ABIERTO' || a.estado === 'ENTERADO',
  );
  const rebasoDias = dias != null && dias >= tDias;
  const rebasoAndon = Boolean(
    avisoAbierto &&
      (avisoAbierto.kmAlAbrir >= avisoAbierto.umbralKm ||
        avisoAbierto.diasAlAbrir >= avisoAbierto.umbralDias),
  );
  return {
    ultimoCierreAt,
    ultimoKm,
    diasDesdeCierre: dias,
    tKm,
    tDias,
    rebaso: rebasoDias || rebasoAndon,
    correctivosPeriodo: cerradas.filter(
      (v) => v.tipo === 'CORRECTIVO' && inPeriodoIso(v.cerradoAt, from, to),
    ).length,
    avisosPeriodo: avisosUnidad.filter((a) =>
      inPeriodoIso(a.abiertaAt, from, to),
    ).length,
  };
}

export function ordenaRanking(
  unidades: Unidad[],
  rankingById: Record<string, RankingUnidad>,
) {
  return [...unidades].sort((a, b) => {
    const ra = rankingById[a.id];
    const rb = rankingById[b.id];
    const aRebaso = ra?.rebaso ? 0 : 1;
    const bRebaso = rb?.rebaso ? 0 : 1;
    if (aRebaso !== bRebaso) return aRebaso - bRebaso;
    const da = ra?.diasDesdeCierre ?? -1;
    const db = rb?.diasDesdeCierre ?? -1;
    if (da !== db) return db - da;
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}

export function lineaSaludTipo(
  unidades: Unidad[],
  rankingById: Record<string, RankingUnidad>,
  tDias: number,
) {
  const conCierre = unidades
    .map((u) => rankingById[u.id])
    .filter((r): r is RankingUnidad => Boolean(r?.ultimoCierreAt));
  if (conCierre.length === 0) {
    return 'Aún no hay cierres para comparar con el intervalo.';
  }
  const rebasaron = conCierre.filter((r) => r.rebaso).length;
  const cadencia = Math.round(
    conCierre.reduce((sum, r) => sum + (r.diasDesdeCierre ?? 0), 0) /
      conCierre.length,
  );
  const vs = `cadencia ${cadencia.toLocaleString('es-MX')} d vs cada ${tDias.toLocaleString('es-MX')} d`;
  if (rebasaron === 0) {
    return `Ninguna unidad rebasó el intervalo (${vs}).`;
  }
  const de = `${rebasaron} de ${conCierre.length}`;
  const verbo = rebasaron === 1 ? 'rebasó' : 'rebasaron';
  return `${de} con cierre ${verbo} el intervalo (${vs}).`;
}
