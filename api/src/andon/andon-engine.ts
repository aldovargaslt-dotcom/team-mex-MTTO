import { randomUUID } from 'crypto';
import { VisitaCerradaPayload } from '../kernel/events/visita-cerrada';
import { Rol } from '../auth/roles.enum';
import { evaluarApertura } from './andon-rules';
import { Aviso, StockWriter, VisitaWriter } from './andon-types';
import {
  DEFAULT_T_DIAS,
  DEFAULT_T_KM,
  EstadoAviso,
  WhatsAppKind,
} from './enums';
import { AndonStore, AvisoInboxPort, UnidadCatalog, WhatsAppPort } from './ports';

export class AndonForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AndonForbiddenError';
  }
}

export class AndonNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AndonNotFoundError';
  }
}

export type AndonEngineDeps = {
  store: AndonStore;
  catalog: UnidadCatalog;
  whatsapp: WhatsAppPort;
  inbox?: AvisoInboxPort;
  now?: () => Date;
  newId?: () => string;
  visitaWriter?: VisitaWriter;
  stockWriter?: StockWriter;
};

/**
 * Kernel Andon v0. No escribe Visita ni stock (A7). IDs opacos; el store
 * vive en schema `andon` (o fake en memoria).
 */
export class AndonEngine {
  constructor(private readonly deps: AndonEngineDeps) {}

  private nowIso(now?: Date) {
    return (now ?? this.deps.now?.() ?? new Date()).toISOString();
  }

  private id() {
    return this.deps.newId?.() ?? randomUUID();
  }

  async evaluarUnidad(input: {
    unidadId: string;
    currentKm: number;
    now?: Date;
  }): Promise<Aviso | null> {
    const unidad = await this.deps.catalog.get(input.unidadId);
    const lastClosed = await this.deps.store.getLastClosed(input.unidadId);
    const abierto = await this.deps.store.getNoResuelto(input.unidadId);
    const tipoId = unidad?.tipoVehiculoId ?? lastClosed?.tipoVehiculoId;
    const umbral = tipoId ? await this.deps.store.getUmbral(tipoId) : null;
    const tKm = umbral?.tKm ?? DEFAULT_T_KM;
    const tDias = umbral?.tDias ?? DEFAULT_T_DIAS;
    const nowIso = this.nowIso(input.now);

    const result = evaluarApertura({
      lastClosed,
      currentKm: input.currentKm,
      nowIso,
      unidadActiva: unidad?.activa === true,
      tieneNoResuelto: abierto != null,
      tKm,
      tDias,
    });

    if (!result.abrir || !lastClosed || !unidad) {
      return null;
    }

    const aviso: Aviso = {
      id: this.id(),
      unidadId: input.unidadId,
      tipoVehiculoId: lastClosed.tipoVehiculoId,
      estado: EstadoAviso.ABIERTO,
      abiertaAt: nowIso,
      enteradoAt: null,
      enteradoBy: null,
      resueltoAt: null,
      visitaResolutoriaId: null,
      kmAlAbrir: result.kmDesde,
      diasAlAbrir: result.diasDesde,
      umbralKm: tKm,
      umbralDias: tDias,
    };
    await this.deps.store.insertAviso(aviso);
    await this.deps.whatsapp.send({
      avisoId: aviso.id,
      unidadId: aviso.unidadId,
      kind: WhatsAppKind.AVISO,
    });
    await this.deps.inbox?.onAbierto(aviso, unidad);
    return aviso;
  }

  /**
   * Consume VisitaCerrada (ADR-001). Ignora `consumos` (A7). No escribe
   * Visita ni stock. Resuelve aviso no resuelto (A5). Idempotente por eventId (A8).
   */
  async handleVisitaCerrada(
    payload: VisitaCerradaPayload,
  ): Promise<{ duplicate: boolean; resolved: Aviso | null }> {
    if (await this.deps.store.hasProcessed(payload.eventId)) {
      const existing = await this.deps.store.getNoResuelto(payload.unidadId);
      return { duplicate: true, resolved: existing };
    }

    await this.deps.store.markProcessed(payload.eventId);

    const abierto = await this.deps.store.getNoResuelto(payload.unidadId);
    let resolved: Aviso | null = null;
    if (abierto) {
      resolved = {
        ...abierto,
        estado: EstadoAviso.RESUELTO,
        resueltoAt: payload.cerradoAt,
        visitaResolutoriaId: payload.visitaId,
      };
      await this.deps.store.updateAviso(resolved);
      await this.deps.inbox?.onResuelto(resolved);
    }

    await this.deps.store.setLastClosed({
      unidadId: payload.unidadId,
      visitaId: payload.visitaId,
      tipoVehiculoId: payload.tipoVehiculoId,
      km: payload.km,
      cerradoAt: payload.cerradoAt,
    });

    return { duplicate: false, resolved };
  }

  async enterado(
    avisoId: string,
    actor: { rol: Rol; userId: string | null },
    now?: Date,
  ): Promise<Aviso> {
    if (actor.rol !== Rol.SUPERVISOR) {
      throw new AndonForbiddenError(
        'Solo el supervisor puede marcar un aviso como enterado.',
      );
    }
    const aviso = await this.deps.store.getAviso(avisoId);
    if (!aviso) {
      throw new AndonNotFoundError('No se encontró la alerta.');
    }
    if (aviso.estado === EstadoAviso.RESUELTO) {
      return aviso;
    }
    if (aviso.estado === EstadoAviso.ENTERADO) {
      return aviso;
    }
    const next: Aviso = {
      ...aviso,
      estado: EstadoAviso.ENTERADO,
      enteradoAt: this.nowIso(now),
      enteradoBy: actor.userId,
    };
    await this.deps.store.updateAviso(next);
    return next;
  }

  async enviarRecordatorios(): Promise<number> {
    const abiertos = await this.deps.store.listNoResueltos();
    let sent = 0;
    for (const aviso of abiertos) {
      if (aviso.estado !== EstadoAviso.ABIERTO) {
        continue;
      }
      await this.deps.whatsapp.send({
        avisoId: aviso.id,
        unidadId: aviso.unidadId,
        kind: WhatsAppKind.RECORDATORIO,
      });
      sent += 1;
    }
    return sent;
  }

  async evaluarTodas(now?: Date): Promise<Aviso[]> {
    const unidades = await this.deps.catalog.list();
    const opened: Aviso[] = [];
    for (const unidad of unidades) {
      const last = await this.deps.store.getLastClosed(unidad.unidadId);
      if (!last?.visitaId?.trim()) {
        continue;
      }
      const aviso = await this.evaluarUnidad({
        unidadId: unidad.unidadId,
        currentKm: last.km,
        now,
      });
      if (aviso) {
        opened.push(aviso);
      }
    }
    return opened;
  }
}
