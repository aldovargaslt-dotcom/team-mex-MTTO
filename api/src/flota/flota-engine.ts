import { randomUUID } from 'crypto';
import { avisosSuaves, erroresMovimiento } from './flota-rules';
import { FlotaStore } from './flota-store';
import {
  CatalogoChofer,
  CatalogoUnidad,
  MovimientoFlota,
  RegistrarMovimientoInput,
  UnidadOperativa,
} from './flota-types';
import { TipoMovimientoFlota } from './enums';

export class FlotaDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlotaDomainError';
  }
}

export class FlotaEngine {
  constructor(private readonly store: FlotaStore) {}

  async registrar(
    input: RegistrarMovimientoInput,
    ctx: {
      nowIso: string;
      unidad: CatalogoUnidad | null;
      chofer: CatalogoChofer | null;
      ultimoKmVisita: number | null;
      andonAbierto: boolean;
    },
  ): Promise<{ movimiento: MovimientoFlota; avisos: string[] }> {
    const operativa = await this.store.getOperativa(input.unidadId);
    const sitio = await this.store.getSitio(input.sitioId);
    let salidaAbierta: { occurredAt: string; km: number } | null = null;
    if (operativa?.salidaAbiertaId) {
      const abierta = await this.store.getMovimiento(operativa.salidaAbiertaId);
      if (abierta) {
        salidaAbierta = { occurredAt: abierta.occurredAt, km: abierta.km };
      }
    }
    const choferYaTieneSalida =
      input.tipo === TipoMovimientoFlota.SALIDA
        ? await this.store.choferTieneSalidaAbierta(
            input.choferId,
            input.unidadId,
          )
        : false;

    const errores = erroresMovimiento({
      input,
      nowIso: ctx.nowIso,
      sitio,
      choferActivo: ctx.chofer ? ctx.chofer.activo : null,
      unidadExiste: Boolean(ctx.unidad),
      operativa,
      salidaAbierta,
      choferYaTieneSalida,
    });
    if (errores.length) {
      throw new FlotaDomainError(errores[0]);
    }

    const movimiento: MovimientoFlota = {
      id: randomUUID(),
      tipo: input.tipo,
      unidadId: input.unidadId,
      choferId: input.choferId,
      sitioId: input.sitioId,
      occurredAt: input.occurredAt,
      km: input.km,
      notas: input.notas,
      createdBy: input.createdBy,
      avalRol: input.avalRol,
      firmas: input.firmas,
    };

    const next: UnidadOperativa = {
      unidadId: input.unidadId,
      sitioId: input.sitioId,
      choferActualId:
        input.tipo === TipoMovimientoFlota.SALIDA ? input.choferId : null,
      choferUltimoId:
        input.tipo === TipoMovimientoFlota.SALIDA
          ? input.choferId
          : (salidaChoferUltimo(operativa, input.choferId) ?? input.choferId),
      salidaAbiertaId:
        input.tipo === TipoMovimientoFlota.SALIDA ? movimiento.id : null,
      ultimoMovimientoAt: input.occurredAt,
    };

    await this.store.insertMovimiento(movimiento);
    await this.store.upsertOperativa(next);

    return {
      movimiento,
      avisos: avisosSuaves({
        tipo: input.tipo,
        andonAbierto: ctx.andonAbierto,
        km: input.km,
        ultimoKmVisita: ctx.ultimoKmVisita,
      }),
    };
  }
}

function salidaChoferUltimo(
  operativa: UnidadOperativa | null,
  entradaChoferId: string,
): string {
  return operativa?.choferActualId ?? operativa?.choferUltimoId ?? entradaChoferId;
}
