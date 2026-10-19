import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { EntityManager, In } from 'typeorm';
import { TrustedActor } from '../../auth/trusted-actor';
import { Rol } from '../../auth/roles.enum';
import { InventoryMaintenanceCostReadPort } from '../../inventario/maintenance-cost-read.port';
import { LogisticsAnalysisJourneyReadPort } from '../../logistica/analysis-journey-read.port';
import { FleetAnalysisEvidenceReadPort } from '../../flota/analysis-evidence-read.port';
import { AndonAnalysisPlanningReadPort } from '../../andon/analysis-planning-read.port';
import { MaintenanceAnalysisService, analysisHash } from './analysis.service';
import { MaintenanceOrderFactsReadPort } from './order-facts-read.port';
import {
  AnalysisCostLine,
  AnalysisDocumentAllocation,
  AnalysisCapture,
  AnalysisClassification,
  AnalysisCostClaim,
  AnalysisExternalService,
  AnalysisInvalidation,
  AnalysisProjectionFact,
  AnalysisSchedule,
  AnalysisSnapshot,
} from './analysis.entity';
import {
  buildQueryPeriod,
  invalid,
  localMidnight,
  object,
  shiftDate,
  uuid,
} from './analysis-rules';
import { operationalDay } from '../checks/facility-calendar';
import { buildAnalysisReport, AnalysisReport } from './analysis-report';
import type { ScopeFilters } from '../../kernel/analysis-scope.service';

