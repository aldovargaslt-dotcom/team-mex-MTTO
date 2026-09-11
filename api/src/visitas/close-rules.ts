import { EstadoUnidad } from '../common/estado-unidad.enum';
import { EstadoVisita, TipoFirma, TipoVisita } from './enums';

export type CierreInput = {
  estadoVisita: EstadoVisita;
  unidadEstado: EstadoUnidad;
  choferId: string | null;
  km: number | null;
  ultimoKmCerrado: number | null;
  tipo: TipoVisita | null;
  trabajos: number;
  firmas: TipoFirma[];
};

export function mensajeKmInvalido(
  km: number,
  ultimoKmCerrado: number | null,
): string | null {
  if (km < 0) {
    return 'El kilometraje debe ser mayor o igual a 0.';
  }
  if (ultimoKmCerrado != null && km < ultimoKmCerrado) {
    return `El kilometraje no puede ser menor al último km cerrado (${ultimoKmCerrado.toLocaleString('es-MX')} km).`;
  }
  return null;
}

export function erroresCierre(input: CierreInput): string[] {
  const errores: string[] = [];
  if (input.estadoVisita !== EstadoVisita.BORRADOR) {
    errores.push('La visita ya está cerrada y no se puede modificar.');
    return errores;
  }
  if (input.unidadEstado !== EstadoUnidad.ACTIVA) {
    errores.push('No se puede cerrar la visita porque la unidad está inactiva.');
  }
  if (!input.choferId) {
    errores.push('Debe seleccionar un chofer del catálogo.');
  }
  if (input.km == null) {
    errores.push('Indique el kilometraje de la visita.');
  } else {
    const kmError = mensajeKmInvalido(input.km, input.ultimoKmCerrado);
    if (kmError) {
      errores.push(kmError);
    }
  }
  if (!input.tipo) {
    errores.push('Indique el tipo de visita (predictivo o correctivo).');
  }
  if (input.trabajos < 1) {
    errores.push('Seleccione al menos un trabajo para cerrar la visita.');
  }
  const tieneChofer = input.firmas.includes(TipoFirma.CHOFER);
  const tieneJefe = input.firmas.includes(TipoFirma.JEFE);
  if (!tieneChofer || !tieneJefe) {
    errores.push('Se requieren las firmas del chofer y del jefe para cerrar.');
  }
  return errores;
}
