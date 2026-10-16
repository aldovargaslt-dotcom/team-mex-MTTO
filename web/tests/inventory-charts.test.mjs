import test from 'node:test';
import assert from 'node:assert/strict';
import { consumptionCharts, consumptionUnit, consumptionUnitTotals } from '../src/lib/inventory-charts.ts';
const row = (id, stock = 0, external = 0) => ({ itemId: id, sku: id, nombre: `Pieza ${id}`, salidaOt: stock, compraExterna: external, entrada: 0, ajuste: 0 });
const catalog = new Map([['a', { uom: 'pieza' }], ['b', { uom: 'pza' }], ['c', { uom: 'L' }]]);
const move = (id, qty, createdAt, tipo = 'SALIDA_OT') => ({ itemId: id, qty, createdAt, tipo });
const purchase = (id, qty, createdAt) => ({ itemId: id, qty, createdAt });
const build = (rows, moves, purchases, from = '2026-10-01', to = '2026-10-30') => consumptionCharts(rows, catalog, moves, purchases, from, to);

test('daily buckets include intermediate zeros and preserve source totals', () => {
  const { series: [s] } = build([row('a', 2, 3)], [move('a', 2, '2026-10-02T12:00:00Z')], [purchase('a', 3, '2026-10-04T12:00:00Z')], '2026-10-01', '2026-10-07');
  assert.equal(s.interval, 'día'); assert.equal(s.buckets.length, 7);
  assert.equal(s.buckets[0].stock, 0); assert.equal(s.buckets[1].stock, 2); assert.equal(s.buckets[3].external, 3);
});
test('weeks begin Monday, clip selected bounds and have no overlapping days', () => {
  const { series: [s] } = build([row('a', 3)], [move('a', 1, '2026-10-04T23:59:59Z'), move('a', 2, '2026-10-05T00:00:00Z')], []);
  assert.equal(s.interval, 'semana'); assert.equal(s.buckets[0].from, '2026-10-01'); assert.equal(s.buckets[0].to, '2026-10-04');
  assert.equal(s.buckets[0].stock, 1); assert.equal(s.buckets[1].stock, 2); assert.equal(s.buckets.at(-1).to, '2026-10-30');
});
test('calendar month buckets include leap day and clip partial endpoints', () => {
  const { series: [s] } = build([row('a', 1)], [move('a', 1, '2024-02-29T23:59:59Z')], [], '2024-01-15', '2024-05-02');
  assert.equal(s.interval, 'mes'); assert.equal(s.buckets[1].to, '2024-02-29'); assert.equal(s.buckets[1].stock, 1);
  assert.equal(s.buckets[0].from, '2024-01-15'); assert.equal(s.buckets.at(-1).to, '2024-05-02');
});
test('all history/open range uses observed dates and wide ranges stay bounded', () => {
  const { series: [s] } = build([row('a', 1)], [move('a', 1, '2026-10-02T12:00:00Z')], [], null, null);
  assert.equal(s.buckets.length, 1); assert.equal(s.buckets[0].from, '2026-10-02');
  const wide = build([row('a', 1)], [move('a', 1, '2026-10-02T12:00:00Z')], [], '1900-01-01', '2026-10-30').series[0];
  assert.ok(wide.buckets.length <= 25); assert.equal(wide.buckets.reduce((n,b) => n+b.stock, 0), 1);
});
test('only selected identities and consumption sources enter the charts', () => {
  const { series: [s] } = build([row('a', 2, 1)], [move('a', 2, '2026-10-02'), move('a', 99, '2026-10-02', 'ENTRADA'), move('a', 33, '2026-10-02', 'AJUSTE'), move('b', 40, '2026-10-02'), move('a', 50, '2026-09-30')], [purchase('a', 1, '2026-10-02'), purchase('b', 60, '2026-10-02')]);
  assert.equal(s.buckets.reduce((n,b) => n+b.stock, 0), 2); assert.equal(s.buckets.reduce((n,b) => n+b.external, 0), 1);
});
test('timestamp offsets use UTC day, including inclusive midnight bounds', () => {
  const { series: [s] } = build([row('a', 2)], [move('a', 2, '2026-09-30T20:00:00-06:00'), move('a', 5, '2026-10-01T00:00:00+06:00')], [], '2026-10-01', '2026-10-01');
  assert.equal(s.buckets[0].stock, 2);
});
test('incompatible units stay separate, piece aliases combine, unknown units are excluded', () => {
  const rows = [row('a', 2), row('b', 3), row('c', 100), row('unknown', 7)];
  const model = build(rows, rows.map(r => move(r.itemId, r.salidaOt, '2026-10-02')), []);
  assert.deepEqual(model.series.map(s => s.unit), ['L', 'pza']); assert.equal(model.unknownItems, 1);
  assert.equal(model.series.find(s => s.unit === 'pza').buckets.reduce((n,b) => n+b.stock,0), 5);
  assert.equal(consumptionUnit(undefined), null); assert.equal(consumptionUnit({uom:' '}), null);
  assert.deepEqual(consumptionUnitTotals(rows, catalog).map(t => [t.unit,t.stock]), [['pza',5],['L',100],[null,7]]);
});
test('ranking uses both sources, stable ties and at most ten items', () => {
  const rows = Array.from({length:12}, (_,i) => row(`x${i}`, i, i === 0 ? 100 : 0));
  const cat = new Map(rows.map(r => [r.itemId,{uom:'pieza'}]));
  const model = consumptionCharts(rows, cat, rows.map(r=>move(r.itemId,r.salidaOt,'2026-10-02')), [purchase('x0',100,'2026-10-02')], null, null);
  assert.equal(model.series[0].rows.length,10); assert.equal(model.series[0].rows[0].itemId,'x0'); assert.equal(model.series[0].rows[1].itemId,'x11');
  const ties = build([row('b',1),row('a',0,1)], [move('b',1,'2026-10-02')], [purchase('a',1,'2026-10-02')]);
  assert.deepEqual(ties.series[0].rows.map(r=>r.itemId),['a','b']);
});
test('empty period and invalid event dates do not create fabricated scales', () => {
  assert.deepEqual(build([],[],[]),{series:[],unknownItems:0});
  assert.deepEqual(build([row('a',1)],[move('a',1,'invalid')],[]),{series:[],unknownItems:0});
});
