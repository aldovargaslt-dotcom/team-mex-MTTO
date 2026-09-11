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

export function stockBajoDedupeKey(itemId: string) {
  return `INV:stock-bajo:${itemId}`;
}

export function isExpired(item: InboxItem, now: Date) {
  return item.expiresAt != null && item.expiresAt.getTime() <= now.getTime();
}

export function deeplinkPath(
  item: Pick<InboxItem, 'subjectType' | 'subjectRef' | 'sourceModule'>,
) {
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
    body: `${numero} superó el umbral (${input.kmAlAbrir.toLocaleString('es-MX')} km / ${input.diasAlAbrir} d desde el último cierre). Revisar el aviso en el hub.`,
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
