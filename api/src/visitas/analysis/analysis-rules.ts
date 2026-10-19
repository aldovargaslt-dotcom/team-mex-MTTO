import { BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { calculateCost, CostMoney } from '../../inventario/cost-rules';
import { operationalDay } from '../checks/facility-calendar';
import { CATALOGO_TRABAJOS } from '../trabajos-catalogo';

export const ANALYSIS_ZONE = 'America/Mexico_City';
export const SYSTEMS: Record<string, string> = {
  A: 'Motor y auxiliares',
  B: 'Frenos',
  C: 'Suspensión y dirección',
  D: 'Llantas',
  E: 'Carrocería, luces e interiores',
};
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';
export type WorkKind =
  'REVIEW_ADJUSTMENT' | 'REPAIR' | 'REPLACEMENT' | 'UNSPECIFIED';
export type Claim = {
  sourceOpId: string;
  sourceVersion: number;
  from: number;
  to: number;
};
export type WorkLine = {
  id: string;
  system: string;
  workCode: string;
  workKind: WorkKind;
  interventionId: string;
  orderWorkRef?: string;
};
export type ServiceCostLine = {
  id: string;
  system: string | null;
  workRef?: string;
  mode: 'SERVICE_ONLY' | 'SUPPLIER_PARTS_INCLUDED' | 'COMPANY_PARTS';
  money: CostMoney | null;
  zeroReason?: string;
  claims: Claim[];
};
export type ServiceAttachment = {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  sha256: string;
};
export type ExternalServiceData = {
  attachments?: ServiceAttachment[];
  unitId: string;
  providerName: string;
  performedOn: string;
  startedOn?: string;
  maintenanceType: MaintenanceType;
  orderId?: string;
  stopRef?: string;
  note?: string;
  documentRef?: string;
  workLines: WorkLine[];
  costLines: ServiceCostLine[];
};
export type Slot = { start: string; end: string; endDayOffset?: number };
export type ScheduleData = {
  weeklyDays: Record<string, Slot[]>;
  dateOverrides: Record<string, Slot[]>;
};
export type MoneyFact = {
  netCents: string | null;
  taxCents: string | null;
  sign?: number;
};

export function invalid(
  message: string,
  code = 'INVALID_ANALYSIS_INPUT',
): never {
  if (code === 'RECONCILIATION_REQUIRED')
    throw new ConflictException({ code, message, details: {} });
  throw new BadRequestException({ code, message, details: {} });
}
export function object(
  input: unknown,
  keys?: string[],
): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    invalid('Datos inválidos.');
  const value = input as Record<string, unknown>;
  if (keys && Object.keys(value).some((key) => !keys.includes(key)))
    invalid('La solicitud contiene campos no permitidos.');
  return value;
}
export function text(
  value: unknown,
  label: string,
  max = 1000,
  required = true,
): string {
  if (value === undefined && !required) return '';
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    invalid(`Indique ${label}.`);
  return value.trim();
}
export function uuid(value: unknown): string {
  const id = text(value, 'una referencia válida', 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    invalid('Referencia inválida.');
  return id;
}
export function dateOnly(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    invalid('Indique una fecha válida.');
  const d = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value)
    invalid('Fecha inexistente.');
  return value;
}
export function shiftDate(day: string, amount: number) {
  const d = new Date(`${dateOnly(day)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function localMidnight(day: string) {
  return operationalDay(new Date(`${dateOnly(day)}T12:00:00Z`)).dayStartInstant;
}
export function economicDate(
  performed: unknown,
  started: unknown,
  now = new Date(),
) {
  const day = dateOnly(performed);
  if (day > operationalDay(now).operationalDate)
    invalid('El servicio debe estar realizado; no admite una fecha futura.');
  if (started !== undefined && dateOnly(started) > day)
    invalid('La conclusión no puede ser anterior al inicio.');
  return day;
}
export function buildQueryPeriod(from: unknown, to: unknown, now = new Date()) {
  const first = dateOnly(from),
    last = dateOnly(to);
  const days =
    (Date.parse(`${last}T12:00Z`) - Date.parse(`${first}T12:00Z`)) / 86400000;
  if (days < 1 || days > 366)
    invalid('Seleccione un rango entre 1 y 366 días.');
  const start = localMidnight(first),
    end = new Date(Math.min(localMidnight(last).getTime(), now.getTime()));
  if (start >= end) invalid('El rango no contiene tiempo transcurrido.');
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    requestedFrom: first,
    requestedTo: last,
    timezone: ANALYSIS_ZONE,
  };
}
export function aggregateMoney(facts: MoneyFact[]) {
  let net = 0n,
    tax = 0n,
    pending = 0,
    fiscalUnknown = 0;
  for (const row of facts) {
    if (row.netCents === null) {
      pending++;
      continue;
    }
    const sign = BigInt(row.sign ?? 1);
    net += BigInt(row.netCents) * sign;
    if (row.taxCents === null) fiscalUnknown++;
    else tax += BigInt(row.taxCents) * sign;
  }
  const complete = pending === 0 && fiscalUnknown === 0;
  return {
    netCents: net.toString(),
    taxCents: complete ? tax.toString() : null,
    totalCents: complete ? (net + tax).toString() : null,
    pending,
    fiscalUnknown,
  };
}
export function utilization(
  numerator: number,
  denominator: number,
  known: number,
) {
  if (
    ![numerator, denominator, known].every(Number.isFinite) ||
    numerator < 0 ||
    denominator < 0 ||
    known < 0 ||
    numerator > denominator ||
    known > denominator
  )
    invalid('Intervalos incompatibles.');
  if (denominator === 0) return { value: null, reason: 'NOT_APPLICABLE' };
  if (known !== denominator)
    return { value: null, reason: 'INCOMPLETE_COVERAGE' };
  return {
    value: Math.round((numerator / denominator) * 10000) / 100,
    reason: null,
  };
}
export function unionSeconds(intervals: [number, number][]) {
  const sorted = intervals
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    end = -Infinity;
  for (const [a, b] of sorted) {
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return Math.floor(total / 1000);
}
export function catalogue() {
  return CATALOGO_TRABAJOS.flatMap((system) =>
    system.items.map((label, index) => ({
      code: `${system.categoria}_${index + 1}`,
      system: system.categoria as string,
      label,
      kind: /Calibración|Alineación/.test(label)
        ? ('REVIEW_ADJUSTMENT' as WorkKind)
        : ('UNSPECIFIED' as WorkKind),
    })),
  ).concat([
    {
      code: 'D_REPAIR',
      system: 'D',
      label: 'Reparación de llanta',
      kind: 'REPAIR',
    },
    {
      code: 'D_REPLACE',
      system: 'D',
      label: 'Cambio de llanta',
      kind: 'REPLACEMENT',
    },
  ]);
}
export function normalizeWork(system: string, label: string) {
  const item = catalogue().find(
    (x) => x.system === system && x.label === label,
  );
  return {
    system: SYSTEMS[system] ? system : null,
    label,
    code: item?.code ?? null,
    kind: item?.kind ?? ('UNSPECIFIED' as WorkKind),
  };
}
export function validateClaims(
  claims: Claim[],
  operations: {
    id: string;
    kind: string;
    qty: number;
    version: number;
    unidadId: string | null;
  }[],
  unitId: string,
) {
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i],
      op = operations.find((x) => x.id === c.sourceOpId);
    if (
      !op ||
      op.kind !== 'EXTERNAL' ||
      op.unidadId !== unitId ||
      c.sourceVersion !== op.version ||
      !Number.isInteger(c.from) ||
      !Number.isInteger(c.to) ||
      c.from < 0 ||
      c.to <= c.from ||
      c.to > op.qty
    )
      invalid(
        'La pieza incluida requiere conciliación con su fuente vigente.',
        'RECONCILIATION_REQUIRED',
      );
    if (
      claims
        .slice(0, i)
        .some(
          (x) =>
            x.sourceOpId === c.sourceOpId && x.from < c.to && c.from < x.to,
        )
    )
      invalid(
        'La misma pieza no puede incluirse dos veces.',
        'RECONCILIATION_REQUIRED',
      );
  }
}
export function validateService(
  input: unknown,
  now = new Date(),
): ExternalServiceData {
  const b = object(input, [
    'unitId',
    'providerName',
    'performedOn',
    'startedOn',
    'maintenanceType',
    'orderId',
    'stopRef',
    'note',
    'documentRef',
    'workLines',
    'costLines',
  ]);
  const unitId = uuid(b.unitId),
    performedOn = economicDate(b.performedOn, b.startedOn, now);
  if (!['PREVENTIVE', 'CORRECTIVE'].includes(String(b.maintenanceType)))
    invalid('Seleccione Preventivo o Correctivo.');
  if (
    !Array.isArray(b.workLines) ||
    !b.workLines.length ||
    b.workLines.length > 100 ||
    !Array.isArray(b.costLines) ||
    !b.costLines.length ||
    b.costLines.length > 100
  )
    invalid('Indique entre 1 y 100 trabajos y líneas de costo.');
  const workLines = b.workLines.map((raw): WorkLine => {
    const row = object(raw, [
      'id',
      'system',
      'workCode',
      'workKind',
      'orderWorkRef',
      'interventionId',
    ]);
    const system = text(row.system, 'sistema', 1),
      code = text(row.workCode, 'trabajo', 80);
    if (
      !catalogue().some((c) => c.code === code && c.system === system) ||
      !['REVIEW_ADJUSTMENT', 'REPAIR', 'REPLACEMENT'].includes(
        String(row.workKind),
      )
    )
      invalid('Trabajo o tipo de intervención inválido.');
    const fixed = catalogue().find((x) => x.code === code)!;
    if (fixed.kind !== 'UNSPECIFIED' && row.workKind !== fixed.kind)
      invalid('El tipo de trabajo no corresponde al catálogo.');
    return {
      id: row.id ? uuid(row.id) : randomUUID(),
      system,
      workCode: code,
      workKind: row.workKind as WorkKind,
      interventionId: row.interventionId
        ? uuid(row.interventionId)
        : randomUUID(),
      ...(row.orderWorkRef ? { orderWorkRef: uuid(row.orderWorkRef) } : {}),
    };
  });
  const costLines = b.costLines.map((raw): ServiceCostLine => {
    const row = object(raw, [
      'id',
      'system',
      'workRef',
      'mode',
      'money',
      'zeroReason',
      'claims',
    ]);
    const moneyInput = object(row.money, [
      'state',
      'inputTotalCents',
      'taxMode',
      'taxTreatment',
      'rateBps',
      'currency',
    ]);
    const money = calculateCost(
      moneyInput as Parameters<typeof calculateCost>[0],
    );
    if (money && money.totalCents === '0')
      text(row.zeroReason, 'motivo de importe cero');
    if (
      !['SERVICE_ONLY', 'SUPPLIER_PARTS_INCLUDED', 'COMPANY_PARTS'].includes(
        String(row.mode),
      )
    )
      invalid(
        'Indique si el servicio incluye piezas del proveedor o piezas propias.',
      );
    if (row.system != null && !SYSTEMS[String(row.system)])
      invalid('Sistema inválido.');
    const work = row.workRef
      ? workLines.find((x) => x.id === row.workRef)
      : undefined;
    if (row.workRef && (!work || (row.system && row.system !== work.system)))
      invalid('El trabajo de costo debe pertenecer al mismo sistema.');
    if (
      row.claims !== undefined &&
      (!Array.isArray(row.claims) || row.claims.length > 100)
    )
      invalid('Referencias de piezas inválidas.');
    const claims = (Array.isArray(row.claims) ? row.claims : []).map(
      (c): Claim => {
        const q = object(c, ['sourceOpId', 'sourceVersion', 'from', 'to']);
        return {
          sourceOpId: uuid(q.sourceOpId),
          sourceVersion: Number(q.sourceVersion),
          from: Number(q.from),
          to: Number(q.to),
        };
      },
    );
    if (claims.length && row.mode !== 'SUPPLIER_PARTS_INCLUDED')
      invalid(
        'Solo las piezas incluidas por proveedor pueden excluir una contribución duplicada.',
      );
    return {
      id: row.id ? uuid(row.id) : randomUUID(),
      system: row.system == null ? (work?.system ?? null) : String(row.system),
      mode: row.mode as ServiceCostLine['mode'],
      money,
      claims,
      ...(row.workRef ? { workRef: uuid(row.workRef) } : {}),
      ...(row.zeroReason ? { zeroReason: text(row.zeroReason, 'motivo') } : {}),
    };
  });
  if (
    new Set(workLines.map((x) => x.id)).size !== workLines.length ||
    new Set(costLines.map((x) => x.id)).size !== costLines.length
  )
    invalid('Referencias duplicadas.');
  return {
    unitId,
    providerName: text(b.providerName, 'proveedor', 160),
    performedOn,
    maintenanceType: b.maintenanceType as MaintenanceType,
    workLines,
    costLines,
    ...(b.startedOn ? { startedOn: dateOnly(b.startedOn) } : {}),
    ...(b.orderId ? { orderId: uuid(b.orderId) } : {}),
    ...(b.stopRef ? { stopRef: uuid(b.stopRef) } : {}),
    ...(b.note ? { note: text(b.note, 'nota') } : {}),
    ...(b.documentRef
      ? { documentRef: text(b.documentRef, 'referencia', 200) }
      : {}),
  };
}
export function validateSchedule(input: unknown): ScheduleData {
  const b = object(input, ['weeklyDays', 'dateOverrides']);
  const weekly = object(b.weeklyDays),
    overrides = object(b.dateOverrides ?? {});
  const parse = (
    values: Record<string, unknown>,
    dates: boolean,
  ): Record<string, Slot[]> =>
    Object.fromEntries(
      Object.entries(values).map(([day, slots]) => {
        if (dates) dateOnly(day);
        else if (!/^[1-7]$/.test(day)) invalid('Día de semana inválido.');
        if (!Array.isArray(slots) || slots.length > 8)
          invalid('Franjas inválidas.');
        const result = slots.map((v): Slot => {
          const s = object(v, ['start', 'end', 'endDayOffset']);
          if (
            ![s.start, s.end].every(
              (x) =>
                typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x),
            )
          )
            invalid('Hora inválida.');
          const offset = Number(s.endDayOffset ?? 0);
          if (![0, 1].includes(offset)) invalid('Cruce de día inválido.');
          const minutes = (x: string) =>
            Number(x.slice(0, 2)) * 60 + Number(x.slice(3));
          if (
            minutes(String(s.end)) + offset * 1440 <=
            minutes(String(s.start))
          )
            invalid('La franja debe terminar después de iniciar.');
          return {
            start: String(s.start),
            end: String(s.end),
            endDayOffset: offset,
          };
        });
        return [day, result];
      }),
    );
  if (Object.keys(overrides).length > 366) invalid('Demasiadas excepciones.');
  return {
    weeklyDays: parse(weekly, false),
    dateOverrides: parse(overrides, true),
  };
}
function wallInstant(day: string, clock: string, end: boolean) {
  const wanted = `${day}T${clock}`,
    naive = Date.parse(`${wanted}:00Z`),
    offsets = new Set<number>();
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ANALYSIS_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const stamp = (n: number) => fmt.format(new Date(n)).replace(' ', 'T');
  for (const delta of [-36, -12, 12, 36]) {
    const t = naive + delta * 3600000;
    offsets.add(Date.parse(`${stamp(t)}:00Z`) - t);
  }
  const candidates = [...offsets]
    .map((o) => naive - o)
    .filter((n) => stamp(n) === wanted);
  if (!candidates.length)
    invalid('La franja cruza una hora local inexistente.');
  return end ? Math.max(...candidates) : Math.min(...candidates);
}
export function scheduledSeconds(schedule: ScheduleData, from: Date, to: Date) {
  const intervals: [number, number][] = [];
  let day = shiftDate(operationalDay(from).operationalDate, -1);
  const last = operationalDay(to).operationalDate;
  for (let i = 0; day <= last && i < 369; i++, day = shiftDate(day, 1)) {
    const weekday = String(new Date(`${day}T12:00Z`).getUTCDay() || 7);
    const slots =
      schedule.dateOverrides[day] ?? schedule.weeklyDays[weekday] ?? [];
    for (const s of slots)
      intervals.push([
        Math.max(from.getTime(), wallInstant(day, s.start, false)),
        Math.min(
          to.getTime(),
          wallInstant(shiftDate(day, s.endDayOffset ?? 0), s.end, true),
        ),
      ]);
  }
  return unionSeconds(intervals);
}
