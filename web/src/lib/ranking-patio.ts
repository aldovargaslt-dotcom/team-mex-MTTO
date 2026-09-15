import { ciclosDeHistorial } from '@/lib/flota-viaje';
import { formatDuracion } from '@/lib/format';
import type { FlotaUnidadDetalle, TableroFlotaRow } from '@/lib/types';

export const PERIODOS_PATIO = [
  { id: 'HOY', label: 'Hoy' },
  { id: '7D', label: '7 d' },
  { id: '30D', label: '30 d' },
  { id: 'MES', label: 'Este mes' },
] as const;

export type PeriodoPatio = (typeof PERIODOS_PATIO)[number]['id'];

export const VISTAS_PATIO = [
  { id: 'tiempo', label: 'Tiempo fuera' },
  { id: 'sitios', label: 'Sitios' },
] as const;

export type VistaPatio = (typeof VISTAS_PATIO)[number]['id'];

export type CicloCerradoPatio = {
  id: string;
  unidadId: string;
  numeroInterno: string;
  placas: string;
  choferPatio: string;
  sitioDestino: string;
  sitioEntrada: string;
  salidaAt: string;
  entradaAt: string;
  tiempoFueraMs: number;
  kmCiclo: number;
};

export type RankingSitioPatio = {
  sitio: string;
  ciclos: number;
  rebasoCount: number;
  tiempoFueraMs: number;
  kmCiclo: number;
  unidadTopId: string;
  unidadTopInterno: string;
};

export function parsePeriodoPatio(raw: string | null): PeriodoPatio {
  if (raw === 'HOY' || raw === '7D' || raw === 'MES') return raw;
  return '30D';
}

export function parseVistaPatio(raw: string | null): VistaPatio {
  if (raw === 'sitios') return 'sitios';
  return 'tiempo';
}

export function rangoPeriodoPatio(
  id: PeriodoPatio,
  now = new Date(),
): { from: Date; to: Date } {
  const to = now;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (id === 'HOY') return { from: startToday, to };
  if (id === 'MES') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  }
  const from = new Date(startToday);
  from.setDate(from.getDate() - (id === '7D' ? 6 : 29));
  return { from, to };
}

export function inPeriodoPatio(
  iso: string,
  id: PeriodoPatio,
  now = new Date(),
): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const { from, to } = rangoPeriodoPatio(id, now);
  return t >= from.getTime() && t <= to.getTime();
}

export function ciclosCerradosDeDetalle(
  detalle: FlotaUnidadDetalle,
): CicloCerradoPatio[] {
  const { unidad } = detalle;
  return ciclosDeHistorial(detalle.historial).flatMap((ciclo) => {
    if (ciclo.kind !== 'cerrado') return [];
    const tiempoFueraMs = Math.max(
      0,
      new Date(ciclo.entrada.occurredAt).getTime() -
        new Date(ciclo.salida.occurredAt).getTime(),
    );
    return [
      {
        id: ciclo.id,
        unidadId: unidad.id,
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
        choferPatio: ciclo.salida.choferNombre ?? 'Sin asignar',
        sitioDestino: ciclo.salida.sitioNombre ?? 'sin sitio',
        sitioEntrada: ciclo.entrada.sitioNombre ?? 'sin sitio',
        salidaAt: ciclo.salida.occurredAt,
        entradaAt: ciclo.entrada.occurredAt,
        tiempoFueraMs,
        kmCiclo: Math.max(0, ciclo.entrada.km - ciclo.salida.km),
      },
    ];
  });
}

export function ciclosEnPeriodo(
  ciclos: CicloCerradoPatio[],
  periodo: PeriodoPatio,
  now = new Date(),
): CicloCerradoPatio[] {
  return ciclos.filter((ciclo) => inPeriodoPatio(ciclo.entradaAt, periodo, now));
}

