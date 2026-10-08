import { signedCheckSummary } from './signed-check-summary';

describe('signed CHECK public summary', () => {
  it('preserves signed values without exporting VIN or private object locations', () => {
    const snapshot = {
      unit: {
        id: 'unit',
        numeroInterno: 'U-1',
        placas: 'PL-1',
        vin: 'private-vin',
        marcaModelo: null,
      },
      condition: {
        payload: {
          fluids: { oil: { status: 'ANOMALY' } },
          tires: [{ position: 'FL', psi: 18 }],
        },
      },
      findings: [{ id: 'finding', classification: 'REQUIRES_WORK' }],
      disposition: { result: 'UNFIT' },
      evidence: [
        {
          id: 'photo',
          tags: ['ODOMETER'],
          bytes: 42,
          sha256: 'hash',
          mimeType: 'image/png',
          objectKey: 'private/key',
          objectVersionId: 'private-version',
        },
      ],
    };
    const summary = signedCheckSummary(snapshot)!;
    expect(summary.condition).toEqual(snapshot.condition);
    expect(summary.findings).toEqual(snapshot.findings);
    expect(summary.disposition).toEqual({ result: 'UNFIT' });
    expect(summary.unit).not.toHaveProperty('vin');
    expect(summary.evidence[0]).not.toHaveProperty('objectKey');
    expect(summary.evidence[0]).not.toHaveProperty('objectVersionId');
    expect(snapshot.evidence[0].objectKey).toBe('private/key');
  });
  it('does not manufacture a summary when the signed snapshot is absent', () => {
    expect(signedCheckSummary(null)).toBeNull();
  });
});
