import { readFileSync } from 'fs';
import { join } from 'path';
import { ModuleKind, transpileModule } from 'typescript';

// Exercise the shipped browser helper with the existing compiler/Jest, no DOM runner.
function helper() {
  const source = readFileSync(join(__dirname, '../../../web/src/lib/inventario-alertas-modal.ts'), 'utf8');
  const output = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
  const exports: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  new Function('exports', output)(exports);
  return exports;
}
const row = (id: string, overrides = {}) => ({ itemId: id, nombre: id, sku: id, minQty: 8, criticalQty: 5, uom: 'pieza', qty: 10, activo: true, ...overrides });

describe('SPEC-INV-ALERT-001 browser model', () => {
  let h: ReturnType<typeof helper>;
  beforeAll(() => { h = helper(); });
  it('AC-06 calendar month UTC handles January and leap February', () => {
    expect(h.previousMonth(new Date('2026-01-01T00:01:00Z'))).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(h.previousMonth(new Date('2024-03-30T23:00:00Z'))).toMatchObject({ from: '2024-02-01', to: '2024-02-29' });
  });
  it('AC-06 aggregates gross decimal SALIDA_OT only, with inclusive boundaries and >100 records', () => {
    const period = h.previousMonth(new Date('2026-10-16T00:00:00Z'));
    const movement = (tipo: string, qty: number, createdAt: string) => ({ itemId: 'a', tipo, qty, createdAt });
    const data = Array.from({ length: 120 }, () => movement('SALIDA_OT', 0.5, '2026-09-10T12:00:00Z'));
    data.push(movement('SALIDA_OT', 2, '2026-09-01T00:00:00Z'), movement('SALIDA_OT', 3, '2026-09-30T23:59:59.999Z'), movement('AJUSTE', 99, '2026-09-10T12:00:00Z'), movement('ENTRADA', 99, '2026-09-10T12:00:00Z'), movement('SALIDA_OT', 99, '2026-10-01T00:00:00Z'), movement('SALIDA_OT', 99, '2026-08-31T23:59:59.999Z'));
    expect(h.monthlyExits(data, period).a).toBe(65);
    expect(() => h.monthlyExits([{ ...data[0], qty: 'bad' }], period)).toThrow();
  });
  it('AC-01/02/09 filter base stays confirmed and selection uses item IDs', () => {
    const state = h.createEditor([row('b'), row('a', { minQty: null }), row('c', { minQty: 0, activo: false })]);
    state[0].draft = '3';
    expect(h.visibleRows(state, '', 'SIN').map((r: any) => r.itemId)).toEqual(['a']);
    expect(h.visibleRows(state, 'C', 'CON').map((r: any) => r.itemId)).toEqual(['c']);
    const selected = h.toggleVisible(new Set(['b']), ['a', 'c'], true);
    expect([...h.toggleVisible(selected, ['a'], false)].sort()).toEqual(['b', 'c']);
    expect(h.pendingRows(state)).toHaveLength(1);
    state[0].draft = '';
    expect(h.pendingRows(state)).toHaveLength(0);
  });
  it('AC-03/04 mixed minimum batch requires unit group, removal permits mixed units and keeps selection', () => {
    const state = h.createEditor([row('a'), row('b', { uom: 'litro' }), row('c')]);
    const selected = new Set(['a', 'b', 'c']);
    expect(() => h.applyBatch(state, selected, '3')).toThrow();
    const applied = h.applyBatch(state, selected, '3', 'pieza');
    expect(applied.map((r: any) => r.draft)).toEqual(['3', '8', '3']);
    expect(h.batchPreview(state, selected, '3', 'pieza')).toMatchObject({ count: 2, replacements: 2 });
    expect(h.applyBatch(state, selected, '').every((r: any) => r.draft === '')).toBe(true);
    expect(selected.size).toBe(3);
  });
  it('AC-05/08 validates syntax, distinguishes null/zero and only previews critical clamp', () => {
    for (const value of ['-1', '1.5', 'abc', '1e2', 'Infinity']) expect(h.parseMinimum(value).valid).toBe(false);
    expect(h.parseMinimum('')).toEqual({ valid: true, value: null });
    expect(h.parseMinimum('0')).toEqual({ valid: true, value: 0 });
    expect(h.criticalNotice({ ...row('a'), draft: '3' })).toContain('5 a 3');
    expect(h.criticalNotice({ ...row('a'), draft: '' })).toBeNull();
  });
  it('AC-05 validates every pending including hidden before any write', async () => {
    const state = h.createEditor([row('a'), row('b')]); state[0].draft = '3'; state[1].draft = '-1';
    const patch = jest.fn();
    const result = await h.saveEditor(state, { patch, read: jest.fn() });
    expect(patch).not.toHaveBeenCalled(); expect(result.rows[1].error).toBeTruthy();
  });
  it('AC-10 continues row errors, confirms successes and retries only failures, sending minQty only', async () => {
    const state = h.createEditor([row('a'), row('b'), row('c')]).map((r: any) => ({ ...r, draft: '3' }));
    const patch = jest.fn(async (id, body) => { if (id === 'b') throw { status: 400, message: 'Fila inválida' }; return { minQty: body.minQty, criticalQty: 3 }; });
    const result = await h.saveEditor(state, { patch, read: jest.fn() });
    expect(result.rows.map((r: any) => r.status)).toEqual(['saved', 'error', 'saved']);
    expect(patch.mock.calls.map((c) => c[1])).toEqual([{ minQty: 3 }, { minQty: 3 }, { minQty: 3 }]);
    const retry = jest.fn(async (_id: string) => ({ minQty: 3, criticalQty: 3 }));
    const done = await h.saveEditor(result.rows, { patch: retry, read: jest.fn() });
    expect(retry.mock.calls).toHaveLength(1); expect(retry.mock.calls[0][0]).toBe('b');
    expect(h.pendingRows(done.rows)).toHaveLength(0);
  });
  it('AC-10 auth failure stops, preserves non-sent drafts', async () => {
    const state = h.createEditor([row('a'), row('b')]).map((r: any) => ({ ...r, draft: '3' }));
    const patch = jest.fn(async () => { throw { status: 401, message: 'Sesión vencida' }; });
    const result = await h.saveEditor(state, { patch, read: jest.fn() });
    expect(patch).toHaveBeenCalledTimes(1); expect(result.rows[1].status).toBe('unsent');
    expect(h.pendingRows(result.rows)).toHaveLength(2);
  });
  it('AC-11 lost response reconciles before retry, never repeats confirmed write', async () => {
    const state = h.createEditor([row('a'), row('b')]).map((r: any) => ({ ...r, draft: '3' }));
    const patch = jest.fn(async () => { throw new Error('network'); });
    const read = jest.fn(async () => [row('a', { minQty: 3, criticalQty: 2 }), row('b')]);
    const result = await h.saveEditor(state, { patch, read });
    expect(patch).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledTimes(1);
    expect(result.rows[0]).toMatchObject({ minQty: 3, criticalQty: 2, status: 'saved' });
    expect(result.rows[1].status).toBe('unsent');
  });
  it('AC-11 failed reconciliation prevents blind retry and retains drafts; checking resolves mismatch', async () => {
    const state = h.createEditor([row('a')]).map((r: any) => ({ ...r, draft: '3' }));
    const patch = jest.fn(async () => { throw new Error('network'); });
    const result = await h.saveEditor(state, { patch, read: async () => { throw new Error('offline'); } });
    expect(result.rows[0].status).toBe('uncertain');
    await h.saveEditor(result.rows, { patch, read: jest.fn() });
    expect(patch).toHaveBeenCalledTimes(1);
    const reconciled = h.reconcileEditor(result.rows, [row('a', { minQty: 7, criticalQty: 4 })]);
    expect(reconciled[0]).toMatchObject({ minQty: 7, criticalQty: 4, draft: '3', status: 'error' });
  });
});
