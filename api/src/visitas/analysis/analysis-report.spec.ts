import { buildAnalysisReport, ReportInput } from './analysis-report';
import { AnalysisExternalService } from './analysis.entity';
import { CostOperation } from '../../inventario/entities/cost.entity';
import { MovimientoEntity } from '../../flota/entities/movimiento.entity';
import { calculateCost } from '../../inventario/cost-rules';
const money = calculateCost({
  state: 'RECORDED',
  inputTotalCents: '11600',
  currency: 'MXN',
  taxMode: 'INCLUDED',
  taxTreatment: 'TAXED',
  rateBps: 1600,
});
function fixture(): ReportInput {
  return {
    units: [
      {
        id: 'u',
        label: 'TM-01',
        plates: 'ABC',
        typeId: 't',
        typeName: 'Camión',
        facilityId: 'f',
        mappingVersion: 1,
      },
    ],
    costs: [],
    costReferences: [],
    orders: [],
    services: [],
    claims: [],
    classifications: [],
    schedules: [],
    journeys: [],
    samples: [],
    planning: { lastClosed: [], thresholds: [], alerts: [] },
    errors: [],
    from: '2026-10-12T06:00:00Z',
    to: '2026-10-19T06:00:00Z',
    requestedFrom: '2026-10-12',
    trendFrom: '2026-05-01',
    capturedAt: '2026-10-19T06:00:00Z',
    filters: {},
  };
}
function service(): AnalysisExternalService {
  return {
    id: 's',
    unitId: 'u',
    facilityId: 'f',
    version: 1,
    registeredAt: new Date('2026-10-15T12:00Z'),
    registeredBy: 'test',
    performedOn: '2026-10-15',
    providerName: 'Taller',
    maintenanceType: 'CORRECTIVE',
    data: {
      unitId: 'u',
      performedOn: '2026-10-15',
      providerName: 'Taller',
      maintenanceType: 'CORRECTIVE',
      workLines: [
        {
          id: 'w',
          system: 'D',
          workCode: 'D_REPAIR',
          workKind: 'REPAIR',
          interventionId: 's',
        },
      ],
      costLines: [
        {
          id: 'l',
          system: 'D',
          workRef: 'w',
          mode: 'SERVICE_ONLY',
          money,
          claims: [],
        },
      ],
    },
  } as AnalysisExternalService;
}
describe('maintenance report reconciliation', () => {
  it('reconciles type, system, concept and drilldown with exact net cents', () => {
    const input = fixture();
    input.services = [service()];
    const report = buildAnalysisReport(input);
    expect(report.summary.netCents).toBe('10000');
    expect(report.summary.taxCents).toBe('1600');
    expect(
      report.breakdown.type.find((x) => x.key === 'CORRECTIVE')?.netCents,
    ).toBe('10000');
    expect(report.frequencies.find((x) => x.system === 'D')?.netCents).toBe(
      '10000',
    );
    expect(report.records[0].netCents).toBe('10000');
    expect(report.summary.utilization).toBeNull();
  });
  it('filters explicitly linked costs by work kind and preserves unknown attribution', () => {
    const input = fixture();
    input.services = [service()];
    input.filters.workKinds = ['REVIEW_ADJUSTMENT'];
    const report = buildAnalysisReport(input);
    expect(report.summary.netCents).toBe('0');
    expect(report.summary.completedInterventions).toBe(0);
  });
  it('subtracts returns on their economic date without assuming recoverable tax', () => {
    const input = fixture();
    input.costs = [
      {
        id: 'return',
        unidadId: 'u',
        kind: 'RETURN',
        sourceId: 'original',
        qty: 1,
        netCents: '101',
        money: null,
        effectiveAt: new Date('2026-10-15T12:00Z'),
        version: 1,
      } as CostOperation,
    ];
    const report = buildAnalysisReport(input);
    expect(report.summary.netCents).toBe('-101');
    expect(report.summary.taxCents).toBeNull();
    expect(report.summary.fiscalUnknown).toBe(1);
  });
  it('withholds contradictory document assignments and keeps known costs partial', () => {
    const input = fixture();
    input.services = [service()];
    input.services[0].version = 2;
    input.documentAllocations = [{ lineId: 'l', groupId: 'g', lineVersion: 1 }];
    const report = buildAnalysisReport(input);
    expect(report.records[0].state).toBe('RECONCILIATION');
    expect(report.summary.reconciliationCount).toBe(1);
    expect(report.summary.totalCents).toBeNull();
  });
  it('does not present failed operational sources as zero activity', () => {
    const input = fixture();
    input.errors = ['ORDERS_SOURCE_UNAVAILABLE', 'JOURNEYS_SOURCE_UNAVAILABLE'];
    const report = buildAnalysisReport(input);
    expect(report.summary.openOrders).toBeNull();
    expect(report.summary.registeredTripSeconds).toBeNull();
    expect(report.unitRows[0].registeredTripSeconds).toBeNull();
  });
  it('rounds signed known cost/km to the nearest cent after summing the cohort', () => {
    const input = fixture();
    input.costs = [
      Object.assign(new CostOperation(), {
        id: 'part',
        unidadId: 'u',
        kind: 'RETURN',
        qty: 1,
        netCents: '101',
        money: null,
        effectiveAt: new Date('2026-10-15T12:00Z'),
        version: 1,
      }),
    ];
    input.samples = [
      Object.assign(new MovimientoEntity(), {
        unidadId: 'u',
        occurredAt: new Date(input.from),
        km: 100,
      }),
      Object.assign(new MovimientoEntity(), {
        unidadId: 'u',
        occurredAt: new Date(input.to),
        km: 103,
      }),
    ];
    const report = buildAnalysisReport(input);
    expect(report.unitRows[0].knownCostPerKmCents).toBe('-34');
    expect(report.summary.knownCostPerKmCents).toBe('-34');
  });
  it('never turns an unavailable parts source into a known zero total', () => {
    const input = fixture();
    input.errors = ['PARTS_SOURCE_UNAVAILABLE'];
    expect(buildAnalysisReport(input).summary.netCents).toBeNull();
  });
});
