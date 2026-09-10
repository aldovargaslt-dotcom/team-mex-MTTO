import { Rol } from '../auth/roles.enum';
import { EstadoUnidad } from './estado-unidad.enum';

export function puedeCrearVisita(rol: Rol, estado: EstadoUnidad): boolean {
  return rol === Rol.SUPERVISOR && estado === EstadoUnidad.ACTIVA;
}

export function mensajeVisita(rol: Rol, estado: EstadoUnidad): string {
  if (rol === Rol.ADMIN_DIRECTIVO) {
    return 'El administrador directivo no puede crear visitas de mantenimiento.';
  }
  if (estado !== EstadoUnidad.ACTIVA) {
    return 'No se puede crear una visita porque la unidad está inactiva.';
  }
  return 'Puede registrar una nueva visita de mantenimiento.';
}
