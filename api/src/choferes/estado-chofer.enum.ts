export enum EstadoChofer {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export const MENSAJE_SIN_CHOFERES_ACTIVOS =
  'No hay choferes activos. Pide alta o reactivación a administración.';

export function puedeAsignarChoferAVisita(estado: EstadoChofer): boolean {
  return estado === EstadoChofer.ACTIVO;
}
