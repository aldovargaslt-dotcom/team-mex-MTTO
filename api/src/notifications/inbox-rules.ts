import { randomUUID } from 'crypto';
import { Severity, SourceEvent, SourceModule, SubjectType } from './enums';
import { InboxItem, IngestCommand, StockBajoInput } from './inbox-types';

export type AvisoAbiertoInput = {
  avisoId: string;
  unidadId: string;
  numeroInterno?: string | null;
  kmAlAbrir: number;
  diasAlAbrir: number;
  abiertaAt: string;
};

export function avisoAbiertoDedupeKey(unidadId: string) {
  return `ANDON:AvisoAbierto:${unidadId}`;
}

export function healthBelowDedupeKey(unidadId: string) {
  return `SALUD:HealthBelow:${unidadId}`;
}

export function flotaSinRegresoDedupeKey(unidadId: string) {
  return `FLOTA:sin-regreso:${unidadId}`;
}

export function stockBajoDedupeKey(itemId: string) {
  return `INV:stock-bajo:${itemId}`;
}

export function isExpired(item: InboxItem, now: Date) {
  return item.expiresAt != null && item.expiresAt.getTime() <= now.getTime();
}

export function deeplinkPath(
  item: Pick<InboxItem, 'subjectType' | 'subjectRef' | 'sourceModule'>,
) {
  if (item.sourceModule === SourceModule.LOGISTICA) {
    return '/flota?alerta=SIN_REGRESO';
  }
  if (item.subjectType === SubjectType.UNIDAD && item.subjectRef) {
    return `/unidades/${item.subjectRef}`;
  }
  if (item.subjectType === SubjectType.ITEM) {
    return '/inventario/stock';
  }
  if (item.sourceModule === SourceModule.ANDON) {
    return '/andon';
  }
  return '/notificaciones';
}

export function avisoAbiertoCommand(input: AvisoAbiertoInput): IngestCommand {
  const numero = input.numeroInterno?.trim() || 'Unidad';
  return {
    sourceModule: SourceModule.ANDON,
    sourceEvent: SourceEvent.AVISO_ABIERTO,
    sourceRef: input.avisoId,
    subjectType: SubjectType.UNIDAD,
    subjectRef: input.unidadId,
    severity: Severity.WARNING,
    title: `Mantenimiento vencido — ${numero}`,
    body: `${numero} superó el umbral (${input.kmAlAbrir.toLocaleString('es-MX')} km / ${input.diasAlAbrir} d desde el último cierre). Revisar la alerta en el hub.`,
    dedupeKey: avisoAbiertoDedupeKey(input.unidadId),
    createdAt: new Date(input.abiertaAt),
  };
}

/** Inventario emite el envelope ADR-007; Notifications solo ingiere. qty=0 → CRITICAL. */
export function stockBajoCommand(input: StockBajoInput): IngestCommand {
  const agotado = input.qty === 0;
  const who = input.nombre?.trim()
    ? `${input.nombre.trim()} (${input.sku})`
    : input.sku;
  const umbral =
    input.qty != null && input.minQty != null
      ? `hay ${input.qty}, mínimo ${input.minQty}`
      : null;
  return {
    sourceModule: SourceModule.INVENTARIO,
    sourceEvent: SourceEvent.STOCK_BAJO,
    sourceRef: input.eventId ?? input.itemId,
    subjectType: SubjectType.ITEM,
    subjectRef: input.itemId,
    severity: agotado ? Severity.CRITICAL : Severity.WARNING,
    title: agotado
      ? `Stock agotado — ${input.sku}`
      : `Stock bajo — ${input.sku}`,
    body: agotado
      ? `${who} está en 0${umbral ? ` (${umbral})` : ''}. Requiere reabastecimiento.`
      : umbral
        ? `${who}: ${umbral}. Requiere reabastecimiento.`
        : `${who} requiere reabastecimiento.`,
    dedupeKey: stockBajoDedupeKey(input.itemId),
    createdAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
  };
}

export type HealthBelowInput = {
  alertId: string;
  unidadId: string;
  numeroInterno?: string | null;
  score: number;
  threshold: number;
  drivers?: { message: string }[];
  severity: Severity;
  openedAt: string;
};

