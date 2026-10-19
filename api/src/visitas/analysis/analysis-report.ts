import type { AnalysisUnit } from '../../kernel/analysis-scope.service';
import type { CostOperation } from '../../inventario/entities/cost.entity';
import { allocatedCost, roundRatio } from '../../inventario/cost-rules';
import type { LogisticaJourney } from '../../logistica/journey.entity';
import type { MovimientoEntity } from '../../flota/entities/movimiento.entity';
import type { OrderFact } from './order-facts-read.port';
import type {
  AnalysisClassification,
  AnalysisDocumentAllocation,
  AnalysisCostClaim,
  AnalysisExternalService,
  AnalysisSchedule,
} from './analysis.entity';
import {
  aggregateMoney,
  localMidnight,
  normalizeWork,
  scheduledSeconds,
  SYSTEMS,
  unionSeconds,
  WorkKind,
} from './analysis-rules';
import { operationalDay } from '../checks/facility-calendar';

export type CostRecord = {
  id: string;
  sourceId: string;
  sourceVersion: number;
  unitId: string;
  unitLabel: string;
  orderId: string | null;
  serviceId: string | null;
  date: string;
  concept: 'PARTS' | 'EXTERNAL_SERVICE';
  maintenanceType: string;
  system: string | null;
  label: string;
  netCents: string | null;
  taxCents: string | null;
  sign: number;
  workKind: WorkKind;
  state: 'KNOWN' | 'PENDING' | 'RECONCILIATION';
  includedByService: boolean;
};
export type Intervention = {
  id: string;
  sourceId: string;
  unitId: string;
  unitLabel: string;
  date: string;
  system: string | null;
  workKind: WorkKind;
  maintenanceType: string;
  label: string;
  km: number | null;
  orderId: string | null;
  serviceId: string | null;
};
export type PlanningFact = {
  lastClosed: { unidadId: string; km: number; cerradoAt: Date }[];
  thresholds: { tipoVehiculoId: string; tKm: number; tDias: number }[];
  alerts: { unidadId: string; estado: string }[];
};
export type ReportInput = {
  units: AnalysisUnit[];
  costs: CostOperation[];
  costReferences: CostOperation[];
  orders: OrderFact[];
  services: AnalysisExternalService[];
  documentAllocations?: AnalysisDocumentAllocation[];
  claims: AnalysisCostClaim[];
  classifications: AnalysisClassification[];
  schedules: AnalysisSchedule[];
  journeys: LogisticaJourney[];
  samples: MovimientoEntity[];
  planning: PlanningFact;
  errors: string[];
  from: string;
  to: string;
  requestedFrom: string;
  trendFrom: string;
  capturedAt: string;
  filters: {
    systems?: string[];
    maintenanceTypes?: string[];
    workKinds?: string[];
  };
};
const signedRatio = (amount: bigint, denominator: number) =>
  (amount < 0n
    ? -roundRatio(-amount, BigInt(denominator))
    : roundRatio(amount, BigInt(denominator))
  ).toString();
const dateOf = (v: Date | string) =>
  operationalDay(new Date(v)).operationalDate;
const uniq = <T>(rows: T[], key: (row: T) => string) => [
  ...new Map(rows.map((x) => [key(x), x])).values(),
];
const inDays = (day: string, from: string, to: string) =>
  day >= dateOf(from) && localMidnight(day).getTime() < new Date(to).getTime();

