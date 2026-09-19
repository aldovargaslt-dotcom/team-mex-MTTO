import { EstadoChofer } from '../choferes/estado-chofer.enum';
import {
  ChipLogistica,
  ChipLogisticaUnidad,
  LogisticaChoferRow,
  LogisticaUnidadRow,
  OpsChofer,
} from './logistica-types';

export const MSG_CHOFER_INACTIVO =
  'El chofer no está activo. Seleccione un chofer activo.';
export const MSG_UNIDAD_OCUPADA =
  'La unidad ya tiene chofer asignado. Quite la asignación primero.';
export const MSG_CHOFER_OCUPADO =
  'El chofer ya está asignado a otra unidad.';
export const MSG_INACTIVAR_ASIGNADO =
  'No se puede pasar a INACTIVO: el chofer tiene una unidad asignada. Quite la asignación en Logística primero.';
export const MSG_REGRESO_NO_EN_RUTA =
  'La unidad no está en ruta. No hay regreso que registrar.';

export function opsDeAsignacion(
  unidadId?: string | null,
): OpsChofer {
  return unidadId ? 'EN_RUTA' : 'DISPONIBLE';
}

export function errorAssign(input: {
  choferEstado: EstadoChofer | null;
  unidadExiste: boolean;
  unidadChoferId: string | null;
  choferUnidadId: string | null;
  choferId: string;
}): string | null {
  if (input.choferEstado == null) {
    return null;
  }
  if (input.choferEstado !== EstadoChofer.ACTIVO) {
    return MSG_CHOFER_INACTIVO;
  }
  if (!input.unidadExiste) {
    return null;
  }
  if (
    input.unidadChoferId &&
    input.unidadChoferId !== input.choferId
  ) {
    return MSG_UNIDAD_OCUPADA;
  }
  if (
    input.choferUnidadId &&
    input.unidadChoferId !== input.choferId
  ) {
    return MSG_CHOFER_OCUPADO;
  }
  return null;
}

export function errorInactivarSiAsignado(
  assignedUnidadId: string | null,
): string | null {
  return assignedUnidadId ? MSG_INACTIVAR_ASIGNADO : null;
}

export function filaChofer(input: {
  choferId: string;
  nombre: string;
  unidadId?: string | null;
  placas?: string | null;
}): LogisticaChoferRow {
  const unidadId = input.unidadId ?? undefined;
  const placas = input.placas ?? undefined;
  const row: LogisticaChoferRow = {
    choferId: input.choferId,
    nombre: input.nombre,
    ops: opsDeAsignacion(unidadId),
  };
  if (unidadId) {
    row.unidadId = unidadId;
    if (placas) row.placas = placas;
  }
  return row;
}

export function filtrarFilas(
  rows: LogisticaChoferRow[],
  q?: string,
  chip?: ChipLogistica,
): LogisticaChoferRow[] {
  const needle = q?.trim().toLowerCase() ?? '';
  const filtro = chip && chip !== 'TODOS' ? chip : undefined;
  return rows.filter((row) => {
    if (filtro && row.ops !== filtro) return false;
    if (needle && !row.nombre.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function kpisActivos(rows: LogisticaChoferRow[]) {
  const enRuta = rows.filter((r) => r.ops === 'EN_RUTA').length;
  return {
    enRuta,
    disponibles: rows.length - enRuta,
    total: rows.length,
  };
}

export function alertaSinRegreso(
  opsEstado: 'EN_RUTA' | 'DISPONIBLE',
): 'SIN_REGRESO' | null {
  return opsEstado === 'EN_RUTA' ? 'SIN_REGRESO' : null;
}

export function errorRegreso(
  opsEstado: 'EN_RUTA' | 'DISPONIBLE' | null,
): string | null {
  if (opsEstado !== 'EN_RUTA') return MSG_REGRESO_NO_EN_RUTA;
  return null;
}

export function filtrarUnidadesOps(
  rows: LogisticaUnidadRow[],
  q?: string,
  chip?: ChipLogisticaUnidad,
): LogisticaUnidadRow[] {
  const needle = q?.trim().toLowerCase() ?? '';
  const filtro = chip && chip !== 'TODAS' ? chip : undefined;
  return rows.filter((row) => {
    if (filtro && row.opsEstado !== filtro) return false;
    if (!needle) return true;
    return (
      row.placas.toLowerCase().includes(needle) ||
      row.numeroInterno.toLowerCase().includes(needle)
    );
  });
}

export function kpisUnidadesOps(rows: LogisticaUnidadRow[]) {
  const enRuta = rows.filter((r) => r.opsEstado === 'EN_RUTA').length;
  return {
    enRuta,
    disponibles: rows.length - enRuta,
    total: rows.length,
  };
}
