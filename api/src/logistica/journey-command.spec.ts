import { randomUUID } from 'crypto';
import { journeyCommand } from './journey-command';

describe('EWO-038 command binding', () => {
  it('rejects obsolete unbound calls', () => {
    expect(() => journeyCommand({})).toThrow('contexto');
  });
  it('accepts dangling UUID only with explicit missing-history state and no invented revision', () => {
    const headers = {
      'idempotency-key': randomUUID(),
      'x-logistica-expected-subject': 'actor',
      'x-logistica-unit-revision': '3',
      'x-logistica-history-state': 'MISSING_ROW',
      'x-logistica-journey-ref': randomUUID(),
    };
    expect(journeyCommand(headers).journeyRevision).toBeNull();
    expect(() =>
      journeyCommand({ ...headers, 'x-logistica-history-state': 'KNOWN_OPEN' }),
    ).toThrow();
  });
});
