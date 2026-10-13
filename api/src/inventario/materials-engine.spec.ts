import { executeMaterials, materialsSummary } from './materials-engine';
import { decimal, formatDecimal, proportion } from './cost-decimal';
import { Balance, emptyMaterials, MaterialCommand, MaterialItem, MaterialState } from './materials-model';

const items: Record<string, MaterialItem> = {
  filter: { id: 'filter', nombre: 'Filtro', sku: 'F1', uom: 'pieza', quantityScale: 0 },
  oil: { id: 'oil', nombre: 'Aceite', sku: 'O1', uom: 'L', quantityScale: 3 },
};
let counter = 0;
const context = { actor: 'operator', now: '2026-10-12T12:00:00Z', id: () => String(++counter), admin: false };
function run(command: MaterialCommand, state = emptyMaterials(), balances: Record<string, Balance> = { filter: { qty: '10', knownValue: '2000', unknownQty: '0' }, oil: { qty: '0', knownValue: '0', unknownQty: '0' } }, admin = false) {
  return executeMaterials(state, balances, items, command, { ...context, admin });
}
const purchase = (itemId = 'filter', purchased = '3', used = '2', paid = '750', received = '1', conversion = '1'): MaterialCommand =>
  ({ type: 'PURCHASE', lines: [{ itemId, purchased, used, paid, received, conversion }] });

