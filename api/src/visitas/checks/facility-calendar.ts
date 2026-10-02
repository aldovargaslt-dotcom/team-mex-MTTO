export const FACILITY_TIMEZONE = 'America/Mexico_City';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: FACILITY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function localDate(instant: Date): string {
  const parts = formatter.formatToParts(instant);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
// Find the first instant of a local date. This also handles historical DST
// midnight gaps/repeated hours without assuming a fixed UTC offset or TTL.
function midnight(date: string): Date {
  const noon = Date.parse(`${date}T12:00:00Z`);
  let low = noon - 36 * 3600000,
    high = noon + 36 * 3600000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDate(new Date(mid)) < date) low = mid + 1;
    else high = mid;
  }
  return new Date(low);
}
export function operationalDay(now: Date) {
  if (!Number.isFinite(now.getTime()))
    throw new Error('Invalid calendar instant');
  const operationalDate = localDate(now);
  const next = new Date(`${operationalDate}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    operationalDate,
    timezone: FACILITY_TIMEZONE,
    dayStartInstant: midnight(operationalDate),
    dayEndInstant: midnight(next.toISOString().slice(0, 10)),
  };
}
