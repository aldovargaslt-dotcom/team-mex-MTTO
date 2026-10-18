import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { TrustedActor, validateActor } from '../../auth/trusted-actor';
import { Rol } from '../../auth/roles.enum';
import { Unidad } from '../../unidades/unidad.entity';
import { AndonService } from '../../andon/andon.service';
import { Visita } from '../visita.entity';
import { activeStatuses, WorkOrderType } from '../work-order';
import { FacilityCalendarPort } from './facility-calendar.port';
import { SignedCheckReadPort } from './signed-check-read.port';
import { CheckInspection } from './check-inspection.entity';
import { ReadinessSettings } from './readiness-settings.entity';
import { ReadinessHold } from './readiness-hold.entity';
import { resolveReadinessSettings } from './readiness-policy';
import { UnitReadinessQuery } from './unit-readiness.dto';
import { CheckSignature } from './check-signature.entity';

@Injectable()
export class UnitReadinessService {
  constructor(
    private readonly db: DataSource,
    private readonly calendars: FacilityCalendarPort,
    private readonly checks: SignedCheckReadPort,
    private readonly andon: AndonService,
  ) {}
  async history(
    unitId: string,
    actor: TrustedActor,
    query: UnitReadinessQuery,
  ) {
    await this.snapshot(new UnitReadinessQuery(), actor, unitId);
    const visits = await this.db.manager.find(Visita, {
      where: {
        unidad: { id: unitId },
        workOrderType: WorkOrderType.CHECK,
        workOrderStatus: 'COMPLETED' as Visita['workOrderStatus'],
      },
      order: { completedAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
    if (!visits.length) return { items: [], nextOffset: null };
    const inspections = await this.db.manager.find(CheckInspection, {
      where: { visitaId: In(visits.map((v) => v.id)) },
    });
    const signatures = await this.db.manager.find(CheckSignature, {
      where: { visitaId: In(visits.map((v) => v.id)) },
    });
    return {
      items: visits.map((visit) => {
        const check = inspections.find((c) => c.visitaId === visit.id);
        const signature = signatures.find((s) => s.visitaId === visit.id);
        return {
          id: visit.id,
          result: check?.result ?? null,
          completedAt: visit.completedAt,
          dueAt: check?.dayEndInstant ?? null,
          signer: signature?.signerName ?? null,
          signed: Boolean(check?.snapshotHash),
          href: `/checks/${visit.id}`,
        };
      }),
      nextOffset:
        visits.length === query.limit ? query.offset + query.limit : null,
    };
  }
  async snapshot(
    query: UnitReadinessQuery,
    actor: TrustedActor,
    unitId?: string,
  ) {
    validateActor(actor, process.env.NODE_ENV);
    const allowed = unitId
      ? [Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO, Rol.LOGISTICA, Rol.MECANICO]
      : [Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO];
    if (!actor.roles.some((r) => allowed.includes(r as Rol)))
      throw new ForbiddenException('No tienes acceso a esta vista.');
    const now = new Date();
    // One coherent public-schema read, with batched owner inputs. No hub per row.
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const all = await manager.find(Unidad, {
        ...(unitId ? { where: { id: unitId } } : {}),
        order: { numeroInterno: 'ASC' },
      });
      const calendars = await this.calendars.resolveBatch(
        all.map((u) => u.id),
        manager,
        now,
      );
      const units = all.filter((u) => {
        const c = calendars.get(u.id);
        return c && actor.facilityScopes.includes(c.mapping.facilityId);
      });
      if (unitId && !units.length)
        throw new NotFoundException('No se encontró una unidad autorizada.');
      const ids = units.map((u) => u.id);
      const settings = ids.length
        ? await manager.find(ReadinessSettings, {
            where: { facilityId: In(actor.facilityScopes) },
          })
        : [];
      const orders = ids.length
        ? await manager.find(Visita, {
            where: {
              unidad: { id: In(ids) },
              workOrderStatus: In(activeStatuses),
            },
            order: { createdAt: 'DESC' },
          })
        : [];
      const holds = ids.length
        ? await manager.find(ReadinessHold, {
            where: { unidadId: In(ids), verificationId: IsNull() },
            order: { createdAt: 'DESC' },
          })
        : [];
      let checkSource = true;
      const checkMap = await this.checks
        .readBatch(
          units.map((u) => ({
            unidadId: u.id,
            operationalDate: calendars.get(u.id)!.day.operationalDate,
          })),
          now,
          manager,
        )
        .catch(() => {
          checkSource = false;
          return new Map();
        });
      const checkIds = [...checkMap.values()].flatMap((c) =>
        c.lastCompleted ? [c.lastCompleted.checkId] : [],
      );
      const inspections = checkIds.length
        ? await manager.find(CheckInspection, {
            where: { visitaId: In(checkIds) },
          })
        : [];
      const byCheck = new Map(inspections.map((i) => [i.visitaId, i]));
      const completed = checkIds.length ? await manager.find(Visita, { where: { id: In(checkIds) }, select: { id: true, completedAt: true }, loadEagerRelations: false }) : [];
      const completedAt = new Map(completed.map((v) => [v.id, v.completedAt]));
      let andonSource = true;
      const overdueIds = new Set(
        await this.andon.unidadIdsNoResuelto().catch(() => {
          andonSource = false;
          return [];
        }),
      );
      const rows = units.map((u) => {
        const facilityId = calendars.get(u.id)!.mapping.facilityId;
        const policy = resolveReadinessSettings(
          settings,
          facilityId,
          u.id,
          u.tipo.id,
        );
        const snapshot = checkMap.get(u.id),
          last = snapshot?.lastCompleted ?? null;
        const unitOrders = orders.filter((o) => o.unidad.id === u.id);
        const activeHolds = holds.filter((h) => h.unidadId === u.id);
        const blocking = unitOrders.filter(
          (o) =>
            o.blocksOperation ||
            (o.workOrderType !== WorkOrderType.CHECK && o.openedAt),
        );
        const checkState = !checkSource
          ? 'UNKNOWN'
          : !last
            ? 'MISSING'
            : last.reason === 'EXPIRED'
              ? 'EXPIRED'
              : last.valid
                ? 'VALID'
                : 'UNKNOWN';
        const reasons: string[] = activeHolds.map((h) => h.reason);
        if (last?.result === 'UNFIT') reasons.push('Última revisión: no apta');
        if (last?.reason === 'INVALIDATED')
          reasons.push('Revisión invalidada; requiere nueva evaluación');
        if (blocking.length)
          reasons.push(`${blocking.length} orden(es) con bloqueo de operación`);
        if (snapshot?.activeCheck)
          reasons.push('Revisión en curso o pendiente');
        if (u.estado === 'INACTIVA')
          reasons.push('Unidad administrativamente inactiva');
        if (checkState === 'EXPIRED') reasons.push('Revisión vencida');
        if (checkState === 'MISSING') reasons.push('Sin revisión firmada');
        if (!checkSource || checkState === 'UNKNOWN')
          reasons.push('Operabilidad sin confirmar');
        if (overdueIds.has(u.id)) reasons.push('Mantenimiento vencido');
        if (!andonSource)
          reasons.push('Pendientes de mantenimiento sin confirmar');
        if (
          unitOrders.some((o) => o.workOrderType !== WorkOrderType.CHECK) &&
          !blocking.length
        )
          reasons.push('Mantenimiento pendiente');
        const critical =
          activeHolds.length > 0 ||
          last?.result === 'UNFIT' ||
          last?.reason === 'INVALIDATED' ||
          blocking.length > 0;
        const attention = critical
          ? 'CRITICAL'
          : !checkSource || checkState === 'UNKNOWN' || !andonSource
            ? 'UNKNOWN'
            : reasons.length
              ? 'ATTENTION'
              : 'CLEAR';
        const inspection = last ? byCheck.get(last.checkId) : null;
        return {
          id: u.id,
          numeroInterno: u.numeroInterno,
          placas: u.placas,
          fotoDataUrl: u.fotoDataUrl,
          tipo: { id: u.tipo.id, nombre: u.tipo.nombre, icono: u.tipo.icono },
          estado: u.estado,
          facilityId,
          usage: policy.usage,
          policy,
          attention,
          reasons,
          technicalReady: Boolean(
            checkSource &&
            last?.valid &&
            last.result !== 'UNFIT' &&
            !critical &&
            !snapshot?.activeCheck &&
            u.estado === 'ACTIVA',
          ),
          inUse: u.opsEstado === 'EN_RUTA',
          operationAsOf: u.updatedAt,
          checkState,
          lastCheck: last
            ? {
                ...last,
                reviewedAt:
                  inspection?.validityPolicy?.reviewedAt ??
                completedAt.get(last.checkId)?.toISOString() ??
                  null,
              }
            : null,
          activeCheck: snapshot?.activeCheck ?? null,
          orders: unitOrders.map((o) => ({
            id: o.id,
            version: o.version,
            type: o.workOrderType,
            status: o.workOrderStatus,
            createdAt: o.createdAt,
            openedAt: o.openedAt,
            assignedTo: o.assignedUserId,
            problem: o.blockReason || o.observaciones || null,
            href:
              o.workOrderType === WorkOrderType.CHECK
                ? `/checks/${o.id}`
                : `/unidades/${u.id}/visitas/${o.id}`,
          })),
          holds: activeHolds.map(
            ({ id, orderId, reason, actorName, createdAt }) => ({
              id,
              orderId,
              reason,
              actorName,
              createdAt,
            }),
          ),
        };
      });
      const counts = {
        DAILY: rows.filter((r) => r.usage === 'DAILY').length,
        STOCK: rows.filter((r) => r.usage === 'STOCK').length,
        UNCLASSIFIED: rows.filter((r) => !r.usage).length,
        ALL: rows.length,
        stockCritical: rows.filter(
          (r) => r.usage === 'STOCK' && r.attention === 'CRITICAL',
        ).length,
      };
      const q = query.q?.trim().toLocaleLowerCase('es');
      const selected = rows.filter(
        (r) =>
          (!q ||
            `${r.numeroInterno} ${r.placas}`
              .toLocaleLowerCase('es')
              .includes(q)) &&
          (!query.tipo ||
            r.tipo.id === query.tipo ||
            r.tipo.nombre === query.tipo) &&
          (!query.estado || r.estado === query.estado) &&
          (!query.attention || r.attention === query.attention) &&
          (!query.checkState || r.checkState === query.checkState) &&
          (!query.orders ||
            (query.orders === '1'
              ? r.orders.length > 0
              : r.orders.length === 0)),
      );
      const rank: Record<string, number> = {
        CRITICAL: 0,
        UNKNOWN: 1,
        ATTENTION: 2,
        CLEAR: 3,
      };
      selected.sort(
        (a, b) =>
          rank[a.attention] - rank[b.attention] ||
          (a.checkState === 'EXPIRED'
            ? new Date(a.lastCheck!.dayEndInstant).getTime()
            : Infinity) -
            (b.checkState === 'EXPIRED'
              ? new Date(b.lastCheck!.dayEndInstant).getTime()
              : Infinity) ||
          0 ||
          a.numeroInterno.localeCompare(b.numeroInterno, 'es', {
            numeric: true,
          }) ||
          a.id.localeCompare(b.id),
      );
      return {
        items: selected.slice(query.offset, query.offset + query.limit),
        total: selected.length,
        counts,
        asOf: now.toISOString(),
        sources: { checks: checkSource, maintenance: andonSource },
        settings: actor.roles.includes(Rol.ADMIN_DIRECTIVO) ? settings : [],
        types: [...new Map(rows.map((r) => [r.tipo.id, r.tipo])).values()],
        nextOffset:
          selected.length > query.offset + query.limit
            ? query.offset + query.limit
            : null,
      };
    });
  }
}
