import type { ItemInventario, TipoMovimiento } from './types';

export const ANALYSIS_PATH = '/inventario/analisis';
export const ANALYSIS_PERIODS = [
  { id: 'HOY', label: 'Hoy' },
  { id: '7D', label: 'Últimos 7 días' },
  { id: '30D', label: 'Últimos 30 días' },
  { id: '90D', label: 'Últimos 90 días' },
  { id: 'MES', label: 'Este mes' },
  { id: 'TODO', label: 'Todo el historial' },
  { id: 'CUSTOM', label: 'Personalizado' },
] as const;
export type AnalysisPeriod = (typeof ANALYSIS_PERIODS)[number]['id'];
export type AnalysisView = 'consumo' | 'movimientos';
export type AnalysisRange = { from: string | null; to: string | null };
export const MOVEMENT_TYPES = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'ENTRADA', label: 'Entradas' },
  { id: 'SALIDA_OT', label: 'Salidas a órdenes' },
  { id: 'AJUSTE', label: 'Ajustes' },
] as const;
export const validItemId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function movementType(value: string | null): TipoMovimiento | null {
  return value === 'ENTRADA' || value === 'SALIDA_OT' || value === 'AJUSTE' ? value : null;
}
export function periodRange(period: AnalysisPeriod, now = new Date()): AnalysisRange {
  if (period === 'TODO') return { from: null, to: null };
  const to = now.toISOString().slice(0, 10);
  if (period === 'MES') return { from: `${to.slice(0, 7)}-01`, to };
  const days = period === '7D' ? 6 : period === '30D' ? 29 : period === '90D' ? 89 : 0;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  return { from: start.toISOString().slice(0, 10), to };
}
export function analysisRange(params: URLSearchParams, now = new Date()) {
  const raw = params.get('periodo');
  const hasDates = params.has('from') || params.has('to');
  const period: AnalysisPeriod = raw === 'CUSTOM' || (hasDates && !raw) ? 'CUSTOM'
    : ANALYSIS_PERIODS.some((p) => p.id === raw) ? raw as AnalysisPeriod : '30D';
  const range = hasDates || period === 'CUSTOM' ? { from: params.get('from') || null, to: params.get('to') || null } : periodRange(period, now);
  const validDate = (value: string | null) => value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
  const error = !validDate(range.from) || !validDate(range.to) ? 'Revisa las fechas del periodo.'
    : range.from && range.to && range.from > range.to ? 'La fecha Desde debe ser anterior o igual a Hasta.'
    : period === 'CUSTOM' && !range.from && !range.to ? 'Selecciona al menos una fecha para consultar.' : null;
  return { period, ...range, error };
}
export function analysisUrl(params: URLSearchParams, patch: Record<string, string | null> = {}) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') next.delete(key); else next.set(key, value);
  }
  next.sort();
  const query = next.toString();
  return `${ANALYSIS_PATH}${query ? `?${query}` : ''}`;
}
/** Accept only the local analysis path, never an external or protocol-relative return. */
export function analysisReturn(value: string | null): string | null {
  if (!value || !value.startsWith(`${ANALYSIS_PATH}?`) && value !== ANALYSIS_PATH) return null;
  try {
    const parsed = new URL(value, 'https://inventory.local');
    return parsed.origin === 'https://inventory.local' && parsed.pathname === ANALYSIS_PATH ? `${parsed.pathname}${parsed.search}` : null;
  } catch { return null; }
}
export function legacyAnalysisUrl(view: AnalysisView, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.set('vista', view);
  if (view === 'movimientos' && !next.has('periodo') && !next.has('from') && !next.has('to')) next.set('periodo', 'TODO');
  return analysisUrl(next);
}
export type AnalysisIdentity = { itemId: string; nombre: string; sku: string; nota?: string | null };
export function matchesAnalysis(row: AnalysisIdentity, catalog: ReadonlyMap<string, ItemInventario>, q: string, category: string, item: string | null, includeNotes = false) {
  if (item && row.itemId !== item) return false;
  const info = catalog.get(row.itemId);
  if (category && info?.familiaId !== category) return false;
  const text = [row.nombre, row.sku, info?.oem ?? '', includeNotes ? row.nota ?? '' : ''].join(' ').toLocaleLowerCase('es');
  return text.includes(q.trim().toLocaleLowerCase('es'));
}
export function rememberAnalysisPosition(href: string) {
  try { sessionStorage.setItem(`inventory-analysis:${href}`, String(window.scrollY)); } catch { /* navigation works without browser storage */ }
}
