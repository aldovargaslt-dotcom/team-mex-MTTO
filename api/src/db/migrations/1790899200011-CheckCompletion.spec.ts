import { QueryRunner } from 'typeorm';
import { CheckCompletion1790899200011 } from './1790899200011-CheckCompletion';

describe('CheckCompletion1790899200011', () => {
  it('installs completion uniqueness and SQL immutability boundaries', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await new CheckCompletion1790899200011().up({
      query,
    } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('corrective_from_check_finding_uidx');
    expect(sql).toContain('protect_completed_check_content');
    expect(sql).toContain(
      'INSERT OR UPDATE OR DELETE ON public.check_evidence',
    );
    expect(sql).toContain('CHECK_INVALIDATION_APPEND_ONLY');
    expect(sql).toContain('check_invalidation_source_uidx');
  });
});
