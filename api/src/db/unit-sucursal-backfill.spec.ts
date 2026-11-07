import { parseBackfillArgs } from './unit-sucursal-backfill';

describe('parseBackfillArgs (EWO-068)', () => {
  it('requires the facility: there is no built-in default', () => {
    expect(() => parseBackfillArgs([])).toThrow('--facility');
    expect(() => parseBackfillArgs(['--apply'])).toThrow('--facility');
    expect(() => parseBackfillArgs(['--facility='])).toThrow('--facility');
  });
  it('is a dry run unless --apply is given', () => {
    expect(parseBackfillArgs(['--facility=monterrey'])).toEqual({
      facilityId: 'monterrey',
      apply: false,
    });
    expect(parseBackfillArgs(['--facility=monterrey', '--apply'])).toEqual({
      facilityId: 'monterrey',
      apply: true,
    });
  });
  it('rejects unknown arguments instead of ignoring them', () => {
    expect(() =>
      parseBackfillArgs(['--facility=monterrey', '--force']),
    ).toThrow('no reconocido');
  });
});
