import { detectImageMime, evidenceReadiness } from './check-evidence.rules';

describe('CHECK evidence rules', () => {
  it('requires at least two READY items and union coverage', () => {
    expect(
      evidenceReadiness([{ tags: ['ODOMETER', 'FUEL', 'WITNESSES'] }]).ready,
    ).toBe(false);
    expect(
      evidenceReadiness([
        { tags: ['ODOMETER'] },
        { tags: ['FUEL', 'WITNESSES'] },
      ]).ready,
    ).toBe(true);
    expect(
      evidenceReadiness([{ tags: ['ODOMETER'] }, { tags: ['FUEL'] }]).ready,
    ).toBe(false);
  });
  it('accepts five but never treats six as ready', () => {
    const base = [{ tags: ['ODOMETER', 'FUEL', 'WITNESSES'] }];
    expect(
      evidenceReadiness([
        ...base,
        ...Array.from({ length: 4 }, () => ({ tags: [] })),
      ]).ready,
    ).toBe(true);
    expect(
      evidenceReadiness([
        ...base,
        ...Array.from({ length: 5 }, () => ({ tags: [] })),
      ]).ready,
    ).toBe(false);
  });
  it('detects image content instead of trusting a header', () => {
    expect(
      detectImageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe('image/png');
    expect(detectImageMime(Buffer.from('not-an-image'))).toBeNull();
  });
});
