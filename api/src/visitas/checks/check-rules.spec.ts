import {
  WorkOrderStatus,
  WorkOrderType,
  activeStatuses,
  isMaintenance,
  uniqueViolation,
} from '../work-order';

describe('S1-T01/T03/T11 canonical foundation', () => {
  it('only pending, assigned and in-progress CHECKs are active', () => {
    expect(activeStatuses).toEqual([
      WorkOrderStatus.PENDING,
      WorkOrderStatus.ASSIGNED,
      WorkOrderStatus.IN_PROGRESS,
    ]);
    expect(isMaintenance(WorkOrderType.CHECK)).toBe(false);
    expect(isMaintenance(WorkOrderType.PREVENTIVE)).toBe(true);
    expect(isMaintenance(WorkOrderType.CORRECTIVE)).toBe(true);
  });
  it('classifies only the exact active CHECK index and PostgreSQL code', () => {
    const constraint = 'check_un_activo_por_unidad_uidx';
    expect(
      uniqueViolation(
        { driverError: { code: '23505', constraint } },
        constraint,
      ),
    ).toBe(true);
    expect(uniqueViolation({ code: '23505', constraint }, constraint)).toBe(
      true,
    );
    expect(
      uniqueViolation(
        { code: '23505', constraint: 'another_index' },
        constraint,
      ),
    ).toBe(false);
    expect(uniqueViolation({ code: '23503', constraint }, constraint)).toBe(
      false,
    );
    expect(uniqueViolation(null, constraint)).toBe(false);
  });
});
