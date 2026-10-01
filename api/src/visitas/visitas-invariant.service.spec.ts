import { DataSource } from 'typeorm';
import { VisitasInvariantService } from './visitas-invariant.service';

describe('S1-T07 migration-aware bootstrap', () => {
  it('fails closed on missing constraints instead of reinstalling the retired global index', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new VisitasInvariantService({
      query,
      options: { synchronize: false },
    } as unknown as DataSource);
    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      /FOUNDATION/,
    );
    expect(
      query.mock.calls.every(([sql]) => !String(sql).includes('CREATE')),
    ).toBe(true);
  });
});