describe('SPEC-INV-OT-001 exact material posting rules', () => {
  it('AC-01/03/04 warehouse valuation and direct price stay separate and frozen', () => {
    const first = run(purchase());
    expect(materialsSummary(first.state).materialsCost).toBe('500');
    expect(first.balances.filter).toMatchObject({ qty: '11', knownValue: '2250', unknownQty: '0' });
    const issued = run({ type: 'USE', itemId: 'filter', qty: '1' }, first.state, first.balances);
    expect(issued.state.postings[issued.state.postings.length - 1]?.cost).toBe('204.545455');
    const later = run(purchase('filter', '1', '0', '1000', '1'), issued.state, issued.balances);
    expect(later.state.postings[0].cost).toBe('500');
    expect(issued.balances.filter.knownValue).toBe('2045.454545');
  });
  it('AC-05 package conversion and final residue reconcile exactly', () => {
    const result = run(purchase('filter', '1', '2', '2000', '8', '10'));
    expect(materialsSummary(result.state).materialsCost).toBe('400');
    expect(result.balances.filter.knownValue).toBe('3600');
    expect(() => run(purchase('filter', '1', '2', '2000', '8', '0'))).toThrow();
  });
  it.each(['-1', '4', 'NaN', '', undefined])('AC-06 rejects invalid or omitted used quantity %s atomically', used => {
    const initial = emptyMaterials();
    const command = purchase() as Extract<MaterialCommand, { type: 'PURCHASE' }>;
    command.lines[0].used = used as string;
    expect(() => run(command, initial)).toThrow();
    expect(initial).toEqual(emptyMaterials());
  });
  it('AC-06/07/17 zero use is valid and pending destinations remain outside stock', () => {
    const first = run(purchase('filter', '3', '0', '750', '0'));
    expect(first.balances.filter.qty).toBe('10');
    expect(materialsSummary(first.state).materialsCost).toBe('0');
    expect(materialsSummary(first.state).pendingDestinations).toHaveLength(1);
    const p = first.state.purchases[0], line = p.lines[0];
    const lost = run({ type: 'DESTINATION', purchaseId: p.id, lineId: line.id, source: 'PENDING', destination: 'LOSS', qty: '3', reason: 'Envase roto' }, first.state, first.balances);
    expect(materialsSummary(lost.state).pendingDestinations).toEqual([]);
    expect(materialsSummary(lost.state).lossCost).toBe('750');
    expect(lost.balances.filter.qty).toBe('10');
  });
  it('AC-09 direct return reverses its original cost without warehouse receipt', () => {
    const first = run(purchase()), p = first.state.purchases[0];
    const returned = run({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, source: 'USED', destination: 'SUPPLIER', qty: '1', settlement: 'REFUND_PENDING' }, first.state, first.balances);
    expect(materialsSummary(returned.state).materialsCost).toBe('250');
    expect(returned.balances.filter).toEqual(first.balances.filter);
    expect(() => run({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, source: 'USED', destination: 'SUPPLIER', qty: '2' }, returned.state, returned.balances)).toThrow();
  });
  it('AC-10 warehouse return uses current valuation and keeps refund separate', () => {
    const first = run(purchase()), p = first.state.purchases[0];
    const returned = run({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, source: 'WAREHOUSE', destination: 'SUPPLIER', qty: '1', settlement: 'REFUNDED' }, first.state, first.balances);
    expect(returned.balances.filter).toMatchObject({ qty: '10', knownValue: '2045.454545', unknownQty: '0' });
    expect(materialsSummary(returned.state).materialsCost).toBe('500');
  });
  it('AC-11/14 correction requires administrator/reason and physical stock, keeps originals', () => {
    const first = run({ type: 'USE', itemId: 'filter', qty: '2' });
    const command: MaterialCommand = { type: 'CORRECT_USE', postingId: first.state.postings[0].id, replacementQty: '1', destination: 'WAREHOUSE', reason: 'Sólo se instaló uno; otro regresó físicamente' };
    expect(() => run(command, first.state, first.balances)).toThrow('Administrador');
    const corrected = run(command, first.state, first.balances, true);
    expect(corrected.balances.filter.qty).toBe('9');
    expect(materialsSummary(corrected.state).materialsCost).toBe('200');
    expect(corrected.state.postings[0]).toEqual(first.state.postings[0]);
    expect(corrected.state.audits[0].actor).toBe('operator');
    expect(() => run({ ...command, replacementQty: '20' }, first.state, first.balances, true)).toThrow('insuficientes');
    expect(first.balances.filter.qty).toBe('8');
  });
  it('AC-13 insufficient stock fails without mutating input', () => {
    const first = run({ type: 'USE', itemId: 'filter', qty: '8' });
    expect(() => run({ type: 'USE', itemId: 'filter', qty: '3' }, first.state, first.balances)).toThrow('insuficientes');
    expect(first.balances.filter.qty).toBe('2');
  });
  it('AC-15/21 unknown legacy cost remains incomplete, completion is audited and original frozen', () => {
    const stocks = { filter: { qty: '10', knownValue: '0', unknownQty: '10' } };
    const first = run({ type: 'USE', itemId: 'filter', qty: '2' }, emptyMaterials(), stocks);
    expect(materialsSummary(first.state)).toMatchObject({ complete: false, materialsCost: null });
    const completed = run({ type: 'COMPLETE_COST', postingId: first.state.postings[0].id, unitCost: '200', reason: 'Costo de apertura verificado' }, first.state, first.balances, true);
    expect(materialsSummary(completed.state)).toMatchObject({ complete: true, materialsCost: '400' });
    expect(completed.state.postings[0].cost).toBeNull();
    expect(completed.state.audits).toHaveLength(1);
    const valued = run({ type: 'VALUE_STOCK', itemId: 'filter', unitCost: '200', reason: 'Apertura de stock' }, completed.state, completed.balances, true);
    expect(valued.balances.filter).toMatchObject({ qty: '8', knownValue: '1600', unknownQty: '0' });
  });
  it('AC-16 multiple item lines share one purchase and pending receipt', () => {
    const result = run({ type: 'PURCHASE', lines: [
      { itemId: 'filter', purchased: '3', used: '2', received: '1', paid: '750', conversion: '1' },
      { itemId: 'oil', purchased: '5', used: '4.5', received: '0.5', paid: '500', conversion: '1' },
    ] });
    expect(result.state.purchases).toHaveLength(1);
    expect(result.state.purchases[0].receiptKey).toBeNull();
    expect(materialsSummary(result.state).materialsCost).toBe('950');
  });
  it('AC-22/23/24 fractional liters include taxes and support sub-unit consumption', () => {
    const first = run(purchase('oil', '5', '4.5', '500', '0.5'));
    expect(materialsSummary(first.state).materialsCost).toBe('450');
    expect(first.balances.oil).toMatchObject({ qty: '0.5', knownValue: '50', unknownQty: '0' });
    const used = run({ type: 'USE', itemId: 'oil', qty: '0.25' }, first.state, first.balances);
    expect(used.balances.oil).toMatchObject({ qty: '0.25', knownValue: '25', unknownQty: '0' });
    expect(() => run({ type: 'USE', itemId: 'filter', qty: '0.25' })).toThrow('decimales');
    expect(() => run({ type: 'USE', itemId: 'oil', qty: '0.0001' }, first.state, first.balances)).toThrow('decimales');
  });
  it('rounding residues exhaust once and conserve all purchased value', () => {
    const first = run(purchase('filter', '3', '1', '1', '0'));
    const p = first.state.purchases[0];
    const second = run({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, source: 'PENDING', destination: 'WAREHOUSE', qty: '2' }, first.state, first.balances);
    expect(second.state.postings[0].knownCost).toBe('0.333333');
    expect(second.state.postings[1].knownCost).toBe('0.666667');
    expect(decimal(second.state.postings[0].knownCost) + decimal(second.state.postings[1].knownCost)).toBe(decimal('1'));
    expect(formatDecimal(proportion(decimal('1'), decimal('3'), decimal('3')))).toBe('1');
  });
  it('AC-09/10 replacement tracking is documentary until a linked physical receipt, with no new purchase expense', () => {
    const first = run(purchase()), p = first.state.purchases[0];
    const returned = run({ type: 'DESTINATION', purchaseId: p.id, lineId: p.lines[0].id, source: 'USED', destination: 'SUPPLIER', qty: '1', settlement: 'REPLACEMENT_PENDING' }, first.state, first.balances);
    const original = returned.state.postings.find(p => p.kind === 'SUPPLIER_RETURN')!;
    const status = run({ type: 'SETTLEMENT', returnId: original.id, status: 'REPLACED', reason: 'Proveedor confirmó reemplazo' }, returned.state, returned.balances);
    expect(status.balances).toEqual(returned.balances);
    const received = run({ type: 'REPLACEMENT_RECEIPT', returnId: original.id, qty: '1', reason: 'Recepción física verificada' }, status.state, status.balances);
    expect(received.balances.filter).toMatchObject({ qty: '12', knownValue: '2500' });
    expect(materialsSummary(received.state).materialsCost).toBe('250');
    expect(received.state.purchases).toHaveLength(1);
    expect(() => run({ type: 'REPLACEMENT_RECEIPT', returnId: original.id, qty: '1', reason: 'Duplicada' }, received.state, received.balances)).toThrow('supera');
  });
  it('AC-11/21 unvalued material reclassified as loss stays incomplete until its own audited completion', () => {
    const original = run({ type: 'USE', itemId: 'filter', qty: '1' }, emptyMaterials(), { filter: { qty: '1', knownValue: '0', unknownQty: '1' } });
    const loss = run({ type: 'CORRECT_USE', postingId: original.state.postings[0].id, replacementQty: '0', destination: 'LOSS', reason: 'Pérdida física' }, original.state, original.balances, true);
    expect(materialsSummary(loss.state)).toMatchObject({ materialsCost: '0', lossCost: null });
    const lossPosting = loss.state.postings.find(p => p.kind === 'LOSS')!;
    const completed = run({ type: 'COMPLETE_COST', postingId: lossPosting.id, unitCost: '200', reason: 'Costo confirmado' }, loss.state, loss.balances, true);
    expect(materialsSummary(completed.state)).toMatchObject({ materialsCost: '0', lossCost: '200' });
  });
});
