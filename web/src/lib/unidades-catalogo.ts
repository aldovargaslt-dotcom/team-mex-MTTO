import type { AvisoAndon, IconoTipoVehiculo, Unidad } from './types';

export type SituacionAtencion =
  | 'requiere_inspeccion'
  | 'enterado'
  | 'sin_aviso';

export type UnidadesSort = 'interno-asc' | 'interno-desc' | 'placas-asc';

export type UnidadesVista = 'tabla' | 'tarjetas';

export type TipoGlyph = IconoTipoVehiculo;

export const ICONOS_TIPO: {
  id: TipoGlyph;
  label: string;
}[] = [
  { id: 'truck', label: 'Carga' },
  { id: 'car', label: 'Ligera' },
  { id: 'van', label: 'Van' },
  { id: 'bus', label: 'Pasajeros' },
];

export const UNIDADES_PAGE_SIZE = 5;

export function isTipoGlyph(value: string | null | undefined): value is TipoGlyph {
  return ICONOS_TIPO.some((item) => item.id === value);
}

export function inferGlyphTipo(nombre: string): TipoGlyph {
  const n = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (n.includes('camioneta') || n.includes('pickup')) return 'car';
  if (n.includes('van') || n.includes('sprinter')) return 'van';
  if (n.includes('pasaj') || n.includes('autobus') || n.includes('bus')) {
    return 'bus';
  }
  return 'truck';
}

export function glyphTipo(
  nombre: string,
  icono?: string | null,
): TipoGlyph {
  if (isTipoGlyph(icono)) return icono;
  return inferGlyphTipo(nombre);
}

export function pctDelTotal(parte: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

export function ordenarUnidades(list: Unidad[], sort: UnidadesSort): Unidad[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sort === 'placas-asc') {
      return a.placas.localeCompare(b.placas, 'es', { numeric: true });
    }
    const cmp = a.numeroInterno.localeCompare(b.numeroInterno, 'es', {
      numeric: true,
    });
    return sort === 'interno-desc' ? -cmp : cmp;
  });
  return copy;
}

export function avisosPendientes(avisos: AvisoAndon[]) {
  return avisos.filter((aviso) => aviso.estado !== 'RESUELTO');
}

export function kpisFlota(flota: Unidad[], avisos: AvisoAndon[]) {
  const total = flota.length;
  const activas = flota.filter((u) => u.estado === 'ACTIVA').length;
  const inactivas = flota.filter((u) => u.estado === 'INACTIVA').length;
  const conAviso = new Set(
    avisosPendientes(avisos).map((aviso) => aviso.unidadId),
  ).size;
  return { total, activas, inactivas, conAviso };
}

export function avisoDeUnidad(
  avisos: AvisoAndon[],
  unidadId: string,
): AvisoAndon | undefined {
  return avisosPendientes(avisos).find((aviso) => aviso.unidadId === unidadId);
}

export function situacionAtencion(
  aviso: AvisoAndon | undefined,
): SituacionAtencion {
  if (!aviso) return 'sin_aviso';
  if (aviso.estado === 'ENTERADO') return 'enterado';
  return 'requiere_inspeccion';
}

export function etiquetaSituacionAtencion(situacion: SituacionAtencion) {
  if (situacion === 'requiere_inspeccion') return 'Requiere inspección';
  if (situacion === 'enterado') return 'Requiere inspección';
  return 'Sin alerta';
}

/** Filtros (N) en el sheet móvil: solo Estado. Tabs, búsqueda y KPI Andon se ven fuera. */
export function cuentaFiltrosOcultos(estadoFiltro: string): number {
  return estadoFiltro ? 1 : 0;
}

export function unidadesConAtencion(
  unidades: Unidad[],
  avisos: AvisoAndon[],
): Unidad[] {
  return unidades.filter((unidad) => Boolean(avisoDeUnidad(avisos, unidad.id)));
}