export function healthBelowCommand(input: HealthBelowInput): IngestCommand {
  const numero = input.numeroInterno?.trim() || 'Unidad';
  const factores =
    input.drivers
      ?.slice(0, 3)
      .map((d) => d.message)
      .filter(Boolean)
      .join(' · ') || null;
  return {
    sourceModule: SourceModule.SALUD,
    sourceEvent: SourceEvent.HEALTH_BELOW_THRESHOLD,
    sourceRef: input.alertId,
    subjectType: SubjectType.UNIDAD,
    subjectRef: input.unidadId,
    severity: input.severity,
    title: `Salud de unidad baja — ${numero}`,
    body: factores
      ? `${numero} tiene una salud de ${input.score}%. El límite es ${input.threshold}%. ${factores}`
      : `${numero} tiene una salud de ${input.score}%. El límite configurado es ${input.threshold}%.`,
    dedupeKey: healthBelowDedupeKey(input.unidadId),
    createdAt: new Date(input.openedAt),
  };
}

export type FlotaSinRegresoInput = {
  eventId: string;
  unidadId: string;
  ambito: 'LOCAL' | 'FORANEO';
  salidaAt: string;
  thresholdHoras: number;
  elapsedHoras: number;
  occurredAt: string;
  numeroInterno?: string | null;
  placas?: string | null;
};

export function flotaSinRegresoCommand(
  input: FlotaSinRegresoInput,
): IngestCommand {
  const who =
    input.numeroInterno?.trim() || input.placas?.trim() || 'Unidad';
  const horas = Math.max(1, Math.round(input.elapsedHoras));
  const umbral = input.thresholdHoras;
  const ambito = input.ambito === 'FORANEO' ? 'foránea' : 'local';
  return {
    sourceModule: SourceModule.LOGISTICA,
    sourceEvent: SourceEvent.FLOTA_SIN_REGRESO,
    sourceRef: input.eventId,
    subjectType: SubjectType.UNIDAD,
    subjectRef: input.unidadId,
    severity: Severity.WARNING,
    title: `Sin regreso — ${who}`,
    body: `${who} lleva ${horas} h en ruta (${ambito}; umbral ${umbral} h). Registrar el regreso en Flota.`,
    dedupeKey: flotaSinRegresoDedupeKey(input.unidadId),
    createdAt: new Date(input.occurredAt),
  };
}

export function applyIngest(
  existing: InboxItem | null,
  cmd: IngestCommand,
  now: Date,
  newId: () => string = randomUUID,
): { item: InboxItem; created: boolean; reactivated: boolean } {
  if (existing) {
    const reactivated = existing.expiresAt != null;
    return {
      created: false,
      reactivated,
      item: {
        ...existing,
        sourceModule: cmd.sourceModule,
        sourceEvent: cmd.sourceEvent,
        sourceRef: cmd.sourceRef,
        subjectType: cmd.subjectType,
        subjectRef: cmd.subjectRef,
        severity: cmd.severity,
        title: cmd.title,
        body: cmd.body,
        dedupeKey: cmd.dedupeKey,
        expiresAt: null,
        createdAt: reactivated ? (cmd.createdAt ?? now) : existing.createdAt,
      },
    };
  }

  return {
    created: true,
    reactivated: false,
    item: {
      id: newId(),
      sourceModule: cmd.sourceModule,
      sourceEvent: cmd.sourceEvent,
      sourceRef: cmd.sourceRef,
      subjectType: cmd.subjectType,
      subjectRef: cmd.subjectRef,
      severity: cmd.severity,
      title: cmd.title,
      body: cmd.body,
      dedupeKey: cmd.dedupeKey,
      createdAt: cmd.createdAt ?? now,
      expiresAt: null,
    },
  };
}

export function applyExpire(item: InboxItem, now: Date): InboxItem {
  return { ...item, expiresAt: now };
}

export function sortInbox<T extends InboxItem & { readAt: Date | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aUnread = a.readAt == null ? 0 : 1;
    const bUnread = b.readAt == null ? 0 : 1;
    if (aUnread !== bUnread) {
      return aUnread - bUnread;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
