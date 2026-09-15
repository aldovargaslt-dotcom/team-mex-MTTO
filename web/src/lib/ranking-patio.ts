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
      return {
        sitio,
        ciclos: bucket.ciclos.length,
        tiempoFueraMs: bucket.ciclos.reduce((s, c) => s + c.tiempoFueraMs, 0),
        kmCiclo: bucket.ciclos.reduce((s, c) => s + c.kmCiclo, 0),
        unidadTopId: top[0],
        unidadTopInterno: top[1].interno,
      };
    })
    .sort((a, b) => {
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
