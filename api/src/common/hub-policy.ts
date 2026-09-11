import { Rol } from '../auth/roles.enum';
import { MENSAJE_SIN_CHOFERES_ACTIVOS } from '../choferes/estado-chofer.enum';
import { EstadoUnidad } from './estado-unidad.enum';

export function puedeCrearVisita(rol: Rol, estado: EstadoUnidad): boolean {
  return rol === Rol.SUPERVISOR && estado === EstadoUnidad.ACTIVA;
}

export function mensajesHub(
  rol: Rol,
  estado: EstadoUnidad,
  hayChoferesActivos: boolean,
): string[] {
  if (rol === Rol.ADMIN_DIRECTIVO) {
    return [
      'El administrador directivo no puede crear visitas de mantenimiento.',
    ];
  }
  if (estado !== EstadoUnidad.ACTIVA) {
    return ['No se puede crear una visita porque la unidad está inactiva.'];
  }
  if (!hayChoferesActivos) {
    return [MENSAJE_SIN_CHOFERES_ACTIVOS];
  }
  return ['Puede registrar una nueva visita de mantenimiento.'];
}

export function mensajeVisita(rol: Rol, estado: EstadoUnidad): string {
  return mensajesHub(rol, estado, true)[0];
}