export function ordenaCiclosPorTiempo(
  ciclos: CicloCerradoPatio[],
): CicloCerradoPatio[] {
  return [...ciclos].sort((a, b) => {
    if (b.tiempoFueraMs !== a.tiempoFueraMs) {
      return b.tiempoFueraMs - a.tiempoFueraMs;
    }
    if (b.kmCiclo !== a.kmCiclo) return b.kmCiclo - a.kmCiclo;
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}

export function rankingSitiosPatio(
  ciclos: CicloCerradoPatio[],
  umbral: UmbralPatio,
): RankingSitioPatio[] {
  type Bucket = {
    ciclos: CicloCerradoPatio[];
    porUnidad: Map<string, { interno: string; n: number }>;
  };
  const bySitio = new Map<string, Bucket>();
  for (const ciclo of ciclos) {
    const bucket: Bucket = bySitio.get(ciclo.sitioDestino) ?? {
      ciclos: [],
      porUnidad: new Map(),
    };
    bucket.ciclos.push(ciclo);
    const u = bucket.porUnidad.get(ciclo.unidadId) ?? {
      interno: ciclo.numeroInterno,
      n: 0,
    };
    u.n += 1;
    bucket.porUnidad.set(ciclo.unidadId, u);
    bySitio.set(ciclo.sitioDestino, bucket);
  }

  return [...bySitio.entries()]
    .map(([sitio, bucket]) => {
      const top = [...bucket.porUnidad.entries()].sort((a, b) => {
        if (b[1].n !== a[1].n) return b[1].n - a[1].n;
        return a[1].interno.localeCompare(b[1].interno, 'es');
      })[0];
      const rebasoCount = bucket.ciclos.filter((c) =>
        cicloRebasaUmbral(c, umbral),
      ).length;
      return {
        sitio,
        ciclos: bucket.ciclos.length,
        rebasoCount,
        tiempoFueraMs: bucket.ciclos.reduce((s, c) => s + c.tiempoFueraMs, 0),
        kmCiclo: bucket.ciclos.reduce((s, c) => s + c.kmCiclo, 0),
        unidadTopId: top[0],
        unidadTopInterno: top[1].interno,
      };
    })
    .sort((a, b) => {
      if (b.rebasoCount !== a.rebasoCount) {
        return b.rebasoCount - a.rebasoCount;
      }
      if (b.ciclos !== a.ciclos) return b.ciclos - a.ciclos;
      if (b.tiempoFueraMs !== a.tiempoFueraMs) {
        return b.tiempoFueraMs - a.tiempoFueraMs;
      }
      return a.sitio.localeCompare(b.sitio, 'es');
    });
}

export function opcionesPeriodoPatio(
  ciclos: CicloCerradoPatio[],
  now = new Date(),
) {
  return PERIODOS_PATIO.map((periodo) => ({
    id: periodo.id,
    label: `${periodo.label} (${ciclosEnPeriodo(ciclos, periodo.id, now).length})`,
  }));
}

export function opcionesVistaPatio(ciclosPeriodo: CicloCerradoPatio[]) {
  const sitios = new Set(ciclosPeriodo.map((c) => c.sitioDestino)).size;
  return [
    { id: 'tiempo' as const, label: `Tiempo fuera (${ciclosPeriodo.length})` },
    { id: 'sitios' as const, label: `Sitios (${sitios})` },
  ];
}

export function resumenCiclosPatio(ciclos: CicloCerradoPatio[]) {
  const tiempoMs = ciclos.reduce((s, c) => s + c.tiempoFueraMs, 0);
  const km = ciclos.reduce((s, c) => s + c.kmCiclo, 0);
  const n = ciclos.length;
  const cicloTxt = n === 1 ? 'ciclo' : 'ciclos';
  return {
    n,
    tiempoMs,
    km,
    linea: `${n} ${cicloTxt} · ${formatDuracion(tiempoMs)} · ${km.toLocaleString('es-MX')} km`,
  };
}

export function unidadesAunFuera(tablero: TableroFlotaRow[]) {
  return tablero.filter((row) => Boolean(row.salidaAbiertaId)).length;
}

export const UMBRALES_HORAS = [
  { id: '4', label: '4 h', horas: 4 },
  { id: '8', label: '8 h', horas: 8 },
  { id: '12', label: '12 h', horas: 12 },
  { id: '24', label: '24 h', horas: 24 },
  { id: '48', label: '48 h', horas: 48 },
] as const;

export type UmbralHorasId = (typeof UMBRALES_HORAS)[number]['id'];

export const UMBRALES_KM = [
  { id: '50', label: '50 km', km: 50 },
  { id: '100', label: '100 km', km: 100 },
  { id: '200', label: '200 km', km: 200 },
  { id: 'off', label: 'Sin km', km: null },
] as const;

export type UmbralKmId = (typeof UMBRALES_KM)[number]['id'];

export const LECTURAS_PATIO = [
  'todas',
  'rebaso',
  'en_umbral',
] as const;

export type LecturaPatio = (typeof LECTURAS_PATIO)[number];

export type UmbralPatio = {
  horas: number;
  km: number | null;
};

const MS_HORA = 3_600_000;

export function parseUmbralHoras(raw: string | null): UmbralHorasId {
  if (raw === '4' || raw === '12' || raw === '24' || raw === '48') return raw;
  return '8';
}

export function parseUmbralKm(raw: string | null): UmbralKmId {
  if (raw === '100' || raw === '200' || raw === 'off') return raw;
  return '50';
}

export function parseLecturaPatio(raw: string | null): LecturaPatio {
  if (raw === 'rebaso' || raw === 'en_umbral') return raw;
  return 'todas';
}

export function umbralDesdeIds(
  horasId: UmbralHorasId,
  kmId: UmbralKmId,
): UmbralPatio {
  const horas =
    UMBRALES_HORAS.find((item) => item.id === horasId)?.horas ?? 8;
  const foundKm = UMBRALES_KM.find((item) => item.id === kmId);
  return { horas, km: foundKm ? foundKm.km : 50 };
}

export function cicloRebasaUmbral(
  ciclo: Pick<CicloCerradoPatio, 'tiempoFueraMs' | 'kmCiclo'>,
  umbral: UmbralPatio,
): boolean {
  if (ciclo.tiempoFueraMs > umbral.horas * MS_HORA) return true;
  return umbral.km != null && ciclo.kmCiclo > umbral.km;
}

export function motivoRebaso(
  ciclo: Pick<CicloCerradoPatio, 'tiempoFueraMs' | 'kmCiclo'>,
  umbral: UmbralPatio,
): string | null {
  const porTiempo = ciclo.tiempoFueraMs > umbral.horas * MS_HORA;
  const km = umbral.km;
  const porKm = km != null && ciclo.kmCiclo > km;
  if (porTiempo && porKm && km != null) {
    return `Más de ${umbral.horas} h y ${km.toLocaleString('es-MX')} km`;
  }
  if (porTiempo) return `Más de ${umbral.horas} h`;
  if (porKm && km != null) return `Más de ${km.toLocaleString('es-MX')} km`;
  return null;
}

export function fraseUmbralPatio(umbral: UmbralPatio) {
  if (umbral.km == null) return `Rebasó = más de ${umbral.horas} h.`;
  return `Rebasó = más de ${umbral.horas} h o más de ${umbral.km.toLocaleString('es-MX')} km.`;
}

export function filtraLecturaPatio(
  ciclos: CicloCerradoPatio[],
  lectura: LecturaPatio,
  umbral: UmbralPatio,
): CicloCerradoPatio[] {
  if (lectura === 'todas') return ciclos;
  return ciclos.filter((ciclo) => {
    const rebaso = cicloRebasaUmbral(ciclo, umbral);
    return lectura === 'rebaso' ? rebaso : !rebaso;
  });
}

export function filtraSitiosLectura(
  sitios: RankingSitioPatio[],
  lectura: LecturaPatio,
): RankingSitioPatio[] {
  if (lectura === 'todas') return sitios;
  if (lectura === 'rebaso') return sitios.filter((s) => s.rebasoCount > 0);
  return sitios.filter((s) => s.rebasoCount === 0);
}

export function ordenaCiclosPorUmbral(
  ciclos: CicloCerradoPatio[],
  umbral: UmbralPatio,
): CicloCerradoPatio[] {
  return [...ciclos].sort((a, b) => {
    const ra = cicloRebasaUmbral(a, umbral) ? 0 : 1;
    const rb = cicloRebasaUmbral(b, umbral) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    if (b.tiempoFueraMs !== a.tiempoFueraMs) {
      return b.tiempoFueraMs - a.tiempoFueraMs;
    }
    if (b.kmCiclo !== a.kmCiclo) return b.kmCiclo - a.kmCiclo;
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}

export function opcionesLecturaPatio(
  ciclos: CicloCerradoPatio[],
  umbral: UmbralPatio,
) {
  const rebaso = ciclos.filter((c) => cicloRebasaUmbral(c, umbral)).length;
  const enUmbral = ciclos.length - rebaso;
  return [
    { id: 'todas' as const, label: `Todos (${ciclos.length})` },
    { id: 'rebaso' as const, label: `Rebasó (${rebaso})` },
    { id: 'en_umbral' as const, label: `En umbral (${enUmbral})` },
  ];
}

export function emptyLecturaPatio(lectura: LecturaPatio): string {
  if (lectura === 'rebaso') {
    return 'Ningún ciclo rebasó este umbral.';
  }
  if (lectura === 'en_umbral') {
    return 'No hay ciclos dentro del umbral.';
  }
  return 'No hay ciclos cerrados en este periodo.';
}

export function etiquetaAjustePatio(
  periodo: PeriodoPatio,
  horasId: UmbralHorasId,
  kmId: UmbralKmId,
): string {
  const p = PERIODOS_PATIO.find((item) => item.id === periodo)?.label ?? '30 d';
  const h = UMBRALES_HORAS.find((item) => item.id === horasId)?.label ?? '8 h';
  const k = UMBRALES_KM.find((item) => item.id === kmId)?.label ?? '50 km';
  return `Ajustar · ${p} · ${h} · ${k}`;
}
