import { allocatedCost, calculateCost, roundRatio } from './cost-rules';
describe('Inventory exact cost rules', () => {
  it('normalizes included and excluded IVA without double taxation', () => {
    const a = calculateCost({
      state: 'RECORDED',
      inputTotalCents: '11600',
      taxMode: 'INCLUDED',
      taxTreatment: 'TAXED',
      rateBps: 1600,
    });
    const b = calculateCost({
      state: 'RECORDED',
      inputTotalCents: '10000',
      taxMode: 'EXCLUDED',
      taxTreatment: 'TAXED',
      rateBps: 1600,
    });
    expect([a?.netCents, a?.taxCents, a?.totalCents]).toEqual([
      '10000',
      '1600',
      '11600',
    ]);
    expect([b?.netCents, b?.taxCents, b?.totalCents]).toEqual([
      '10000',
      '1600',
      '11600',
    ]);
  });
  it('keeps missing costs unknown and zero explicit', () => {
    expect(calculateCost({ state: 'PENDING' })).toBeNull();
    expect(
      calculateCost({
        state: 'RECORDED',
        inputTotalCents: '0',
        taxMode: 'EXCLUDED',
        taxTreatment: 'NO_TAX',
      })?.totalCents,
    ).toBe('0');
    expect(() =>
      calculateCost({ state: 'PENDING', inputTotalCents: '0' }),
    ).toThrow();
  });
  it('rejects invalid amounts, rates, mode and currency', () => {
    for (const value of ['-1', '1.01', '1e5', '90000000000000000'])
      expect(() =>
        calculateCost({
          state: 'RECORDED',
          inputTotalCents: value,
          taxMode: 'INCLUDED',
          taxTreatment: 'TAXED',
          rateBps: 1600,
        }),
      ).toThrow();
    expect(() =>
      calculateCost({
        state: 'RECORDED',
        inputTotalCents: '100',
        taxMode: 'INCLUDED',
        taxTreatment: 'TAXED',
        rateBps: 10001,
      }),
    ).toThrow();
  });
  it('preserves cents through partial depletion and returns', () => {
    expect(allocatedCost('220000', 3, 20)).toBe('33000');
    let v = '100';
    let q = 3;
    const costs: string[] = [];
    while (q) {
      const c = allocatedCost(v, 1, q);
      costs.push(c);
      v = (BigInt(v) - BigInt(c)).toString();
      q--;
    }
    expect(costs).toEqual(['33', '34', '33']);
    expect(v).toBe('0');
    expect(allocatedCost('67', 1, 2)).toBe('34');
    expect(roundRatio(1n, 2n)).toBe(1n);
  });
});
