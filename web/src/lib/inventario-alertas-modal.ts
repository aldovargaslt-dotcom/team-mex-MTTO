import type { Movimiento, StockRow } from './types';

export type EditorRow = StockRow & {
  draft: string;
  status: 'clean' | 'saved' | 'error' | 'unsent' | 'uncertain';
  error?: string;
};
export type AlertFilter = 'TODOS' | 'CON' | 'SIN';
export type MonthPeriod = { from: string; to: string; label: string };
export const MINIMUM_ERROR = 'Indica un número entero igual o mayor que 0, o deja el campo vacío';

export function parseMinimum(raw: string): { valid: true; value: number | null } | { valid: false } {
  const text = raw.trim();
  if (!text) return { valid: true, value: null };
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) return { valid: false };
  return { valid: true, value: Number(text) };
}

export function previousMonth(now = new Date()): MonthPeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(start),
  };
}

export function monthlyExits(movements: Movimiento[], period: MonthPeriod): Record<string, number> {
  if (!Array.isArray(movements)) throw new Error('Referencia incompleta');
  const result: Record<string, number> = {};
  const from = Date.parse(`${period.from}T00:00:00.000Z`);
  const to = Date.parse(`${period.to}T23:59:59.999Z`);
  for (const movement of movements) {
    const time = Date.parse(movement.createdAt);
    if (!Number.isFinite(time) || !movement.itemId || !Number.isFinite(movement.qty)) throw new Error('Referencia inválida');
    if (movement.tipo === 'SALIDA_OT' && movement.qty > 0 && time >= from && time <= to) {
      result[movement.itemId] = (result[movement.itemId] ?? 0) + movement.qty;
    }
  }
  return result;
}

export function createEditor(rows: StockRow[]): EditorRow[] {
  return [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.sku.localeCompare(b.sku, 'es'))
    .map((row) => ({ ...row, draft: row.minQty === null ? '' : String(row.minQty), status: 'clean' }));
}

export function isPending(row: EditorRow) {
  const parsed = parseMinimum(row.draft);
  return row.status === 'uncertain' || !parsed.valid || parsed.value !== row.minQty;
}
export function pendingRows(rows: EditorRow[]) { return rows.filter(isPending); }

export function visibleRows(rows: EditorRow[], query: string, filter: AlertFilter): EditorRow[] {
  const term = query.trim().toLocaleLowerCase('es');
  return rows.filter((row) =>
    (filter === 'TODOS' || (filter === 'CON' ? row.minQty !== null : row.minQty === null)) &&
    `${row.nombre} ${row.sku}`.toLocaleLowerCase('es').includes(term));
}

export function toggleVisible(selected: Set<string>, visible: string[], checked: boolean) {
  const next = new Set(selected);
  for (const id of visible) { if (checked) next.add(id); else next.delete(id); }
  return next;
}

export function batchPreview(rows: EditorRow[], selected: Set<string>, raw: string, unit?: string) {
  const affected = rows.filter((row) => selected.has(row.itemId) && (!unit || row.uom === unit));
  const next = parseMinimum(raw);
  return { count: affected.length, replacements: affected.filter((row) => {
    const current = parseMinimum(row.draft);
    return current.valid && current.value !== null && next.valid && current.value !== next.value;
  }).length };
}

export function applyBatch(rows: EditorRow[], selected: Set<string>, raw: string, unit?: string): EditorRow[] {
  const parsed = parseMinimum(raw);
  if (!parsed.valid) throw new Error(MINIMUM_ERROR);
  const affected = rows.filter((row) => selected.has(row.itemId) && (!unit || row.uom === unit));
  if (affected.some((row) => row.status === 'uncertain')) throw new Error('Comprueba el estado antes de editar estos productos');
  if (parsed.value !== null && new Set(affected.map((row) => row.uom)).size > 1) throw new Error('Elige un grupo de unidad');
  return rows.map((row) => affected.includes(row) ? { ...row, draft: raw, status: 'clean', error: undefined } : row);
}

// Presentation of the existing server clamp, not a severity evaluator or a write value.
export function criticalNotice(row: EditorRow): string | null {
  const next = parseMinimum(row.draft);
  return next.valid && next.value !== null && next.value < row.criticalQty
    ? `El límite crítico también bajará de ${row.criticalQty} a ${next.value}` : null;
}

export type ThresholdResponse = { minQty: number | null; criticalQty: number; stock?: number; alerta?: StockRow['alerta'] };
export type EditorTransport = {
  patch: (id: string, body: { minQty: number | null }) => Promise<ThresholdResponse>;
  read: () => Promise<StockRow[]>;
};

export function reconcileEditor(rows: EditorRow[], stock: StockRow[]): EditorRow[] {
  return rows.map((row) => {
    if (row.status !== 'uncertain') return row;
    const current = stock.find((value) => value.itemId === row.itemId);
    if (!current) return { ...row, status: 'error', error: 'El producto ya no está disponible. Revisa el pendiente.' };
    const requested = parseMinimum(row.draft);
    const matches = requested.valid && requested.value === current.minQty;
    return { ...row, ...current, draft: row.draft, status: matches ? 'saved' : 'error',
      error: matches ? undefined : 'El valor guardado es distinto. Revisa y reintenta el pendiente.' };
  });
}

function errorInfo(error: unknown) {
  const value = error as { status?: number; message?: string } | null;
  return { status: value?.status, message: value?.message || 'No se pudo completar el guardado.' };
}

export async function saveEditor(initial: EditorRow[], transport: EditorTransport, onProgress?: (rows: EditorRow[]) => void) {
  let rows = initial.map((row) => ({ ...row }));
  const invalid = pendingRows(rows).filter((row) => !parseMinimum(row.draft).valid);
  if (invalid.length) {
    rows = rows.map((row) => invalid.some((value) => value.itemId === row.itemId) ? { ...row, error: MINIMUM_ERROR, status: 'error' } : row);
    return { rows };
  }
  if (rows.some((row) => row.status === 'uncertain')) return { rows };
  const queue = pendingRows(rows).map((row) => row.itemId);
  rows = rows.map((row) => queue.includes(row.itemId) ? { ...row, status: 'unsent', error: undefined } : row);
  for (const id of queue) {
    const row = rows.find((value) => value.itemId === id)!;
    const parsed = parseMinimum(row.draft);
    if (!parsed.valid) continue;
    let stop = false;
    try {
      const response = await transport.patch(id, { minQty: parsed.value });
      if (response.minQty !== parsed.value || !Number.isFinite(response.criticalQty)) throw new Error('Respuesta no confirmada');
      rows = rows.map((value) => value.itemId === id ? { ...value, minQty: response.minQty, criticalQty: response.criticalQty,
        qty: response.stock ?? value.qty, alerta: response.alerta === undefined ? value.alerta : response.alerta,
        status: 'saved', error: undefined } : value);
    } catch (error) {
      const info = errorInfo(error);
      const rowFailure = info.status !== undefined && [400, 404, 409, 422].includes(info.status);
      const authFailure = info.status === 401 || info.status === 403;
      rows = rows.map((value) => value.itemId === id ? { ...value,
        status: rowFailure || authFailure ? 'error' : 'uncertain', error: info.message } : value);
      if (!rowFailure && !authFailure) {
        try { rows = reconcileEditor(rows, await transport.read()); } catch {
          rows = rows.map((value) => value.itemId === id ? { ...value, error: 'No se pudo confirmar el guardado. Comprueba el estado antes de reintentar.' } : value);
        }
      }
      stop = !rowFailure;
    }
    onProgress?.(rows);
    if (stop) break;
  }
  return { rows };
}
