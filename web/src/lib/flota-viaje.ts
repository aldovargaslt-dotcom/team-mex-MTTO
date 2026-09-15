import {
  etiquetaMovimientoFlota,
  formatDuracion,
  formatFecha,
  formatKm,
} from '@/lib/format';
import type { MovimientoFlota, TableroFlotaRow } from '@/lib/types';

export const FILTROS_TABLERO_FLOTA = [
  'todas',
  'fuera',
  'en_sitio',
  'sin_registro',
  'inactivas',
] as const;

export type FiltroTableroFlota = (typeof FILTROS_TABLERO_FLOTA)[number];

export type ClaseViajeFlota = 'en_ruta' | 'en_sitio' | 'sin_registro';

export type ViajeFlota = {
  clase: ClaseViajeFlota;
  titulo: string;
  detalle: string | null;
};

export type ChoferFilaFlota = {
  principal: string;
  secundario: string | null;
  asignado: boolean;
};

export type CicloFlota =
  | { kind: 'abierto'; id: string; salida: MovimientoFlota }
  | {
      kind: 'cerrado';
      id: string;
      salida: MovimientoFlota;
      entrada: MovimientoFlota;
    }
  | { kind: 'suelto'; id: string; movimiento: MovimientoFlota };

const ETIQUETA_FILTRO: Record<FiltroTableroFlota, string> = {
  todas: 'Todas',
  fuera: 'Aún no regresan',
  en_sitio: 'En sitio',
  sin_registro: 'Sin registro',
  inactivas: 'Inactivas',
};

export function parseFiltroTablero(raw: string | null): FiltroTableroFlota {
  if (
    raw === 'fuera' ||
    raw === 'en_sitio' ||
    raw === 'sin_registro' ||
    raw === 'inactivas'
  ) {
    return raw;
  }
  return 'todas';
}

export function viajeDeFila(row: TableroFlotaRow): ViajeFlota {
  if (row.salidaAbiertaId) {
    return {
      clase: 'en_ruta',
      titulo: `En ruta · ${row.sitioNombre ?? 'sin sitio'}`,
      detalle: fraseSalidaAbierta(row),
    };
  }
  if (row.sitioNombre) {
    return {
      clase: 'en_sitio',
      titulo: row.sitioNombre,
      detalle: row.ultimoMovimientoAt
        ? `Entrada ${formatFecha(row.ultimoMovimientoAt)}`
        : null,
    };
  }
  return {
    clase: 'sin_registro',
    titulo: 'Sin registro de patio',
    detalle: null,
  };
}

function fraseSalidaAbierta(row: TableroFlotaRow): string | null {
  const partes: string[] = [];
  if (row.salidaAbiertaAt) {
    partes.push(`Salió ${formatFecha(row.salidaAbiertaAt)}`);
  }
  if (row.tiempoFueraMs != null) {
    partes.push(formatDuracion(row.tiempoFueraMs));
  }
  return partes.length ? partes.join(' · ') : null;
}

export function choferDeFila(row: TableroFlotaRow): ChoferFilaFlota {
  if (row.choferActualNombre) {
    return {
      principal: row.choferActualNombre,
      secundario: null,
      asignado: true,
    };
  }
  return {
    principal: 'Sin asignar',
    secundario: row.choferUltimoNombre
      ? `Último: ${row.choferUltimoNombre}`
      : null,
    asignado: false,
  };
}

export function etiquetaAdminFlota(row: {
  estado: TableroFlotaRow['estado'];
  motivoInactivacion: TableroFlotaRow['motivoInactivacion'];
}): string | null {
  if (row.estado !== 'INACTIVA') return null;
  return row.motivoInactivacion === 'ENVIO_ESPECIAL'
    ? 'Inactiva · Envío especial'
    : 'Inactiva';
}

export function matchFiltroTablero(
  row: TableroFlotaRow,
  filtro: FiltroTableroFlota,
): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'fuera') return Boolean(row.salidaAbiertaId);
  if (filtro === 'en_sitio') {
    return !row.salidaAbiertaId && Boolean(row.sitioNombre);
  }
  if (filtro === 'sin_registro') {
    return !row.salidaAbiertaId && !row.sitioNombre;
  }
  return row.estado === 'INACTIVA';
}

