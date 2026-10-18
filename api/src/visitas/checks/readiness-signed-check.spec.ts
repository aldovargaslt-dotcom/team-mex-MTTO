import { EntityManager } from 'typeorm';
import { TypeOrmSignedCheckReadAdapter } from './signed-check-read.adapter';
import { WorkOrderStatus } from '../work-order';

describe('UR-07/08 signed deadlines', () => {
  const dueAt = new Date('2026-10-18T06:00:00Z');
  async function read(now: Date, invalidated = false) {
    const find = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'check',
          unidad: { id: 'unit' },
          workOrderStatus: WorkOrderStatus.COMPLETED,
          version: 4,
        },
      ])
      .mockResolvedValueOnce([
        {
          visitaId: 'check',
          result: 'FIT',
          operationalDate: '2026-10-17',
          dayEndInstant: new Date('2026-10-24T19:00:00Z'),
          snapshotHash: 'signed',
        },
      ])
      .mockResolvedValueOnce(invalidated ? [{ checkId: 'check' }] : []);
    const rows = await new TypeOrmSignedCheckReadAdapter().readBatch(
      [{ unidadId: 'unit', operationalDate: '2026-10-22' }],
      now,
      { find } as unknown as EntityManager,
    );
    return rows.get('unit')!.lastCompleted;
  }
  it('accepts a signature within its operational day', async () => {
    expect(await read(new Date('2026-10-17T19:00:00Z'))).toMatchObject({
      valid: true,
      reason: null,
    });
  });
  it('does not allow a historical weekly deadline to bypass tomorrow’s check', async () => {
    expect(await read(new Date('2026-10-22T19:00:00Z'))).toMatchObject({
      valid: false,
      reason: 'EXPIRED',
      dayEndInstant: dueAt,
    });
  });
  it('expires exactly at dueAt and preserves historical result', async () => {
    expect(await read(dueAt)).toMatchObject({
      valid: false,
      reason: 'EXPIRED',
      result: 'FIT',
    });
  });
  it('never extends an invalidated check merely because dueAt is future', async () => {
    expect(await read(new Date('2026-10-22T19:00:00Z'), true)).toMatchObject({
      valid: false,
      reason: 'INVALIDATED',
    });
  });
});
