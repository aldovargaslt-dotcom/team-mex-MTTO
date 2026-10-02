import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { TrustedActor, validateActor } from '../../auth/trusted-actor';
import { Rol } from '../../auth/roles.enum';
import { Unidad } from '../../unidades/unidad.entity';
import { EstadoUnidad } from '../../common/estado-unidad.enum';
import { Visita } from '../visita.entity';
import { TipoVisita } from '../enums';
import { VisitasService } from '../visitas.service';
import {
  ACTIVE_CHECK_INDEX,
  activeStatuses,
  CheckSource,
  MAINTENANCE_REQUEST_INDEX,
  maintenanceTypes,
  uniqueViolation,
  WorkOrderStatus,
  WorkOrderType,
} from '../work-order';
import { CheckInspection } from './check-inspection.entity';
import { VehicleFacility } from './facility.entity';
import { FacilityCalendarPort } from './facility-calendar.port';
import { CreateMaintenanceDto, OrdersQuery } from './canonical-orders.dto';

@Injectable()
export class CanonicalOrdersService {
  constructor(
    private readonly db: DataSource,
    private readonly legacy: VisitasService,
    private readonly calendar: FacilityCalendarPort,
  ) {}
  private authorize(actor: TrustedActor, roles: (Rol | 'SYSTEM')[]) {
    validateActor(actor, process.env.NODE_ENV);
    if (!actor.roles.some((r) => roles.includes(r)))
      throw new ForbiddenException({
        code: 'ROLE_DENIED',
        message: 'El rol no permite esta operación.',
        details: {},
      });
  }
  private async facility(
    manager: EntityManager,
    unidadId: string,
    actor: TrustedActor,
  ) {
    const unidad = await manager.findOneBy(Unidad, { id: unidadId });
    if (!unidad) throw new NotFoundException('No se encontró la unidad.');
    const { mapping, day } = await this.calendar.resolve(
      unidadId,
      manager,
      new Date(),
    );
    if (!actor.facilityScopes.includes(mapping.facilityId))
      throw new ForbiddenException({
        code: 'FACILITY_SCOPE_DENIED',
        message: 'Unidad fuera del facility autorizado.',
        details: {},
      });
    return { unidad, mapping, day };
  }
  async findActiveIn(manager: EntityManager, unidadId: string) {
    return manager.findOne(Visita, {
      where: {
        unidad: { id: unidadId },
        workOrderType: WorkOrderType.CHECK,
        workOrderStatus: In(activeStatuses),
      },
    });
  }
  private async conflict(
    manager: EntityManager,
    winner: Visita,
    actor: TrustedActor,
  ) {
    const check = await manager.findOneByOrFail(CheckInspection, {
      visitaId: winner.id,
    });
    if (!actor.facilityScopes.includes(check.facilityId))
      throw new ForbiddenException({
        code: 'FACILITY_SCOPE_DENIED',
        message: 'CHECK fuera del facility autorizado.',
        details: {},
      });
    return new ConflictException({
      code: 'ACTIVE_CHECK_ALREADY_EXISTS',
      message: 'La unidad ya tiene un CHECK activo.',
      details: {
        active: {
          id: winner.id,
          folio: `CHK-${winner.id}`,
          status: winner.workOrderStatus,
          step: null,
          assignedActor: winner.assignedUserId,
          startedAt: winner.startedAt,
          anomalySummary: null,
          deeplink: `/checks/${winner.id}`,
        },
      },
    });
  }
  async createCheck(
    unidadId: string,
    source: CheckSource,
    actor: TrustedActor,
  ) {
    this.authorize(
      actor,
      source === CheckSource.DAILY_AUTOMATIC
        ? ['SYSTEM']
        : [Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO],
    );
    if (!Object.values(CheckSource).includes(source))
      throw new BadRequestException('Origen CHECK inválido.');
    try {
      const id = await this.db.transaction(async (manager) => {
        const { unidad, mapping, day } = await this.facility(
          manager,
          unidadId,
          actor,
        );
        if (unidad.estado !== EstadoUnidad.ACTIVA)
          throw new BadRequestException('La unidad está inactiva.');
        const existing = await this.findActiveIn(manager, unidadId);
        if (existing) throw await this.conflict(manager, existing, actor);
        const visita = await manager.save(
          Visita,
          manager.create(Visita, {
            unidad,
            estado: null,
            tipo: null,
            km: null,
            chofer: null,
            workOrderType: WorkOrderType.CHECK,
            workOrderStatus: WorkOrderStatus.PENDING,
            legacyCompatDraft: false,
            createdBy: actor.subject,
            createdActorName: actor.displayName,
            attributionLevel: actor.attributionLevel,
          }),
        );
        await manager.save(CheckInspection, {
          visitaId: visita.id,
          source,
          facilityId: mapping.facilityId,
          operationalDate: day.operationalDate,
          timezone: day.timezone,
          calendarVersion: mapping.facility.version,
          mappingVersion: mapping.version,
          dayEndInstant: day.dayEndInstant,
        });
        return visita.id;
      });
      return this.detail(id, actor);
    } catch (error) {
      if (!uniqueViolation(error, ACTIVE_CHECK_INDEX)) throw error;
      // transaction() has already rolled back/released the failed transaction.
      // Reauthorize and query via the root manager, never the aborted manager.
      await this.facility(this.db.manager, unidadId, actor);
      const winner = await this.findActiveIn(this.db.manager, unidadId);
      if (winner) throw await this.conflict(this.db.manager, winner, actor);
      throw new ConflictException({
        code: 'CHECK_CREATION_CONFLICT',
        message:
          'El CHECK concurrente cambió de estado. Actualice antes de reintentar.',
        details: { unidadId, refresh: true },
      });
    }
  }
  async active(unidadId: string, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO, Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO]);
    await this.facility(this.db.manager, unidadId, actor);
    const visita = await this.findActiveIn(this.db.manager, unidadId);
    return visita ? this.detail(visita.id, actor) : null;
  }
  async detail(id: string, actor: TrustedActor) {
    this.authorize(actor, [
      Rol.MECANICO,
      Rol.LOGISTICA,
      Rol.ADMIN_DIRECTIVO,
      'SYSTEM',
    ]);
    const visita = await this.db.manager.findOneBy(Visita, {
      id,
      workOrderType: WorkOrderType.CHECK,
    });
    if (!visita) throw new NotFoundException('No se encontró el CHECK.');
    await this.facility(this.db.manager, visita.unidad.id, actor);
    const check = await this.db.manager.findOneByOrFail(CheckInspection, {
      visitaId: id,
    });
    if (!actor.facilityScopes.includes(check.facilityId))
      throw new ForbiddenException('Facility fuera de scope.');
    if (
      actor.roles.includes(Rol.MECANICO) &&
      !actor.roles.some((r) =>
        [Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO, 'SYSTEM'].includes(r),
      ) &&
      visita.assignedUserId !== actor.subject &&
      !(
        visita.assignedUserId === null &&
        activeStatuses.includes(visita.workOrderStatus)
      )
    )
      throw new NotFoundException('No se encontró el CHECK.');
    return {
      ...this.summary(visita),
      source: check.source,
      facilityId: check.facilityId,
      operationalDate: check.operationalDate,
      timezone: check.timezone,
      dayEndInstant: check.dayEndInstant,
      calendarVersion: check.calendarVersion,
      mappingVersion: check.mappingVersion,
    };
  }
  private summary(v: Visita) {
    return {
      id: v.id,
      unidadId: v.unidad.id,
      folio: `${v.workOrderType === 'CHECK' ? 'CHK' : 'MTT'}-${v.id}`,
      type: v.workOrderType,
      status: v.workOrderStatus,
      version: v.version,
      legacyCompatDraft: v.legacyCompatDraft,
      blocksOperation: v.blocksOperation,
      blockReason: v.blockReason,
      requiresReinspection: v.requiresReinspection,
      assignedActor: v.assignedUserId,
      startedAt: v.startedAt,
      createdBy: v.createdBy,
      createdActorName: v.createdActorName,
      attributionLevel: v.attributionLevel,
      createdAt: v.createdAt,
    };
  }
  async createMaintenance(
    unidadId: string,
    dto: CreateMaintenanceDto,
    actor: TrustedActor,
  ) {
    this.authorize(actor, [Rol.SUPERVISOR]);
    await this.facility(this.db.manager, unidadId, actor);
    if (!maintenanceTypes.includes(dto.type))
      throw new BadRequestException('Tipo de mantenimiento inválido.');
    if (dto.blocksOperation && !dto.blockReason?.trim())
      throw new BadRequestException('Se requiere motivo de bloqueo.');
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          unidadId,
          type: dto.type,
          choferId: dto.choferId,
          km: dto.km,
          blocksOperation: dto.blocksOperation,
          blockReason: dto.blockReason?.trim() || null,
          requiresReinspection: dto.requiresReinspection ?? false,
        }),
      )
      .digest('hex');
    const prior = async () =>
      dto.idempotencyKey
        ? this.db.manager.findOneBy(Visita, {
            createdBy: actor.subject,
            creationKey: dto.idempotencyKey,
            workOrderType: In(maintenanceTypes),
          })
        : null;
    const replay = (v: Visita) => {
      if (v.creationHash !== hash)
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'La clave ya identifica otra solicitud.',
          details: {},
        });
      return this.summary(v);
    };
    const existing = await prior();
    if (existing) return replay(existing);
    try {
      const created = await this.legacy.createMaintenance(
        unidadId,
        {
          choferId: dto.choferId,
          km: dto.km,
          tipo:
            dto.type === WorkOrderType.PREVENTIVE
              ? TipoVisita.PREDICTIVO
              : TipoVisita.CORRECTIVO,
        },
        { rol: Rol.SUPERVISOR, userId: actor.subject },
        false,
        {
          blocksOperation: dto.blocksOperation,
          blockReason: dto.blockReason?.trim() || null,
          blockActor: dto.blocksOperation ? actor.subject : null,
          requiresReinspection: dto.requiresReinspection ?? false,
          createdActorName: actor.displayName,
          attributionLevel: actor.attributionLevel,
          creationKey: dto.idempotencyKey ?? null,
          creationHash: hash,
        },
        async (manager) => {
          await this.facility(manager, unidadId, actor);
        },
      );
      return this.summary(
        await this.db.manager.findOneByOrFail(Visita, { id: created.id }),
      );
    } catch (error) {
      if (!uniqueViolation(error, MAINTENANCE_REQUEST_INDEX)) throw error;
      const winner = await prior();
      if (winner) return replay(winner);
      throw error;
    }
  }
  async list(actor: TrustedActor, query: OrdersQuery, checks: boolean) {
    this.authorize(
      actor,
      checks
        ? [Rol.MECANICO, Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO]
        : [Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO],
    );
    const qb = this.db
      .getRepository(Visita)
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.unidad', 'u')
      .innerJoin(VehicleFacility, 'f', 'f.unidad_id = u.id')
      .where('f.facility_id IN (:...facilities)', {
        facilities: actor.facilityScopes,
      })
      .andWhere('v.work_order_type IN (:...types)', {
        types: checks ? [WorkOrderType.CHECK] : maintenanceTypes,
      });
    if (checks) {
      qb.innerJoin(CheckInspection, 'c', 'c.visita_id=v.id').andWhere(
        'c.facility_id IN (:...facilities)',
      );
      if (
        actor.roles.includes(Rol.MECANICO) &&
        !actor.roles.some((r) =>
          [Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO].includes(r as Rol),
        )
      )
        qb.andWhere(
          '((v.assigned_user_id IS NULL AND v.work_order_status IN (:...eligibleStatuses)) OR v.assigned_user_id=:subject)',
          { subject: actor.subject, eligibleStatuses: activeStatuses },
        );
    }
    if (query.unidadId)
      qb.andWhere('u.id=:unidadId', { unidadId: query.unidadId });
    const total = await qb.clone().getCount();
    const active = await qb
      .clone()
      .andWhere('v.work_order_status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .getCount();
    if (query.cursor) qb.andWhere('v.id<:cursor', { cursor: query.cursor });
    const limit = query.limit ?? 50;
    const rows = await qb
      .orderBy('v.id', 'DESC')
      .take(limit + 1)
      .getMany();
    return {
      items: rows.slice(0, limit).map((v) => this.summary(v)),
      counts: { total, active },
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
}
