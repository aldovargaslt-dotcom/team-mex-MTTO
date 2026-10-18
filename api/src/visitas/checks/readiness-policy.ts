import {
  CheckInterval,
  ReadinessSettings,
  SettingsScope,
  UnitUsage,
} from './readiness-settings.entity';
import { FACILITY_TIMEZONE, operationalDay } from './facility-calendar';

export function resolveReadinessSettings(
  rows: ReadinessSettings[],
  facilityId: string,
  unitId: string,
  categoryId: string,
) {
  // Stored settings remain audit history. Daily-only policy is universal (ADR029).
  void rows;
  void facilityId;
  void unitId;
  void categoryId;
  return {
    interval: { mode: 'DAILY' } as CheckInterval,
    origin: 'LEGACY' as SettingsScope | 'LEGACY',
    usage: 'DAILY' as UnitUsage,
    fingerprint: 'daily-only-v1',
  };
}

const local = new Intl.DateTimeFormat('en-CA', {
  timeZone: FACILITY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
function parts(date: Date) {
  const p = local.formatToParts(date);
  const n = (key: string) => Number(p.find((x) => x.type === key)!.value);
  return {
    year: n('year'),
    month: n('month'),
    day: n('day'),
    hour: n('hour'),
    minute: n('minute'),
    second: n('second'),
  };
}
function wallInstant(p: ReturnType<typeof parts>): Date {
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let guess = wall;
  for (let i = 0; i < 4; i++) {
    const observed = parts(new Date(guess));
    const delta =
      wall -
      Date.UTC(
        observed.year,
        observed.month - 1,
        observed.day,
        observed.hour,
        observed.minute,
        observed.second,
      );
    if (!delta) return new Date(guess);
    guess += delta;
  }
  throw new Error('La hora local no existe en el calendario operativo.');
}
export function checkDueAt(anchor: Date, interval: CheckInterval): Date {
  if (!Number.isFinite(anchor.getTime()))
    throw new Error('Fecha de revisión inválida.');
  if (interval.mode === 'DAILY') return operationalDay(anchor).dayEndInstant;
  if (interval.mode === 'CUSTOM') {
    if (
      !Number.isInteger(interval.hours) ||
      interval.hours! < 1 ||
      interval.hours! > 8760
    )
      throw new Error(
        'El intervalo personalizado requiere entre 1 y 8760 horas enteras.',
      );
    return new Date(anchor.getTime() + interval.hours! * 3600000);
  }
  const p = parts(anchor);
  if (interval.mode === 'WEEKLY') {
    const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 7));
    p.year = next.getUTCFullYear();
    p.month = next.getUTCMonth() + 1;
    p.day = next.getUTCDate();
  } else if (interval.mode === 'MONTHLY') {
    const next = new Date(Date.UTC(p.year, p.month, 1));
    p.year = next.getUTCFullYear();
    p.month = next.getUTCMonth() + 1;
    p.day = Math.min(
      p.day,
      new Date(Date.UTC(p.year, p.month, 0)).getUTCDate(),
    );
  } else throw new Error('Intervalo de revisión inválido.');
  return new Date(wallInstant(p).getTime() + anchor.getUTCMilliseconds());
}

/** Do not rewrite signed evidence: cap operational validity at its review day's end. */
export function dailyCheckDeadline(
  signedDeadline: Date,
  reviewedAt: Date,
): Date {
  return new Date(
    Math.min(
      signedDeadline.getTime(),
      operationalDay(reviewedAt).dayEndInstant.getTime(),
    ),
  );
}
