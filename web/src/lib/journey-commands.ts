import { api, HttpError } from './api';

export type JourneyBinding = {
  unidadId: string; unitJourneyRevision: string;
  journeyRef: string | null; journeyRevision: string | null;
  historyState: 'AVAILABLE' | 'KNOWN_OPEN' | 'MISSING_POINTER' | 'MISSING_ROW';
};
type Envelope = {
  subject: string; kind: 'salidas' | 'regresos'; context: JourneyBinding;
  commandId: string; body: string | null; suspended: boolean;
};
const prefix = 'team-mex-journey-v1:';
const active = new Map<string, Promise<void>>();
const attempted = new Set<string>();
const keyFor = (subject: string, kind: string, id: string) => prefix + JSON.stringify([subject, kind, id]);
const conflict = () => new HttpError(409, 'El viaje cambió. Actualiza la vista antes de confirmar.', 'LOGISTICA_JOURNEY_CONFLICT');
export function sameJourney(a: JourneyBinding, b: JourneyBinding) {
  return a.unidadId === b.unidadId && a.unitJourneyRevision === b.unitJourneyRevision &&
    a.journeyRef === b.journeyRef && a.journeyRevision === b.journeyRevision && a.historyState === b.historyState;
}
export function journeyHeaders(e: Envelope): Record<string, string> {
  return {
    'Idempotency-Key': e.commandId,
    'X-Logistica-Expected-Subject': e.subject,
    'X-Logistica-Unit-Revision': e.context.unitJourneyRevision,
    'X-Logistica-History-State': e.context.historyState,
    ...(e.context.journeyRef ? { 'X-Logistica-Journey-Ref': e.context.journeyRef } : {}),
    ...(e.context.journeyRevision ? { 'X-Logistica-Journey-Revision': e.context.journeyRevision } : {}),
  };
}
function load(key: string): Envelope | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const e = JSON.parse(raw) as Envelope;
  if (!e || !['salidas', 'regresos'].includes(e.kind) || typeof e.subject !== 'string' ||
      !e.context || !/^[0-9a-f-]{36}$/i.test(e.context.unidadId) ||
      typeof e.commandId !== 'string' || (e.body !== null && typeof e.body !== 'string') ||
      keyFor(e.subject, e.kind, e.context.unidadId) !== key) throw conflict();
  return e;
}
async function dispatch(key: string, e: Envelope, role: string): Promise<void> {
  const existing = active.get(key);
  if (existing) return existing;
  const operation = (async () => {
    try {
      await api<void>(`/logistica/${e.kind}/${e.context.unidadId}`, {
        role, userId: e.subject, method: 'POST', headers: journeyHeaders(e), ...(e.body !== null ? { body: e.body } : {}),
      });
      sessionStorage.removeItem(key);
    } catch (error) {
      if (error instanceof HttpError && error.status < 500) {
        e.suspended = true;
        sessionStorage.setItem(key, JSON.stringify(e));
      }
      throw error;
    } finally { active.delete(key); }
  })();
  active.set(key, operation);
  return operation;
}
export async function submitJourney(kind: Envelope['kind'], context: JourneyBinding, body: object | null, role: string, subject: string) {
  if (!subject) throw new HttpError(401, 'Inicia sesión para continuar.');
  const key = keyFor(subject, kind, context.unidadId);
  const encoded = body === null ? null : JSON.stringify(body);
  let pending = load(key);
  if (pending?.suspended && (!sameJourney(pending.context, context) || pending.body !== encoded)) {
    // A definitive prior rejection allows a new explicitly reviewed intent.
    sessionStorage.removeItem(key); pending = null;
  }
  if (pending) {
    await dispatch(key, pending, role);
    if (!sameJourney(pending.context, context) || pending.body !== encoded) throw conflict();
    return;
  }
  const envelope: Envelope = { subject, kind, context: { ...context }, body: encoded, commandId: crypto.randomUUID(), suspended: false };
  // Store only a confirmed intent. If storage is unavailable, do not issue an untracked mutation.
  sessionStorage.setItem(key, JSON.stringify(envelope));
  await dispatch(key, envelope, role);
}
export async function resumeJourneys(subject: string, role: string) {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) {
    const e = load(key);
    if (!e || e.subject !== subject || e.suspended || attempted.has(key)) continue;
    attempted.add(key);
    try { await dispatch(key, e, role); window.dispatchEvent(new Event('team-mex-journey-updated')); }
    catch (error) {
      window.dispatchEvent(new CustomEvent('team-mex-journey-error', { detail: error instanceof Error ? error.message : 'No se pudo confirmar la operación pendiente.' }));
    }
  }
}
