import { TypeOrmPhysicalStateReadAdapter } from './physical-state.adapter';
import { TipoMovimientoFlota } from './enums';

describe('TypeOrmPhysicalStateReadAdapter', () => {
  it('fails closed when Flota has no initialized state', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    await expect(
      new TypeOrmPhysicalStateReadAdapter().read('u1', manager as never),
    ).resolves.toEqual({
      physicalKnowledge: 'UNINITIALIZED',
      physicalState: null,
    });
  });

  it('maps the latest patio movement to EN_PATIO', async () => {
    const occurredAt = new Date('2026-10-02T12:00:00Z');
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ updatedAt: occurredAt })
        .mockResolvedValueOnce({
          tipo: TipoMovimientoFlota.ENTRADA,
          occurredAt,
        })
        .mockResolvedValueOnce(null),
    };
    await expect(
      new TypeOrmPhysicalStateReadAdapter().read('u1', manager as never),
    ).resolves.toMatchObject({
      physicalKnowledge: 'KNOWN',
      physicalState: 'EN_PATIO',
      observedAt: occurredAt,
    });
  });
});
