import { prepareCorrectiveContext } from './check-finding.rules';

describe('CHECK finding preparation', () => {
  it('inherits only source context and deduplicated evidence references', () => {
    expect(
      prepareCorrectiveContext({
        unidadId: 'u1',
        checkId: 'c1',
        findingId: 'f1',
        note: '  fuga visible  ',
        evidenceRefs: ['e1', 'e1', 'e2'],
      }),
    ).toEqual({
      status: 'PREPARED',
      unidadId: 'u1',
      sourceCheckId: 'c1',
      findingId: 'f1',
      note: 'fuga visible',
      evidenceRefs: ['e1', 'e2'],
    });
  });
});