export function matchBusquedaTablero(row: TableroFlotaRow, q: string): boolean {
  const needle = q.trim().toLocaleLowerCase('es');
  if (!needle) return true;
  const blob = [
    row.numeroInterno,
    row.placas,
    row.choferActualNombre,
    row.choferUltimoNombre,
    row.sitioNombre,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
  return blob.includes(needle);
}

export function cuentaFiltrosTablero(
  rows: TableroFlotaRow[],
): Record<FiltroTableroFlota, number> {
  return {
    todas: rows.length,
    fuera: rows.filter((row) => matchFiltroTablero(row, 'fuera')).length,
    en_sitio: rows.filter((row) => matchFiltroTablero(row, 'en_sitio')).length,
    sin_registro: rows.filter((row) =>
      matchFiltroTablero(row, 'sin_registro'),
    ).length,
    inactivas: rows.filter((row) => matchFiltroTablero(row, 'inactivas'))
      .length,
  };
}

export function opcionesFiltroTablero(rows: TableroFlotaRow[]) {
  const counts = cuentaFiltrosTablero(rows);
  return FILTROS_TABLERO_FLOTA.map((id) => ({
    id,
    label: `${ETIQUETA_FILTRO[id]} (${counts[id]})`,
  }));
}

function grupoOrden(row: TableroFlotaRow): number {
  if (row.salidaAbiertaId) return 0;
  if (row.estado === 'INACTIVA') return 1;
  if (!row.sitioNombre) return 2;
  return 3;
}

export function ordenaTablero(rows: TableroFlotaRow[]): TableroFlotaRow[] {
  return [...rows].sort((a, b) => {
    const ga = grupoOrden(a);
    const gb = grupoOrden(b);
    if (ga !== gb) return ga - gb;
    if (ga === 0) {
      const ta = a.tiempoFueraMs ?? 0;
      const tb = b.tiempoFueraMs ?? 0;
      if (ta !== tb) return tb - ta;
    }
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}

export function filtraTablero(
  rows: TableroFlotaRow[],
  filtro: FiltroTableroFlota,
  q: string,
): TableroFlotaRow[] {
  return ordenaTablero(
    rows.filter(
      (row) => matchFiltroTablero(row, filtro) && matchBusquedaTablero(row, q),
    ),
  );
}

export function emptyTableroFlota(
  filtro: FiltroTableroFlota,
  q: string,
): string {
  if (q.trim()) {
    return 'No hay unidades que coincidan. Ajuste la búsqueda o el filtro.';
  }
  if (filtro === 'fuera') {
    return 'Nadie está fuera. Las salidas abiertas aparecerán aquí.';
  }
  if (filtro === 'en_sitio') {
    return 'Nadie está en un sitio registrado.';
  }
  if (filtro === 'sin_registro') {
    return 'Todas las unidades ya tienen movimiento de patio.';
  }
  if (filtro === 'inactivas') {
    return 'No hay unidades inactivas.';
  }
  return 'No hay unidades.';
}

export function ciclosDeHistorial(movimientos: MovimientoFlota[]): CicloFlota[] {
  const ciclos: CicloFlota[] = [];
  let i = 0;
  while (i < movimientos.length) {
    const actual = movimientos[i];
    if (actual.tipo === 'ENTRADA') {
      const previa = movimientos[i + 1];
      if (previa?.tipo === 'SALIDA') {
        ciclos.push({
          kind: 'cerrado',
          id: actual.id,
          salida: previa,
          entrada: actual,
        });
        i += 2;
        continue;
      }
      ciclos.push({ kind: 'suelto', id: actual.id, movimiento: actual });
      i += 1;
      continue;
    }
    ciclos.push({ kind: 'abierto', id: actual.id, salida: actual });
    i += 1;
  }
  return ciclos;
}

function nombreSitio(mov: MovimientoFlota) {
  return mov.sitioNombre ?? 'sin sitio';
}

function nombreChofer(mov: MovimientoFlota) {
  return mov.choferNombre ?? 'Sin asignar';
}

export function fraseCicloFlota(ciclo: CicloFlota): string {
  if (ciclo.kind === 'abierto') {
    const s = ciclo.salida;
    return `En ruta · ${nombreSitio(s)} · ${nombreChofer(s)} · Salió ${formatFecha(s.occurredAt)}`;
  }
  if (ciclo.kind === 'cerrado') {
    const { salida, entrada } = ciclo;
    return `${nombreSitio(salida)} · ${nombreChofer(salida)} · ${formatFecha(salida.occurredAt)} → ${nombreSitio(entrada)} · ${formatFecha(entrada.occurredAt)}`;
  }
  const m = ciclo.movimiento;
  return `${etiquetaMovimientoFlota(m.tipo)} · ${formatFecha(m.occurredAt)} · ${nombreChofer(m)} · ${nombreSitio(m)}`;
}

export function detalleCicloFlota(ciclo: CicloFlota): string | null {
  if (ciclo.kind === 'cerrado') {
    const partes = [
      `Salida ${formatKm(ciclo.salida.km)}`,
      `Entrada ${formatKm(ciclo.entrada.km)}`,
    ];
    const notas = [ciclo.salida.notas, ciclo.entrada.notas]
      .filter(Boolean)
      .join(' · ');
    if (notas) partes.push(notas);
    return partes.join(' · ');
  }
  const mov = ciclo.kind === 'abierto' ? ciclo.salida : ciclo.movimiento;
  const partes = [formatKm(mov.km)];
  if (mov.notas) partes.push(mov.notas);
  return partes.join(' · ');
}
