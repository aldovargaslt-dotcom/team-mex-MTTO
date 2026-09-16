import type { AvisoAndon, Unidad } from './types';

export type UnidadesSort = 'interno-asc' | 'interno-desc' | 'placas-asc';

export type UnidadesVista = 'tabla' | 'tarjetas';

export type TipoGlyph = 'truck' | 'car' | 'bus' | 'van';

export const UNIDADES_PAGE_SIZE = 5;

export function glyphTipo(nombre: string): TipoGlyph {
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

export function kpisFlota(flota: Unidad[], avisos: AvisoAndon[]) {
  const total = flota.length;
  const activas = flota.filter((u) => u.estado === 'ACTIVA').length;
  const inactivas = flota.filter((u) => u.estado === 'INACTIVA').length;
  const conAviso = new Set(avisos.map((a) => a.unidadId)).size;
  return { total, activas, inactivas, conAviso };
}

export function avisoDeUnidad(
  avisos: AvisoAndon[],
  unidadId: string,
): AvisoAndon | undefined {
  return avisos.find((a) => a.unidadId === unidadId);
}
