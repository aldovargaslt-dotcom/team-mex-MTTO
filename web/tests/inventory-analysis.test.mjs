import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYSIS_PATH, analysisRange, analysisReturn, analysisUrl, legacyAnalysisUrl,
  matchesAnalysis, movementType, periodRange,
} from '../src/lib/inventory-analysis.ts';

const now = new Date('2026-03-01T12:00:00Z');
const params = (value = '') => new URLSearchParams(value);
const parse = (href) => new URL(href, 'https://inventory.local').searchParams;

test('30-day default includes month and year boundaries without changing the UTC day', () => {
  assert.deepEqual(periodRange('30D', now), { from: '2026-01-31', to: '2026-03-01' });
  assert.deepEqual(periodRange('7D', new Date('2026-01-02T00:30:00Z')), { from: '2025-12-27', to: '2026-01-02' });
  assert.deepEqual(analysisRange(params(), now), { period: '30D', from: '2026-01-31', to: '2026-03-01', error: null });
});
test('all history has no date bounds; this month begins on day one', () => {
  assert.deepEqual(periodRange('TODO', now), { from: null, to: null });
  assert.deepEqual(periodRange('MES', now), { from: '2026-03-01', to: '2026-03-01' });
});
test('explicit dates remain fixed even when a saved preset is opened later', () => {
  const result = analysisRange(params('periodo=30D&from=2025-02-01&to=2025-03-02'), now);
  assert.equal(result.from, '2025-02-01'); assert.equal(result.to, '2025-03-02');
  assert.equal(result.period, '30D'); assert.equal(result.error, null);
});
test('custom rejects an empty, reversed or nonexistent date range', () => {
  for (const query of ['periodo=CUSTOM', 'from=2026-03-02&to=2026-03-01', 'from=2026-02-30', 'to=not-a-date']) {
    assert.ok(analysisRange(params(query), now).error, query);
  }
});
test('legacy one-sided ranges remain valid and do not gain an implicit bound', () => {
  const result = analysisRange(params('from=2026-02-01'), now);
  assert.equal(result.period, 'CUSTOM'); assert.equal(result.to, null); assert.equal(result.error, null);
});
test('legacy movement URLs keep exact item/type/query and the unbounded default', () => {
  const result = parse(legacyAnalysisUrl('movimientos', params('item=abc&tipo=AJUSTE&q=conteo')));
  assert.equal(result.get('vista'), 'movimientos'); assert.equal(result.get('periodo'), 'TODO');
  assert.equal(result.get('item'), 'abc'); assert.equal(result.get('tipo'), 'AJUSTE'); assert.equal(result.get('q'), 'conteo');
});
test('legacy consumption keeps its preset and default consumption remains 30 days', () => {
  assert.equal(parse(legacyAnalysisUrl('consumo', params('periodo=90D'))).get('periodo'), '90D');
  assert.equal(analysisRange(parse(legacyAnalysisUrl('consumo', params())), now).period, '30D');
});
test('legacy movement dates are preserved rather than replaced by all history', () => {
  const result = parse(legacyAnalysisUrl('movimientos', params('from=2026-02-01&to=2026-02-02')));
  assert.equal(result.get('from'), '2026-02-01'); assert.equal(result.get('periodo'), null);
});
test('switching views preserves shared filters while a movement type is view-specific', () => {
  const initial = params('q=Filtro&categoria=f1&periodo=90D&item=part&tipo=ENTRADA');
  const result = parse(analysisUrl(initial, { vista: 'movimientos' }));
  for (const key of ['q', 'categoria', 'periodo', 'item']) assert.equal(result.get(key), initial.get(key));
  assert.equal(movementType(result.get('tipo')), 'ENTRADA');
  assert.equal(movementType('TODOS'), null);
});
test('drilldown return encodes the original summary without losing filters or dates', () => {
  const initial = params('q=Filtro&categoria=f1&periodo=30D&from=2026-01-31&to=2026-03-01');
  const origin = analysisUrl(initial);
  const target = analysisUrl(initial, { vista: 'movimientos', item: 'part', tipo: 'SALIDA_OT', resumen: origin });
  assert.equal(analysisReturn(parse(target).get('resumen')), origin);
  assert.equal(parse(target).get('tipo'), 'SALIDA_OT');
  assert.equal(parse(origin).get('item'), null);
});
test('return paths reject external URLs, protocol-relative URLs and sibling paths', () => {
  for (const href of ['https://evil.test', '//evil.test/inventario/analisis', '/inventario/analisis-other', '/inventario/analisis/../stock']) {
    assert.equal(analysisReturn(href), null, href);
  }
  assert.equal(analysisReturn(ANALYSIS_PATH), ANALYSIS_PATH);
  assert.equal(analysisReturn(`${ANALYSIS_PATH}?q=Filtro`), `${ANALYSIS_PATH}?q=Filtro`);
});
test('canonical query order gives summary returns the same scroll-restoration key', () => {
  assert.equal(analysisUrl(params('q=Filtro&periodo=30D')), analysisUrl(params('periodo=30D&q=Filtro')));
});
test('removing a specific item does not discard common filters', () => {
  const result = parse(analysisUrl(params('item=part&q=filtro&categoria=f1'), { item: null }));
  assert.equal(result.get('item'), null); assert.equal(result.get('categoria'), 'f1'); assert.equal(result.get('q'), 'filtro');
});
const row = { itemId: 'part', nombre: 'Filtro de aceite', sku: 'FIL-01', nota: 'Conteo físico' };
const catalog = new Map([['part', { id: 'part', familiaId: 'f1', oem: 'OEM-321' }]]);
test('identity search combines category, exact item and OEM', () => {
  assert.equal(matchesAnalysis(row, catalog, 'oem-321', 'f1', 'part'), true);
  assert.equal(matchesAnalysis(row, catalog, 'Filtro', 'f2', null), false);
  assert.equal(matchesAnalysis(row, catalog, 'Filtro', '', 'another'), false);
});
test('catalog failure still permits basic name/SKU search but cannot assert category matches', () => {
  assert.equal(matchesAnalysis(row, new Map(), 'fil-01', '', null), true);
  assert.equal(matchesAnalysis(row, new Map(), '', 'f1', null), false);
});
test('note search remains available only for movement records', () => {
  assert.equal(matchesAnalysis(row, catalog, 'conteo', '', null, true), true);
  assert.equal(matchesAnalysis(row, catalog, 'conteo', '', null), false);
});