type SnapshotResult = {
  report: AnalysisReport;
  sourceVector: Record<string, unknown>;
  query: Record<string, unknown>;
  period: ReturnType<typeof buildQueryPeriod>;
  capturedAt: string;
};
@Injectable()
export class MaintenanceAnalysisReportService {
  private readonly cursorSecret: Buffer;
  constructor(
    private readonly core: MaintenanceAnalysisService,
    private readonly costs: InventoryMaintenanceCostReadPort,
    private readonly orders: MaintenanceOrderFactsReadPort,
    private readonly journeys: LogisticsAnalysisJourneyReadPort,
    private readonly fleet: FleetAnalysisEvidenceReadPort,
    private readonly planning: AndonAnalysisPlanningReadPort,
  ) {
    this.cursorSecret = core.signingKey('maintenance-analysis-cursor');
  }
  private filters(input: unknown) {
    const b = object(input, [
      'from',
      'to',
      'unitIds',
      'facilityIds',
      'unitTypeIds',
      'systems',
      'maintenanceTypes',
      'workKinds',
      'breakdown',
      'sort',
      'direction',
    ]);
    for (const key of [
      'unitIds',
      'facilityIds',
      'unitTypeIds',
      'systems',
      'maintenanceTypes',
      'workKinds',
    ])
      if (
        b[key] !== undefined &&
        (!Array.isArray(b[key]) ||
          (b[key] as unknown[]).length > 100 ||
          (b[key] as unknown[]).some((x) => typeof x !== 'string'))
      )
        invalid('Filtro inválido.');
    for (const [key, allowed] of [
      ['systems', ['A', 'B', 'C', 'D', 'E', 'UNKNOWN']],
      ['maintenanceTypes', ['PREVENTIVE', 'CORRECTIVE', 'UNKNOWN']],
      [
        'workKinds',
        ['REVIEW_ADJUSTMENT', 'REPAIR', 'REPLACEMENT', 'UNSPECIFIED'],
      ],
    ] as const)
      if (
        (b[key] as string[] | undefined)?.some(
          (x) => !(allowed as readonly string[]).includes(x),
        )
      )
        invalid('Categoría de filtro inválida.');
    if (
      b.sort !== undefined &&
      !['COST', 'UNIT', 'CORRECTIVE', 'TRIP'].includes(String(b.sort))
    )
      invalid('Ordenación inválida.');
    if (
      b.direction !== undefined &&
      !['ASC', 'DESC'].includes(String(b.direction))
    )
      invalid('Dirección inválida.');
    if (
      b.breakdown !== undefined &&
      !['TYPE', 'CONCEPT', 'SYSTEM'].includes(String(b.breakdown))
    )
      invalid('Desglose inválido.');
    return b as ScopeFilters & {
      from?: string;
      to?: string;
      systems?: string[];
      maintenanceTypes?: string[];
      workKinds?: string[];
      sort?: string;
      direction?: string;
      breakdown?: string;
    };
  }
  async options(actor: TrustedActor) {
    await this.core.ready(actor);
    return this.core.db.transaction('REPEATABLE READ', async (m) => ({
      units: await this.core.scope.units(m, actor),
      facilities: actor.facilityScopes,
      catalogue: await this.core.activeCatalogue(actor, m),
      capabilities: {
        configureSchedules: actor.roles.includes(Rol.ADMIN_DIRECTIVO),
        correctCosts: actor.roles.includes(Rol.ADMIN_DIRECTIVO),
        externalServices:
          process.env.MAINTENANCE_ANALYSIS_WRITE_ENABLED === 'true',
        schedules: process.env.MAINTENANCE_ANALYSIS_SCHEDULE_ENABLED === 'true',
        downtimeHistory: false,
        eligibilityHistory: false,
        stopLinks: false,
      },
    }));
  }
  async create(actor: TrustedActor, input: unknown) {
    await this.core.ready(actor);
    const filters = this.filters(input),
      now = new Date(),
      localToday = operationalDay(now).operationalDate;
    const weekday = new Date(`${localToday}T12:00Z`).getUTCDay() || 7,
      initialFrom = shiftDate(localToday, 1 - weekday);
    const period = buildQueryPeriod(
      filters.from ?? initialFrom,
      filters.to ?? shiftDate(initialFrom, 7),
      now,
    );
    const cutDay = operationalDay(
      new Date(new Date(period.to).getTime() - 1),
    ).operationalDate;
    const trend = new Date(`${cutDay.slice(0, 7)}-01T12:00Z`);
    trend.setUTCMonth(trend.getUTCMonth() - 5);
    const trendFrom = trend.toISOString().slice(0, 10),
      sourceFrom = new Date(
        Math.min(
          new Date(period.from).getTime(),
          localMidnight(trendFrom).getTime(),
        ),
      );
    const snapshot = await this.core.db.transaction(
      'REPEATABLE READ',
      async (m) => {
        await m.query("SET LOCAL statement_timeout='30s'");
        const units = await this.core.scope.units(m, actor, filters),
          unitIds = units.map((x) => x.id),
          errors: string[] = [];
        const optional = async <T>(
          name: string,
          fallback: T,
          read: () => Promise<T>,
        ): Promise<T> => {
          await m.query(`SAVEPOINT analysis_${name}`);
          try {
            const value = await read();
            await m.query(`RELEASE SAVEPOINT analysis_${name}`);
            return value;
          } catch (e) {
            await m.query(`ROLLBACK TO SAVEPOINT analysis_${name}`);
            await m.query(`RELEASE SAVEPOINT analysis_${name}`);
            if (e instanceof UnprocessableEntityException) throw e;
            errors.push(`${name.toUpperCase()}_SOURCE_UNAVAILABLE`);
            return fallback;
          }
        };
        const parts = await optional('parts', [], () =>
          this.costs.read(m, actor, unitIds, sourceFrom, new Date(period.to)),
        );
        const orders = await optional('orders', [], () =>
          this.orders.read(m, actor, unitIds),
        );
        const logistics = await optional(
          'journeys',
          { journeys: [], captures: [] },
          () =>
            this.journeys.read(
              m,
              actor,
              unitIds,
              sourceFrom,
              new Date(period.to),
            ),
        );
        const evidence = await optional(
          'fleet',
          { samples: [], physicalEvents: [] },
          () =>
            this.fleet.read(m, actor, unitIds, sourceFrom, new Date(period.to)),
        );
        const planning = await optional(
          'planning',
          { lastClosed: [], thresholds: [], alerts: [] },
          () => this.planning.read(m, actor, units),
        );
        const services = unitIds.length
          ? await m.find(AnalysisExternalService, {
              where: {
                unitId: In(unitIds),
                facilityId: In(actor.facilityScopes),
              },
              take: 100001,
            })
          : [];
        const claims = unitIds.length
          ? await m.find(AnalysisCostClaim, {
              where: { unitId: In(unitIds) },
              take: 100001,
            })
          : [];
        const classifications = unitIds.length
          ? await m.find(AnalysisClassification, {
              where: { unitId: In(unitIds) },
              take: 100001,
            })
          : [];
        const schedules = await m.find(AnalysisSchedule, {
          where: { facilityId: In(actor.facilityScopes) },
          take: 100001,
        });
        if (
          [services, claims, classifications, schedules].some(
            (x) => x.length > 100000,
          )
        )
          throw new UnprocessableEntityException({
            code: 'QUERY_TOO_LARGE',
            message: 'Reduzca el alcance de la consulta.',
            details: {},
          });
        const ids = [
          ...new Set([
            ...claims.map((x) => x.sourceOpId),
            ...parts
              .filter((x) => x.kind === 'RETURN' && x.sourceId)
              .map((x) => x.sourceId!),
          ]),
        ];
        const references: Awaited<
          ReturnType<InventoryMaintenanceCostReadPort['references']>
        > = [];
        for (let i = 0; i < ids.length; i += 1000)
          references.push(
            ...(await optional('partrefs', [], () =>
              this.costs.references(m, actor, ids.slice(i, i + 1000)),
            )),
          );
        const serviceLines = services.length
          ? await m.find(AnalysisCostLine, {
              where: { serviceId: In(services.map((x) => x.id)) },
            })
          : [];
        const documentAllocations = serviceLines.length
          ? await m.find(AnalysisDocumentAllocation, {
              where: { lineId: In(serviceLines.map((x) => x.id)) },
            })
          : [];
        for (const service of services)
          for (const line of service.data.costLines)
            Object.assign(line, {
              financialVersion: serviceLines.find((x) => x.id === line.id)
                ?.version,
            });
        const report = buildAnalysisReport({
          documentAllocations,
          units,
          costs: parts,
          costReferences: references,
          orders,
          services,
          claims,
          classifications,
          schedules,
          journeys: logistics.journeys,
          samples: evidence.samples,
          planning,
          errors,
          from: period.from,
          to: period.to,
          requestedFrom: period.requestedFrom,
          trendFrom,
          capturedAt: now.toISOString(),
          filters,
        });
        const direction = filters.direction === 'ASC' ? 1 : -1;
        if (filters.sort)
          report.unitRows.sort((a, b) =>
            filters.sort === 'UNIT'
              ? direction * a.label.localeCompare(b.label)
              : filters.sort === 'CORRECTIVE'
                ? direction * (a.correctiveCount - b.correctiveCount) ||
                  a.id.localeCompare(b.id)
                : filters.sort === 'TRIP'
                  ? direction *
                      ((a.registeredTripSeconds ?? 0) -
                        (b.registeredTripSeconds ?? 0)) ||
                    a.id.localeCompare(b.id)
                  : direction *
                    (BigInt(a.netCents ?? '0') > BigInt(b.netCents ?? '0')
                      ? 1
                      : BigInt(a.netCents ?? '0') < BigInt(b.netCents ?? '0')
                        ? -1
                        : a.id.localeCompare(b.id)),
          );
        const sourceVector = {
          costs: analysisHash(parts),
          orders: analysisHash(orders),
          services: analysisHash(
            services.map((x) => ({ id: x.id, version: x.version })),
          ),
          claims: analysisHash(claims),
          classifications: analysisHash(classifications),
          schedules: analysisHash(schedules),
          journeys: analysisHash(logistics),
          fleet: analysisHash(evidence),
          planning: analysisHash(planning),
          missingSources: report.coverage.missingSources,
          errors,
          capturedAt: now.toISOString(),
        };
        const captureId = randomUUID();
        await m.insert(AnalysisCapture, {
          id: captureId,
          sourceVector,
          status: 'PARTIAL',
          completedAt: now,
        });
        for (let i = 0; i < parts.length; i += 250) {
          const facts = parts
            .slice(i, i + 250)
            .map((row) => ({
              owner: 'INVENTORY',
              sourceRef: row.id,
              sourceVersion: String(row.version),
              unitId: row.unidadId!,
              facilityId: units.find((x) => x.id === row.unidadId)!.facilityId,
              integrityHash: analysisHash(row),
              data: JSON.parse(JSON.stringify(row)) as Record<string, unknown>,
            }));
          await m
            .createQueryBuilder()
            .insert()
            .into(AnalysisProjectionFact)
            .values(facts)
            .orIgnore()
            .execute();
        }
        const result: SnapshotResult = {
          report,
          sourceVector: { ...sourceVector, captureId },
          query: filters,
          period,
          capturedAt: now.toISOString(),
        };
        return m.save(AnalysisSnapshot, {
          id: randomUUID(),
          subject: actor.subject,
          facilities: [...new Set(units.map((x) => x.facilityId))],
          unitMapping: Object.fromEntries(
            units.map((x) => [x.id, `${x.facilityId}:${x.mappingVersion}`]),
          ),
          queryHash: analysisHash(filters),
          result: result as unknown as Record<string, unknown>,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 900000),
        });
      },
    );
    return this.envelope(snapshot);
  }
  private envelope(snapshot: AnalysisSnapshot) {
    const data = snapshot.result as unknown as SnapshotResult;
    return {
      snapshotId: snapshot.id,
      expiresAt: snapshot.expiresAt,
      calculationVersion: 'AN-MTTO-v1',
      capturedAt: data.capturedAt,
      period: data.period,
      query: data.query,
      scope: {
        unitIds: Object.keys(snapshot.unitMapping),
        facilityIds: snapshot.facilities,
      },
      status: 'PARTIAL',
      coverage: data.report.coverage,
      sourceVector: data.sourceVector,
      currency: 'MXN',
    };
  }
  private async snapshot(actor: TrustedActor, id: string, m: EntityManager) {
    uuid(id);
    const row = await m.findOneBy(AnalysisSnapshot, {
      id,
      subject: actor.subject,
    });
    if (!row || !row.facilities.every((x) => actor.facilityScopes.includes(x)))
      throw new NotFoundException('Consulta no disponible.');
    const units = await this.core.scope.assertUnits(
      m,
      actor,
      Object.keys(row.unitMapping),
    );
    if (
      units.some(
        (x) => row.unitMapping[x.id] !== `${x.facilityId}:${x.mappingVersion}`,
      )
    )
      throw new ConflictException({
        code: 'SNAPSHOT_SCOPE_CHANGED',
        message: 'El alcance de una unidad cambió. Actualice la consulta.',
        details: {},
      });
    if (row.expiresAt.getTime() <= Date.now())
      throw new ConflictException({
        code: 'SNAPSHOT_EXPIRED',
        message: 'La consulta expiró. Actualice conservando los filtros.',
        details: {},
      });
    return row;
  }
  async view(actor: TrustedActor, id: string, view: string) {
    await this.core.ready(actor);
    return this.core.db.transaction(async (m) => {
      const row = await this.snapshot(actor, id, m),
        data = row.result as unknown as SnapshotResult,
        report = data.report;
      const invalidations = row.facilities.length
        ? await m
            .createQueryBuilder(AnalysisInvalidation, 'i')
            .where('i.facility_ref IN (:...facilities)', {
              facilities: row.facilities,
            })
            .andWhere('i.created_at > :at', { at: row.createdAt })
            .getCount()
        : 0;
      const base = {
        ...this.envelope(row),
        refreshPending: invalidations > 0,
        summary: report.summary,
        periods: report.periods,
        units: report.unitRows.slice(0, 100),
        unitsTotal: report.unitRows.length,
      };
      if (view === 'resumen')
        return {
          ...base,
          units: report.unitRows
            .filter(
              (u) =>
                u.netCents !== '0' ||
                u.partial ||
                u.attention !== 'Sin excepción registrada',
            )
            .slice(0, 5),
          monthly: report.monthly,
          frequencies: report.frequencies,
        };
      if (view === 'costos')
        return {
          ...base,
          monthly: report.monthly,
          breakdown: report.breakdown,
        };
      if (view === 'utilizacion')
        return {
          ...base,
          dataSource:
            'Viajes registrados en Logística; no prueba de movimiento físico.',
          unavailable: [
            'Indisponibilidad por motivos',
            'Disponibilidad sin uso',
            'Porcentaje con cobertura completa',
          ],
        };
      if (view === 'tendencias')
        return {
          ...base,
          frequencies: report.frequencies,
          interventions: report.interventions.slice(0, 20),
          interventionsTotal: report.interventions.length,
          pairs: report.pairs.slice(0, 20),
          pairsTotal: report.pairs.length,
        };
      return invalid('Vista desconocida.');
    });
  }
  async records(
    actor: TrustedActor,
    id: string,
    metricId: string,
    cursor: string | undefined,
    requestedLimit: string | undefined,
  ) {
    await this.core.ready(actor);
    const limit = requestedLimit === undefined ? 50 : Number(requestedLimit);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !['COSTS', 'UNITS', 'INTERVENTIONS', 'PAIRS'].includes(metricId)
    )
      invalid('Paginación o métrica inválida.');
    return this.core.db.transaction(async (m) => {
      const row = await this.snapshot(actor, id, m),
        data = row.result as unknown as SnapshotResult;
      let offset = 0;
      if (cursor) {
        const [body, signature] = cursor.split('.'),
          expected = createHmac('sha256', this.cursorSecret)
            .update(body ?? '')
            .digest('base64url');
        if (
          !signature ||
          signature.length !== expected.length ||
          !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
        )
          invalid('Cursor inválido.');
        let decoded: Record<string, unknown>;
        try {
          decoded = object(
            JSON.parse(Buffer.from(body, 'base64url').toString()),
          );
        } catch {
          return invalid('Cursor inválido.');
        }
        if (
          decoded.id !== id ||
          decoded.metricId !== metricId ||
          decoded.queryHash !== row.queryHash ||
          !Number.isInteger(decoded.offset) ||
          Number(decoded.offset) < 0
        )
          invalid('El cursor no corresponde a esta consulta.');
        offset = Number(decoded.offset);
      }
      const values =
        metricId === 'UNITS'
          ? data.report.unitRows
          : metricId === 'INTERVENTIONS'
            ? data.report.interventions
            : metricId === 'PAIRS'
              ? data.report.pairs
              : data.report.records;
      const body = Buffer.from(
        JSON.stringify({
          id,
          metricId,
          queryHash: row.queryHash,
          offset: offset + limit,
        }),
      ).toString('base64url');
      return {
        ...this.envelope(row),
        metricId,
        rows: values.slice(offset, offset + limit),
        total: values.length,
        nextCursor:
          offset + limit < values.length
            ? `${body}.${createHmac('sha256', this.cursorSecret).update(body).digest('base64url')}`
            : null,
      };
    });
  }
}
