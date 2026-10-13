import { correctPurchasePrice } from './purchase-price-correction';
import { executeMaterials, materialsSummary } from './materials-engine';
import { emptyMaterials } from './materials-model';

let sequence = 0;
const context = { actor: 'admin', reason: 'Factura corregida', now: '2026-10-12T12:00:00Z', id: () => String(++sequence), admin: true };
const items = { filter: { id: 'filter', sku: 'F', nombre: 'Filtro', uom: 'pieza', quantityScale: 0 } };
it('AC-04/11 acquisition correction explicitly reaches consumed warehouse material on another OT', () => {
  const bought = executeMaterials(emptyMaterials(), { filter: { qty: '10', knownValue: '2000', unknownQty: '0' } }, items,
    { type: 'PURCHASE', lines: [{ itemId: 'filter', purchased: '3', used: '2', received: '1', paid: '750', conversion: '1' }] }, context);
  const other = executeMaterials(emptyMaterials(), bought.balances, items, { type: 'USE', itemId: 'filter', qty: '1' }, context);
  const purchase = bought.state.purchases[0], line = purchase.lines[0];
  const corrected = correctPurchasePrice({ first: bought.state, other: other.state }, other.balances, 'first', purchase.id, line.id, '900', context);
  expect(materialsSummary(corrected.states.first).materialsCost).toBe('600');
  expect(materialsSummary(corrected.states.other).materialsCost).toBe('209.09091');
  expect(corrected.balances.filter.knownValue).toBe('2090.90909');
  expect(corrected.states.first.postings[0].cost).toBe('500');
  expect(corrected.states.other.postings[0].cost).toBe('204.545455');
  expect(corrected.states.other.audits[0].reason).toBe('Factura corregida');
  const reverted = correctPurchasePrice(corrected.states, corrected.balances, 'first', purchase.id, line.id, '750', context);
  expect(materialsSummary(reverted.states.first).materialsCost).toBe('500');
  expect(reverted.balances.filter.knownValue).toBe('2045.454545');
});
it('zero-price acquisition can be corrected without inventing a historical cost or losing residues', () => {
  const bought = executeMaterials(emptyMaterials(), { filter: { qty: '0', knownValue: '0', unknownQty: '0' } }, items,
    { type: 'PURCHASE', lines: [{ itemId: 'filter', purchased: '3', used: '1', received: '1', paid: '0', conversion: '1' }] }, context);
  const p = bought.state.purchases[0];
  const corrected = correctPurchasePrice({ first: bought.state }, bought.balances, 'first', p.id, p.lines[0].id, '1', context);
  expect(materialsSummary(corrected.states.first).materialsCost).toBe('0.333333');
  expect(Number(corrected.balances.filter.knownValue) + Number(corrected.states.first.purchases[0].lines[0].pendingValue) + Number(materialsSummary(corrected.states.first).materialsCost)).toBe(1);
});