export function buildAnalysisReport(input: ReportInput) {
  const unitById = new Map(input.units.map((x) => [x.id, x])),
    orderById = new Map(input.orders.map((x) => [x.id, x]));
  const sources = uniq([...input.costs, ...input.costReferences], (x) => x.id);
  const invalidSourceIds = new Set<string>(),
    invalidLineIds = new Set<string>();
  for (const claim of input.claims) {
    const op = sources.find((x) => x.id === claim.sourceOpId);
    if (
      !op ||
      op.version !== claim.sourceVersion ||
      op.kind !== 'EXTERNAL' ||
      op.unidadId !== claim.unitId ||
      claim.to > op.qty ||
      claim.from < 0
    ) {
      invalidSourceIds.add(claim.sourceOpId);
      invalidLineIds.add(claim.serviceLineId);
    }
  }
  const records: CostRecord[] = [];
  for (const op of input.costs) {
    const unit = unitById.get(op.unidadId ?? '');
    if (!unit) continue;
    const order = orderById.get(op.visitaId ?? '');
    const parent =
      op.kind === 'RETURN'
        ? sources.find((x) => x.id === op.sourceId)
        : undefined;
    const classification = input.classifications
      .filter((x) => x.sourceOpId === (parent?.id ?? op.id))
      .sort((a, b) => b.revision - a.revision)[0];
    const classificationValid =
      classification &&
      classification.sourceVersion === (parent?.version ?? op.version);
    const system =
      classificationValid && typeof classification.data.system === 'string'
        ? classification.data.system
        : null;
    const claims = input.claims.filter((x) => x.sourceOpId === op.id),
      includedQty = claims.reduce((n, c) => n + c.to - c.from, 0);
    if (includedQty > op.qty) {
      invalidSourceIds.add(op.id);
      claims.forEach((x) => invalidLineIds.add(x.serviceLineId));
    }
    const invalidClaim = invalidSourceIds.has(op.id);
    const fullyIncluded =
      !invalidClaim &&
      op.kind === 'EXTERNAL' &&
      includedQty === op.qty &&
      op.qty > 0;
    let net = op.netCents,
      tax = op.money?.taxCents ?? null;
    if (fullyIncluded) {
      net = '0';
      tax = '0';
    } else if (includedQty && !invalidClaim) {
      if (net !== null)
        net = (
          BigInt(net) - BigInt(allocatedCost(net, includedQty, op.qty))
        ).toString();
      if (tax !== null)
        tax = (
          BigInt(tax) - BigInt(allocatedCost(tax, includedQty, op.qty))
        ).toString();
    }
    if (invalidClaim) {
      net = null;
      tax = null;
    }
    records.push({
      id: `part:${op.id}`,
      sourceId: op.id,
      sourceVersion: op.version,
      unitId: unit.id,
      unitLabel: unit.label,
      orderId: op.visitaId,
      serviceId: null,
      date: dateOf(op.effectiveAt),
      concept: 'PARTS',
      maintenanceType:
        order && ['PREVENTIVE', 'CORRECTIVE'].includes(order.maintenanceType)
          ? order.maintenanceType
          : 'UNKNOWN',
      system: includedQty && !fullyIncluded ? null : system,
      label:
        op.kind === 'RETURN'
          ? 'Retorno de refacción'
          : fullyIncluded
            ? 'Refacción incluida en servicio externo'
            : 'Consumo de refacción',
      netCents: net,
      taxCents: tax,
      sign: op.kind === 'RETURN' ? -1 : 1,
      workKind: 'UNSPECIFIED',
      state: invalidClaim
        ? 'RECONCILIATION'
        : net === null
          ? 'PENDING'
          : 'KNOWN',
      includedByService: fullyIncluded,
    });
  }
  for (const service of input.services)
    for (const line of service.data.costLines) {
      const unit = unitById.get(service.unitId);
      if (!unit) continue;
      const allocation = input.documentAllocations?.find(
        (x) => x.lineId === line.id,
      );
      const invalid =
        invalidLineIds.has(line.id) ||
        Boolean(
          allocation &&
          allocation.lineVersion !== service.version &&
          allocation.lineVersion !==
            (line as unknown as { financialVersion?: number }).financialVersion,
        );
      records.push({
        id: `service:${line.id}`,
        sourceId: service.id,
        sourceVersion: service.version,
        unitId: unit.id,
        unitLabel: unit.label,
        orderId: service.data.orderId ?? null,
        serviceId: service.id,
        date: service.performedOn,
        concept: 'EXTERNAL_SERVICE',
        maintenanceType: service.maintenanceType,
        system: line.system,
        label: service.providerName,
        netCents: invalid ? null : (line.money?.netCents ?? null),
        taxCents: invalid ? null : (line.money?.taxCents ?? null),
        sign: 1,
        workKind:
          service.data.workLines.find((x) => x.id === line.workRef)?.workKind ??
          'UNSPECIFIED',
        state: invalid ? 'RECONCILIATION' : line.money ? 'KNOWN' : 'PENDING',
        includedByService: false,
      });
    }
  const matches = (row: {
    system: string | null;
    maintenanceType: string;
    workKind?: WorkKind;
  }) =>
    (!input.filters.workKinds ||
      !row.workKind ||
      input.filters.workKinds.includes(row.workKind)) &&
    (!input.filters.systems ||
      input.filters.systems.includes(row.system ?? 'UNKNOWN')) &&
    (!input.filters.maintenanceTypes ||
      input.filters.maintenanceTypes.includes(row.maintenanceType));
  const selectedRecords = records.filter(
    (x) => matches(x) && inDays(x.date, input.from, input.to),
  );
  const money = aggregateMoney(selectedRecords);
  const pendingPartsCount = selectedRecords.filter(
    (x) => x.state === 'PENDING' && x.concept === 'PARTS',
  ).length;
  const pendingServicesCount = new Set(
    selectedRecords
      .filter((x) => x.state === 'PENDING' && x.concept === 'EXTERNAL_SERVICE')
      .map((x) => x.sourceId),
  ).size;
  const reconciliationCount = selectedRecords.filter(
    (x) => x.state === 'RECONCILIATION',
  ).length;
  const costUnavailable = input.errors.includes('PARTS_SOURCE_UNAVAILABLE');
  const netKnown =
    costUnavailable && !selectedRecords.some((x) => x.netCents !== null)
      ? null
      : money.netCents;
  const interventions: Intervention[] = [];
  for (const order of input.orders) {
    if (
      !order.completedAt ||
      !['PREVENTIVE', 'CORRECTIVE'].includes(order.maintenanceType) ||
      order.status !== 'COMPLETED'
    )
      continue;
    const unit = unitById.get(order.unitId);
    if (!unit) continue;
    for (const work of order.works) {
      const normalized = normalizeWork(work.categoria, work.item);
      const linked = input.services
        .flatMap((x) => x.data.workLines)
        .find((x) => x.orderWorkRef === work.id);
      interventions.push({
        id: order.id,
        sourceId: work.id,
        unitId: unit.id,
        unitLabel: unit.label,
        date: dateOf(order.completedAt),
        system: normalized.system,
        workKind: linked?.workKind ?? normalized.kind,
        maintenanceType: order.maintenanceType,
        label: normalized.label,
        km: order.km,
        orderId: order.id,
        serviceId: null,
      });
    }
  }
  for (const service of input.services)
    for (const work of service.data.workLines) {
      if (work.orderWorkRef) continue;
      const unit = unitById.get(service.unitId);
      if (!unit) continue;
      interventions.push({
        id: work.interventionId,
        sourceId: work.id,
        unitId: unit.id,
        unitLabel: unit.label,
        date: service.performedOn,
        system: work.system,
        workKind: work.workKind,
        maintenanceType: service.maintenanceType,
        label: work.workCode,
        km: null,
        orderId: service.data.orderId ?? null,
        serviceId: service.id,
      });
    }
  const workMatches = (x: Intervention) =>
    matches(x) &&
    (!input.filters.workKinds || input.filters.workKinds.includes(x.workKind));
  const selectedInterventions = interventions.filter(
    (x) => workMatches(x) && inDays(x.date, input.from, input.to),
  );
  const frequencies = Object.entries(SYSTEMS).map(([system, label]) => ({
    system,
    label,
    count: uniq(
      selectedInterventions.filter((x) => x.system === system),
      (x) => `${x.id}:${x.system}`,
    ).length,
    ...aggregateMoney(selectedRecords.filter((x) => x.system === system)),
  }));
  const monthly: {
    month: string;
    label: string;
    partial: boolean;
    partsCents: string;
    servicesCents: string;
    preventiveCents: string;
    correctiveCents: string;
    unclassifiedCents: string;
    pending: number;
  }[] = [];
  const currentMonth = dateOf(new Date(new Date(input.to).getTime() - 1)).slice(
    0,
    7,
  );
  for (let i = 0; i < 6; i++) {
    const d = new Date(`${input.trendFrom}T12:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    const month = d.toISOString().slice(0, 7),
      rows = records.filter(
        (x) =>
          matches(x) &&
          x.date.startsWith(month) &&
          localMidnight(x.date) < new Date(input.to),
      );
    monthly.push({
      month,
      label: new Intl.DateTimeFormat('es-MX', {
        month: 'short',
        timeZone: 'UTC',
      }).format(d),
      partial:
        month === currentMonth &&
        new Date(input.to).getTime() <
          localMidnight(
            `${new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)}`,
          ).getTime(),
      partsCents: aggregateMoney(rows.filter((x) => x.concept === 'PARTS'))
        .netCents,
      servicesCents: aggregateMoney(
        rows.filter((x) => x.concept === 'EXTERNAL_SERVICE'),
      ).netCents,
      preventiveCents: aggregateMoney(
        rows.filter((x) => x.maintenanceType === 'PREVENTIVE'),
      ).netCents,
      correctiveCents: aggregateMoney(
        rows.filter((x) => x.maintenanceType === 'CORRECTIVE'),
      ).netCents,
      unclassifiedCents: aggregateMoney(
        rows.filter((x) => x.maintenanceType === 'UNKNOWN'),
      ).netCents,
      pending: rows.filter((x) => x.netCents === null).length,
    });
  }
  const fromMs = new Date(input.from).getTime(),
    toMs = new Date(input.to).getTime();
  const unitRows = input.units
    .map((unit) => {
      const costs = selectedRecords.filter((x) => x.unitId === unit.id),
        total = aggregateMoney(costs);
      const relevantTrips = input.journeys.filter(
        (x) => x.unidadId === unit.id,
      );
      const intervals = relevantTrips
        .filter((x) => x.departedEffectiveAt)
        .map((x): [number, number] => [
          Math.max(fromMs, new Date(x.departedEffectiveAt!).getTime()),
          Math.min(
            toMs,
            x.returnedEffectiveAt
              ? new Date(x.returnedEffectiveAt).getTime()
              : toMs,
          ),
        ]);
      const registeredTripSeconds = unionSeconds(intervals);
      const rules = input.schedules.filter(
        (x) =>
          x.facilityId === unit.facilityId &&
          (x.scope === 'GENERAL' ||
            (x.scope === 'UNIT' && x.scopeRef === unit.id) ||
            (x.scope === 'TYPE' && x.scopeRef === unit.typeId)),
      );
      let expectedSeconds: number | null = null;
      // No eligibility or historical type ledger exists: keep percentages unavailable.
      // General/unit schedules can explain known expected time without proving operation.
      const generalOrUnit = rules.filter((x) => x.scope !== 'TYPE');
      const boundaries = [
        ...new Set([
          fromMs,
          toMs,
          ...generalOrUnit
            .flatMap((x) => [
              x.validFrom.getTime(),
              x.validTo?.getTime() ?? toMs,
            ])
            .filter((x) => x > fromMs && x < toMs),
        ]),
      ].sort((a, b) => a - b);
      let scheduled = 0,
        scheduleKnown = 0;
      for (let i = 0; i < boundaries.length - 1; i++) {
        const a = boundaries[i],
          b = boundaries[i + 1];
        const rule = generalOrUnit
          .filter(
            (x) =>
              x.validFrom.getTime() <= a &&
              (!x.validTo || x.validTo.getTime() >= b),
          )
          .sort(
            (x, y) => Number(y.scope === 'UNIT') - Number(x.scope === 'UNIT'),
          )[0];
        if (rule) {
          scheduleKnown += (b - a) / 1000;
          scheduled += scheduledSeconds(rule.data, new Date(a), new Date(b));
        }
      }
      if (scheduleKnown === (toMs - fromMs) / 1000) expectedSeconds = scheduled;
      const samples = input.samples
        .filter(
          (x) =>
            x.unidadId === unit.id &&
            new Date(x.occurredAt).getTime() >= fromMs &&
            new Date(x.occurredAt).getTime() <= toMs,
        )
        .sort(
          (a, b) =>
            new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
        );
      const first = samples[0],
        last = samples[samples.length - 1];
      const distanceKm =
        first &&
        last &&
        first !== last &&
        new Date(first.occurredAt).getTime() === fromMs &&
        new Date(last.occurredAt).getTime() === toMs &&
        samples.every((x, i) => i === 0 || x.km >= samples[i - 1].km) &&
        last.km > first.km
          ? last.km - first.km
          : null;
      const latest = input.samples
        .filter((x) => x.unidadId === unit.id)
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )[0];
      const lastMaintenance = input.planning.lastClosed.find(
          (x) => x.unidadId === unit.id,
        ),
        threshold = input.planning.thresholds.find(
          (x) => x.tipoVehiculoId === unit.typeId,
        );
      const remainingKm =
        latest &&
        lastMaintenance &&
        threshold &&
        latest.km >= lastMaintenance.km
          ? threshold.tKm - (latest.km - lastMaintenance.km)
          : null;
      const remainingDays =
        lastMaintenance && threshold
          ? threshold.tDias -
            Math.max(
              0,
              Math.floor(
                (new Date(input.capturedAt).getTime() -
                  new Date(lastMaintenance.cerradoAt).getTime()) /
                  86400000,
              ),
            )
          : null;
      const alert = input.planning.alerts.some((x) => x.unidadId === unit.id);
      const correctiveCount = uniq(
        selectedInterventions.filter(
          (x) => x.unitId === unit.id && x.maintenanceType === 'CORRECTIVE',
        ),
        (x) => x.id,
      ).length;
      const incomplete =
        costs.some((x) => x.netCents === null) || costUnavailable;
      return {
        ...unit,
        ...total,
        netCents:
          costUnavailable && !costs.some((x) => x.netCents !== null)
            ? null
            : total.netCents,
        partial: incomplete,
        correctiveCount,
        registeredTripSeconds: input.errors.includes(
          'JOURNEYS_SOURCE_UNAVAILABLE',
        )
          ? null
          : registeredTripSeconds,
        expectedSeconds,
        unclassifiedSeconds: Math.max(
          0,
          (toMs - fromMs) / 1000 - registeredTripSeconds,
        ),
        maintenanceDowntimeSeconds: null,
        otherHeldSeconds: null,
        availableUnusedSeconds: null,
        utilization: null,
        utilizationReason: 'MISSING_DOWNTIME_AND_ELIGIBILITY_HISTORY',
        distanceKm,
        knownCostPerKmCents: distanceKm
          ? signedRatio(BigInt(total.netCents), distanceKm)
          : null,
        costPerKmPartial: incomplete,
        remainingKm,
        remainingDays,
        planningAsOf: input.capturedAt,
        attention:
          alert ||
          (remainingKm !== null && remainingKm < 0) ||
          (remainingDays !== null && remainingDays < 0)
            ? 'Mantenimiento vencido'
            : incomplete
              ? 'Costo pendiente o en conciliación'
              : correctiveCount > 1
                ? 'Intervenciones repetidas'
                : 'Sin excepción registrada',
      };
    })
    .sort((a, b) =>
      BigInt(b.netCents ?? '0') > BigInt(a.netCents ?? '0')
        ? 1
        : BigInt(b.netCents ?? '0') < BigInt(a.netCents ?? '0')
          ? -1
          : a.id.localeCompare(b.id),
    );
  const openOrders = input.orders.filter(
    (x) =>
      ['PREVENTIVE', 'CORRECTIVE'].includes(x.maintenanceType) &&
      x.openedAt &&
      new Date(x.openedAt).getTime() < toMs &&
      (!x.completedAt || new Date(x.completedAt).getTime() >= toMs) &&
      (!x.cancelledAt || new Date(x.cancelledAt).getTime() >= toMs) &&
      ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(
        x.status,
      ),
  );
  const comparable = unitRows.filter(
      (x) => x.distanceKm !== null && x.netCents !== null,
    ),
    comparableKm = comparable.reduce((n, x) => n + x.distanceKm!, 0);
  const comparableCost = comparable.reduce(
    (n, x) => n + BigInt(x.netCents!),
    0n,
  );
  const pairs: {
    unitId: string;
    system: string | null;
    workKind: WorkKind;
    previous: string;
    current: string;
    distanceKm: number;
  }[] = [];
  const ordered = uniq(
    interventions.filter(
      (x) =>
        workMatches(x) &&
        x.km !== null &&
        ['REPAIR', 'REPLACEMENT'].includes(x.workKind),
    ),
    (x) => `${x.id}:${x.system}:${x.workKind}`,
  ).sort((a, b) => a.date.localeCompare(b.date));
  const previous = new Map<string, Intervention>();
  for (const event of ordered) {
    const key = `${event.unitId}:${event.system}:${event.workKind}`,
      p = previous.get(key);
    if (p && event.km! > p.km! && inDays(event.date, input.from, input.to))
      pairs.push({
        unitId: event.unitId,
        system: event.system,
        workKind: event.workKind,
        previous: p.date,
        current: event.date,
        distanceKm: event.km! - p.km!,
      });
    previous.set(key, event);
  }
  return {
    summary: {
      ...money,
      netCents: netKnown,
      pendingPartsCount,
      pendingServicesCount,
      reconciliationCount,
      openOrders: input.errors.includes('ORDERS_SOURCE_UNAVAILABLE')
        ? null
        : openOrders.length,
      registeredTripSeconds: input.errors.includes(
        'JOURNEYS_SOURCE_UNAVAILABLE',
      )
        ? null
        : unitRows.reduce((n, x) => n + (x.registeredTripSeconds ?? 0), 0),
      utilization: null,
      utilizationReason: 'MISSING_DOWNTIME_AND_ELIGIBILITY_HISTORY',
      knownCostPerKmCents: comparableKm
        ? signedRatio(comparableCost, comparableKm)
        : null,
      comparableDistanceKm: comparableKm,
      excludedUnitCount: unitRows.length - comparable.length,
      costPerKmPartial: comparable.some((x) => x.partial),
      completedInterventions: uniq(selectedInterventions, (x) => x.id).length,
    },
    unitRows,
    monthly,
    frequencies,
    records: selectedRecords,
    interventions: uniq(
      selectedInterventions,
      (x) => `${x.id}:${x.system}:${x.workKind}`,
    ),
    pairs,
    breakdown: {
      type: ['PREVENTIVE', 'CORRECTIVE', 'UNKNOWN'].map((type) => ({
        key: type,
        ...aggregateMoney(
          selectedRecords.filter((x) => x.maintenanceType === type),
        ),
      })),
      concept: ['PARTS', 'EXTERNAL_SERVICE'].map((concept) => ({
        key: concept,
        ...aggregateMoney(selectedRecords.filter((x) => x.concept === concept)),
      })),
    },
    coverage: {
      pendingPartsCount,
      pendingServicesCount,
      reconciliationCount,
      fiscalUnknownCount: money.fiscalUnknown,
      unclassifiedCount: selectedRecords.filter(
        (x) => x.maintenanceType === 'UNKNOWN',
      ).length,
      undistributedCount: selectedRecords.filter((x) => x.system === null)
        .length,
      temporal: 'INCOMPLETE',
      missingSources: [
        'DOWNTIME_LEDGER',
        'ADMINISTRATIVE_ELIGIBILITY_HISTORY',
        'FACILITY_TYPE_HISTORY',
      ],
      errors: input.errors,
      excludedUnits: unitRows
        .filter((x) => x.distanceKm === null)
        .map((x) => ({
          id: x.id,
          reason: 'MISSING_PERIOD_ODOMETER_BOUNDARIES',
        })),
    },
    periods: {
      selected: { from: input.from, to: input.to },
      monthly: {
        from: localMidnight(input.trendFrom).toISOString(),
        to: input.to,
      },
      planning: { asOf: input.capturedAt, currentFacts: true },
    },
  };
}
export type AnalysisReport = ReturnType<typeof buildAnalysisReport>;
