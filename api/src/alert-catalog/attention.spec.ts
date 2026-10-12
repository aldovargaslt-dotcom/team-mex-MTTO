import { comparePriorities } from './attention.types';

describe('Preview por condición — AC-05', () => {
  it('cuenta cierres, nuevas y cambios sin confundir consulta con cierre', () => {
    const before = new Map<string, 'WARNING' | 'CRITICAL'>([
      ['a', 'WARNING'],
      ['b', 'CRITICAL'],
    ]);
    const after = new Map<string, 'WARNING' | 'CRITICAL'>([
      ['a', 'CRITICAL'],
      ['c', 'WARNING'],
    ]);
    expect(comparePriorities(before, after)).toEqual({
      before: 2,
      after: 2,
      opened: 1,
      closed: 1,
      priorityChanged: 1,
    });
    expect(before.get('a')).toBe('WARNING');
  });
});
