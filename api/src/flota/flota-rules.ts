import { TipoFirmaFlota, TipoMovimientoFlota } from './enums';
import { RegistrarMovimientoInput, Sitio, UnidadOperativa } from './flota-types';

export type MovimientoReglasInput = {
  input: RegistrarMovimientoInput;
  nowIso: string;
  sitio: Sitio | null;
  choferActivo: boolean | null;
  unidadExiste: boolean;
  operativa: UnidadOperativa | null;
  salidaAbierta: { occurredAt: string; km: number } | null;
  choferYaTieneSalida: boolean;
};

export function erroresMovimiento(ctx: MovimientoReglasInput): string[] {
  const errores: string[] = [];
  const { input } = ctx;

  if (!ctx.unidadExiste) {
    errores.push('No se encontró la unidad.');
    return errores;
  }
  if (ctx.choferActivo == null) {
    errores.push('No se encontró el chofer.');
    return errores;
  }
  if (!ctx.choferActivo) {
    errores.push('El chofer no está activo. Seleccione un chofer activo.');
  }
  if (!ctx.sitio) {
    errores.push('No se encontró el sitio.');
    return errores;
  }
  if (ctx.sitio.estado !== 'ACTIVO') {
    errores.push('El sitio no está activo. Seleccione un sitio activo.');
  }

  const occurred = Date.parse(input.occurredAt);
  if (Number.isNaN(occurred)) {
    errores.push('La fecha y hora del movimiento no es válida.');
  } else if (occurred > Date.parse(ctx.nowIso)) {
    errores.push('La fecha y hora del movimiento no puede ser futura.');
  }

  if (input.km == null || Number.isNaN(input.km) || input.km < 0) {
    errores.push('Indique el kilometraje (0 o más).');
  }

  const tiposFirma = new Set(input.firmas.map((f) => f.tipo));
  const firmaChofer = input.firmas.find((f) => f.tipo === TipoFirmaFlota.CHOFER);
  const firmaAval = input.firmas.find((f) => f.tipo === TipoFirmaFlota.AVAL);
  if (
    !firmaChofer?.dataUrl ||
    !firmaAval?.dataUrl ||
    tiposFirma.size !== 2 ||
    input.firmas.length !== 2
  ) {
    errores.push(
      'Se requieren las firmas del chofer y del aval para registrar el movimiento.',
    );
  }

  if (input.tipo === TipoMovimientoFlota.SALIDA) {
    if (ctx.operativa?.salidaAbiertaId) {
      errores.push('La unidad ya tiene una salida abierta. Registre la entrada.');
    }
    if (ctx.choferYaTieneSalida) {
      errores.push(
        'Ese chofer ya tiene una unidad en ruta. Cierre esa salida antes.',
      );
    }
  }

  if (input.tipo === TipoMovimientoFlota.ENTRADA) {
    if (!ctx.salidaAbierta || !ctx.operativa?.salidaAbiertaId) {
      errores.push('No hay una salida abierta para esta unidad.');
    } else {
      if (
        !Number.isNaN(occurred) &&
        occurred < Date.parse(ctx.salidaAbierta.occurredAt)
      ) {
        errores.push(
          'La entrada no puede ser anterior a la hora de la salida abierta.',
        );
      }
      if (
        input.km != null &&
        !Number.isNaN(input.km) &&
        input.km < ctx.salidaAbierta.km
      ) {
        errores.push(
          `El kilometraje de entrada no puede ser menor al de la salida (${ctx.salidaAbierta.km.toLocaleString('es-MX')} km).`,
        );
      }
    }
  }

  return errores;
}

export function avisosSuaves(opts: {
  tipo: TipoMovimientoFlota;
  andonAbierto: boolean;
  km: number;
  ultimoKmVisita: number | null;
}): string[] {
  const avisos: string[] = [];
  if (opts.tipo === TipoMovimientoFlota.SALIDA && opts.andonAbierto) {
    avisos.push(
      'La unidad tiene mantenimiento vencido (alerta abierta). El registro no se bloquea.',
    );
  }
  if (opts.ultimoKmVisita != null && opts.km < opts.ultimoKmVisita) {
    avisos.push(
      `El km es menor que el último km de visita cerrada (${opts.ultimoKmVisita.toLocaleString('es-MX')} km).`,
    );
  }
  return avisos;
}
