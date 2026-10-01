import { DataSource, EntityManager } from 'typeorm';
import { CanonicalOrdersService } from './canonical-orders.service';
import { VisitasService } from '../visitas.service';
import { CheckSource } from '../work-order';
import { TrustedActor } from '../../auth/trusted-actor';
import { ConfiguredFacilityCalendar } from './facility-calendar.port';
import { Rol } from '../../auth/roles.enum';

describe('S1-T11 constraint error translation', () => {
  const actor: TrustedActor = {
    subject: 'actor',
    displayName: 'Fixture',
    roles: [Rol.LOGISTICA],
    facilityScopes: ['mex'],
    authMode: 'TRUSTED',
    attributionLevel: 'SERVER_VERIFIED',
  };
  it.each([
    { code: '23505', constraint: 'visitas_pkey' },
    { code: '23503', constraint: 'check_un_activo_por_unidad_uidx' },
  ])('does not relabel unrelated database errors: %j', async (driverError) => {
    const error = { driverError };
    const service = new CanonicalOrdersService(
      {
        transaction: jest.fn().mockRejectedValue(error),
      } as unknown as DataSource,
      {} as VisitasService,
      new ConfiguredFacilityCalendar(),
    );
    await expect(
      service.createCheck('vehicle', CheckSource.LOGISTICS_MANUAL, actor),
    ).rejects.toBe(error);
  });
  it('returns refresh conflict without silently recreating if the race winner has already terminated', async () => {
    const transaction = jest
      .fn()
      .mockRejectedValue({
        driverError: {
          code: '23505',
          constraint: 'check_un_activo_por_unidad_uidx',
        },
      });
    const manager = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'vehicle' }),
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          facilityId: 'mex',
          facility: { timezone: 'America/Mexico_City' },
        })
        .mockResolvedValueOnce(null),
    } as unknown as EntityManager;
    const service = new CanonicalOrdersService(
      { transaction, manager } as unknown as DataSource,
      {} as VisitasService,
      new ConfiguredFacilityCalendar(),
    );
    try {
      await service.createCheck('vehicle', CheckSource.LOGISTICS_MANUAL, actor);
      throw new Error('Expected conflict');
    } catch (error) {
      expect((error as { getResponse(): unknown }).getResponse()).toMatchObject(
        { code: 'CHECK_CREATION_CONFLICT', details: { refresh: true } },
      );
    }
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
