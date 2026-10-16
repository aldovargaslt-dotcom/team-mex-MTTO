import { BadRequestException } from '@nestjs/common';

export type HistoryState =
  'AVAILABLE' | 'KNOWN_OPEN' | 'MISSING_POINTER' | 'MISSING_ROW';
export type JourneyCommand = {
  commandId: string;
  expectedSubject: string;
  unitRevision: string;
  historyState: HistoryState;
  journeyRef: string | null;
  journeyRevision: string | null;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const revision = (v: string | null): v is string =>
  v !== null &&
  /^(0|[1-9][0-9]{0,18})$/.test(v) &&
  BigInt(v) <= 9223372036854775807n;

export function journeyCommand(
  headers: Record<string, string | string[] | undefined>,
): JourneyCommand {
  const get = (key: string) =>
    typeof headers[key] === 'string' ? (headers[key] as string) : null;
  const commandId = get('idempotency-key');
  const expectedSubject = get('x-logistica-expected-subject');
  const unitRevision = get('x-logistica-unit-revision');
  const historyState = get('x-logistica-history-state') as HistoryState | null;
  const journeyRef = get('x-logistica-journey-ref');
  const journeyRevision = get('x-logistica-journey-revision');
  const validState =
    (historyState === 'AVAILABLE' && !journeyRef && !journeyRevision) ||
    (historyState === 'KNOWN_OPEN' &&
      !!journeyRef &&
      uuid.test(journeyRef) &&
      revision(journeyRevision) &&
      journeyRevision === '1') ||
    (historyState === 'MISSING_ROW' &&
      !!journeyRef &&
      uuid.test(journeyRef) &&
      !journeyRevision) ||
    (historyState === 'MISSING_POINTER' &&
      !!journeyRef &&
      /^legacy:[0-9a-f-]{36}:[0-9]+$/i.test(journeyRef) &&
      !journeyRevision);
  if (
    !commandId ||
    !uuid.test(commandId) ||
    !expectedSubject?.trim() ||
    expectedSubject.length > 128 ||
    !revision(unitRevision) ||
    !validState
  ) {
    throw new BadRequestException({
      code: 'LOGISTICA_COMMAND_CONTEXT_REQUIRED',
      message: 'Se requiere contexto válido para registrar el viaje.',
      details: {},
    });
  }
  return {
    commandId,
    expectedSubject,
    unitRevision,
    historyState: historyState!,
    journeyRef,
    journeyRevision,
  };
}
