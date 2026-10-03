import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AlertasService } from '../alertas/alertas.service';
import { TrustedActor } from '../auth/trusted-actor';
import {
  PhysicalStateReadPort,
  PhysicalStateSnapshot,
} from '../flota/physical-state-read.port';
import { Unidad } from '../unidades/unidad.entity';
import { FacilityCalendarPort } from '../visitas/checks/facility-calendar.port';
import { operationalDay } from '../visitas/checks/facility-calendar';
import {
  MaintenanceBlockReadPort,
  SignedCheckReadPort,
} from '../visitas/checks/signed-check-read.port';
import { VehicleInsurancePolicyPort } from '../vehicle-documents/vehicle-insurance.port';
import { composeTowerRow } from './control-tower.rules';
import { ControlTowerQueryDto } from './control-tower.dto';

@Injectable()
export class ControlTowerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Unidad) private readonly units: Repository<Unidad>,
    private readonly physicalStates: PhysicalStateReadPort,
    private readonly calendars: FacilityCalendarPort,
    private readonly insurance: VehicleInsurancePolicyPort,
    private readonly signedChecks: SignedCheckReadPort,
    private readonly maintenanceBlocks: MaintenanceBlockReadPort,
    private readonly alerts: AlertasService,
  ) {}

  async snapshot(query: ControlTowerQueryDto, actor: TrustedActor) {
    const now = new Date();
    const allUnits = await this.units.find({
      relations: { tipo: true },
      order: { numeroInterno: 'ASC' },
    });
    const manager = this.dataSource.manager;
    const [calendars, alertConfig, urgencyConfig] = await Promise.all([
      this.calendars.resolveBatch(
        allUnits.map((unit) => unit.id),
        manager,
        now,
      ),
      this.alerts.getConfig(),
      this.alerts.getTorreUrgencyConfig(),
    ]);
    const units = allUnits.filter((unit) => {
      const calendar = calendars.get(unit.id);
      return Boolean(
        calendar && actor.facilityScopes.includes(calendar.mapping.facilityId),
      );
    });
    const unitIds = units.map((unit) => unit.id);
    const [physical, blockingIds] = await Promise.all([
      this.safePhysical(unitIds),
      this.maintenanceBlocks.blockingUnitIds(unitIds, manager),
    ]);
    const fallbackDate = operationalDay(now).operationalDate;
    const datedRequests = unitIds.map((unidadId) => ({
      unidadId,
      operationalDate:
        calendars.get(unidadId)?.day.operationalDate ?? fallbackDate,
    }));
    const [insurance, checks] = await Promise.all([
      this.insurance.evaluateBatch(datedRequests, manager),
      this.signedChecks.readBatch(datedRequests, now, manager),
    ]);
    const thresholdByUnit = new Map(
      alertConfig.umbrales.map((row) => [row.unidadId, row.horas]),
    );

    const rows = units.map((unit) => {
      const inRoute = unit.opsEstado === 'EN_RUTA';
      const baselineHours =
        thresholdByUnit.get(unit.id) ??
        (unit.ambito === 'FORANEO' ? alertConfig.foraneoH : alertConfig.localH);
      const returnDueAt =
        inRoute && unit.salidaAt
          ? new Date(unit.salidaAt.getTime() + baselineHours * 3_600_000)
          : null;
      const rawPhysical = physical.get(unit.id) ?? {
        physicalKnowledge: 'UNAVAILABLE' as const,
        physicalState: null,
      };
      const physicalSnapshot =
        rawPhysical.physicalKnowledge === 'KNOWN'
          ? {
              ...rawPhysical,
              operationalInconsistency: inRoute
                ? rawPhysical.physicalState !== 'EN_RUTA'
                : rawPhysical.physicalState === 'EN_RUTA',
            }
          : rawPhysical;
      return composeTowerRow({
        unidadId: unit.id,
        identification: {
          numeroInterno: unit.numeroInterno,
          placas: unit.placas,
        },
        physical: physicalSnapshot,
        journey: { inRoute, salidaAt: unit.salidaAt, returnDueAt },
        insurance: insurance.get(unit.id)!,
        check: checks.get(unit.id) ?? {
          activeCheck: null,
          lastCompleted: null,
        },
        maintenanceBlocking: blockingIds.has(unit.id),
        now,
        urgencyConfig,
        calendarAvailable: calendars.has(unit.id),
      });
    });

    const q = query.q?.trim().toLocaleLowerCase('es') ?? '';
    const filtered = rows.filter((row) => {
      if (
        q &&
        !`${row.identification.numeroInterno} ${row.identification.placas}`
          .toLocaleLowerCase('es')
          .includes(q)
      )
        return false;
      if (
        query.physicalState &&
        (query.physicalState === 'UNAVAILABLE'
          ? row.physicalState !== null
          : row.physicalState !== query.physicalState)
      )
        return false;
      if (query.readiness && row.readiness !== query.readiness) return false;
      if (query.checkState && row.checkState !== query.checkState) return false;
      if (query.urgency && row.urgency !== query.urgency) return false;
      return true;
    });
    const after = query.cursor
      ? Math.max(
          0,
          filtered.findIndex((row) => row.unidadId === query.cursor) + 1,
        )
      : 0;
    const items = filtered.slice(after, after + query.limit);
    const last = items.length ? items[items.length - 1] : undefined;
    return {
      items,
      counts: {
        total: new Set(filtered.map((row) => row.unidadId)).size,
        urgency: this.countBy(filtered, 'urgency'),
        readiness: this.countBy(filtered, 'readiness'),
        checkState: this.countBy(filtered, 'checkState'),
      },
      asOf: now.toISOString(),
      nextCursor:
        after + items.length < filtered.length
          ? (last?.unidadId ?? null)
          : null,
    };
  }

  private countBy(
    rows: ReturnType<typeof composeTowerRow>[],
    key: 'urgency' | 'readiness' | 'checkState',
  ) {
    return rows.reduce<Record<string, number>>((counts, row) => {
      counts[row[key]] = (counts[row[key]] ?? 0) + 1;
      return counts;
    }, {});
  }

  private async safePhysical(unitIds: string[]) {
    try {
      return await this.physicalStates.readBatch(
        unitIds,
        this.dataSource.manager,
      );
    } catch {
      return new Map<string, PhysicalStateSnapshot>(
        unitIds.map((unidadId) => [
          unidadId,
          { physicalKnowledge: 'UNAVAILABLE', physicalState: null },
        ]),
      );
    }
  }
}
