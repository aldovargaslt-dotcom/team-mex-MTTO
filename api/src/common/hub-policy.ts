import { Rol } from '../auth/roles.enum';
import { MENSAJE_SIN_CHOFERES_ACTIVOS } from '../choferes/estado-chofer.enum';
import { EstadoUnidad } from './estado-unidad.enum';
import { MotivoInactivacion } from './motivo-inactivacion.enum';

export function puedeCrearVisita(rol: Rol, estado: EstadoUnidad): boolean {
  return rol === Rol.SUPERVISOR && estado === EstadoUnidad.ACTIVA;
}

export function mensajesHub(
  rol: Rol,
  estado: EstadoUnidad,
  hayChoferesActivos: boolean,
  motivoInactivacion: MotivoInactivacion | null = null,
): string[] {
  if (rol === Rol.ADMIN_DIRECTIVO) {
    return [
      'El administrador directivo no puede crear visitas de mantenimiento.',
    ];
  }
  if (rol === Rol.LOGISTICA) {
    return ['Logística no crea visitas de mantenimiento.'];
  }
  if (estado !== EstadoUnidad.ACTIVA) {
    if (motivoInactivacion === MotivoInactivacion.ENVIO_ESPECIAL) {
      return [
        'No se puede crear una visita porque la unidad está inactiva por envío especial.',
      ];
    }
    return ['No se puede crear una visita porque la unidad está inactiva.'];
  }
  if (!hayChoferesActivos) {
    return [MENSAJE_SIN_CHOFERES_ACTIVOS];
  }
  return ['Puede registrar una nueva visita de mantenimiento.'];
}

export function mensajeVisita(
  rol: Rol,
  estado: EstadoUnidad,
  motivoInactivacion: MotivoInactivacion | null = null,
): string {
  return mensajesHub(rol, estado, true, motivoInactivacion)[0];
}
