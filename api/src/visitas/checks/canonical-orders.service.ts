import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
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
import {
  AssignCheckDto,
  CheckCommandDto,
  CheckConditionDto,
  ClassifyFindingDto,
  CompleteCheckDto,
  CreateMaintenanceDto,
  InvalidateCheckDto,
  OrdersQuery,
  RegisterEvidenceDto,
  ReserveEvidenceDto,
  ReviewCheckDto,
} from './canonical-orders.dto';
import { CheckGenerationLedger } from './check-generation.entity';
import { CheckAuditEvent } from './check-audit.entity';
import { OutboxService } from '../../kernel/outbox/outbox.service';
import { PhysicalStateReadPort } from '../../flota/physical-state-read.port';
import { CheckCondition } from './check-condition.entity';
import { CheckFinding } from './check-finding.entity';
import { CheckPsiPolicy } from './check-psi-policy.entity';
import { CheckEvidence } from './check-evidence.entity';
import { ObjectStoragePort } from './object-storage.port';
import { detectImageMime, evidenceReadiness } from './check-evidence.rules';
import { prepareCorrectiveContext } from './check-finding.rules';
import {
  canonicalHash,
  verifyNonblankCanvasPng,
} from './check-completion.rules';
import { CheckSignature } from './check-signature.entity';
import { CheckInvalidation } from './check-invalidation.entity';
import {
  CorrectiveFromCheckFactory,
  PreparedCorrective,
} from './corrective-from-check.factory';
import { UnitOperationCoordinator } from '../../kernel/unit-operation.module';

export const CHECK_CREATED = 'CHECK_CREATED';
export const CHECK_COMPLETED = 'CHECK_COMPLETED';
export const CHECK_INVALIDATED = 'CHECK_INVALIDATED';

@Injectable()
export class CanonicalOrdersService {
  constructor(
    private readonly db: DataSource,
    private readonly legacy: VisitasService,
    private readonly calendar: FacilityCalendarPort,
    private readonly unitOperations: UnitOperationCoordinator,
    @Optional() private readonly outbox?: OutboxService,
    @Optional() private readonly physicalState?: PhysicalStateReadPort,
    @Optional() private readonly storage?: ObjectStoragePort,
    @Optional() private readonly correctiveFactory?: CorrectiveFromCheckFactory,
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
        await this.audit(manager, visita, actor, CHECK_CREATED, { source });
        if (this.outbox)
          await this.outbox.enqueueAndDispatch(manager, CHECK_CREATED, {
            eventId: randomUUID(),
            eventType: CHECK_CREATED,
            schemaVersion: 1,
            occurredAt: new Date().toISOString(),
            actorRef: actor.subject,
            unidadId,
            checkId: visita.id,
            source,
            operationalDate: day.operationalDate,
            facilityId: mapping.facilityId,
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

  private async audit(
    manager: EntityManager,
    visita: Visita,
    actor: TrustedActor,
    event: string,
    details: Record<string, unknown>,
  ) {
    await manager.save(CheckAuditEvent, {
      id: randomUUID(),
      checkId: visita.id,
      unidadId: visita.unidad.id,
      event,
      actorId: actor.subject,
      actorName: actor.displayName,
      details,
    });
  }

  async generateDailyVehicleChecks(
    facilityId: string,
    operationalDate: string,
    commandId: string,
    actor: TrustedActor,
  ) {
    this.authorize(actor, ['SYSTEM']);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(operationalDate) || !commandId.trim())
      throw new BadRequestException('Jornada o commandId inválido.');
    const mappings = await this.db.manager.find(VehicleFacility, {
      where: { facilityId },
      relations: { unidad: true, facility: true },
    });
    const results: Array<Record<string, unknown>> = [];
    for (const mapping of mappings) {
      if (!this.physicalState)
        throw new BadRequestException('Fuente física no configurada.');
      const physical = await this.physicalState.read(
        mapping.unidadId,
        this.db.manager,
      );
      const eligible =
        mapping.unidad.estado === EstadoUnidad.ACTIVA &&
        physical.physicalKnowledge === 'KNOWN' &&
        physical.physicalState === 'EN_PATIO' &&
        !physical.operationalInconsistency;
      if (!eligible) {
        results.push({
          unidadId: mapping.unidadId,
          outcome: 'SKIPPED_INELIGIBLE',
        });
        continue;
      }
      const prior = await this.db.manager.findOne(CheckGenerationLedger, {
        where: { unidadId: mapping.unidadId, operationalDate },
      });
      if (prior) {
        results.push({
          unidadId: mapping.unidadId,
          outcome: prior.outcome,
          checkId: prior.checkId,
        });
        continue;
      }
      try {
        const created = await this.createCheck(
          mapping.unidadId,
          CheckSource.DAILY_AUTOMATIC,
          actor,
        );
        await this.db.manager.save(CheckGenerationLedger, {
          id: randomUUID(),
          unidadId: mapping.unidadId,
          facilityId,
          operationalDate,
          checkId: created.id,
          commandId,
          outcome: 'CREATED',
        });
        results.push({
          unidadId: mapping.unidadId,
          outcome: 'CREATED',
          checkId: created.id,
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          const active = await this.findActiveIn(
            this.db.manager,
            mapping.unidadId,
          );
          await this.db.manager.save(CheckGenerationLedger, {
            id: randomUUID(),
            unidadId: mapping.unidadId,
            facilityId,
            operationalDate,
            checkId: active?.id ?? null,
            commandId,
            outcome: 'SKIPPED_ACTIVE',
          });
          results.push({
            unidadId: mapping.unidadId,
            outcome: 'SKIPPED_ACTIVE',
            checkId: active?.id ?? null,
          });
          continue;
        }
        throw error;
      }
    }
    return { facilityId, operationalDate, commandId, items: results };
  }
  async active(unidadId: string, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO, Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO]);
    await this.facility(this.db.manager, unidadId, actor);
    const visita = await this.findActiveIn(this.db.manager, unidadId);
    return visita ? this.detail(visita.id, actor) : null;
  }

  private async writableCheck(
    manager: EntityManager,
    id: string,
    actor: TrustedActor,
    expectedVersion?: number,
  ) {
    this.authorize(actor, [Rol.MECANICO, Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO]);
    const visita = await manager.findOne(Visita, {
      where: { id, workOrderType: WorkOrderType.CHECK },
      relations: { unidad: true },
      lock: manager.queryRunner?.isTransactionActive
        ? { mode: 'pessimistic_write', tables: ['visitas'] }
        : undefined,
    });
    if (!visita) throw new NotFoundException('No se encontró el CHECK.');
    if (expectedVersion !== undefined && visita.version !== expectedVersion)
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'El CHECK cambió; recarga antes de continuar.',
        details: {},
        currentVersion: visita.version,
      });
    const { mapping } = await this.facility(manager, visita.unidad.id, actor);
    return { visita, mapping };
  }

  private assertMutable(visita: Visita) {
    if (
      [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED].includes(
        visita.workOrderStatus,
      )
    )
      throw new ConflictException({
        code: 'CHECK_IMMUTABLE',
        message: 'El CHECK terminado es de sólo lectura.',
        details: {},
      });
  }

  async assign(id: string, dto: AssignCheckDto, actor: TrustedActor) {
    return this.db.transaction(async (manager) => {
      const { visita } = await this.writableCheck(
        manager,
        id,
        actor,
        dto.expectedVersion,
      );
      if (
        !actor.roles.some((role) =>
          [Rol.LOGISTICA, Rol.ADMIN_DIRECTIVO].includes(role as Rol),
        )
      )
        throw new ForbiddenException({
          code: 'ROLE_DENIED',
          message: 'Sólo Logística o Administración asignan CHECK.',
          details: {},
        });
      if (
        visita.workOrderStatus !== WorkOrderStatus.PENDING ||
        visita.startedAt
      )
        throw new ConflictException({
          code: 'INVALID_STATE',
          message: 'Sólo un CHECK pendiente puede asignarse.',
          details: {},
        });
      visita.assignedUserId = dto.assignedActorId.trim();
      visita.assignedAt = new Date();
      visita.workOrderStatus = WorkOrderStatus.ASSIGNED;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_ASSIGNED', {
        assignedActorId: saved.assignedUserId,
      });
      return this.detail(saved.id, actor, manager);
    });
  }

  async claim(id: string, dto: CheckCommandDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    return this.db.transaction(async (manager) => {
      const { visita } = await this.writableCheck(
        manager,
        id,
        actor,
        dto.expectedVersion,
      );
      if (
        visita.workOrderStatus !== WorkOrderStatus.PENDING ||
        visita.assignedUserId
      )
        throw new ConflictException({
          code: 'ASSIGNMENT_CONFLICT',
          message: 'El CHECK ya fue asignado.',
          details: {},
        });
      visita.assignedUserId = actor.subject;
      visita.assignedAt = new Date();
      visita.workOrderStatus = WorkOrderStatus.ASSIGNED;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_CLAIMED', {});
      return this.detail(saved.id, actor, manager);
    });
  }

  async start(id: string, dto: CheckCommandDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    return this.db.transaction(async (manager) => {
      const { visita } = await this.writableCheck(
        manager,
        id,
        actor,
        dto.expectedVersion,
      );
      if (
        visita.assignedUserId !== actor.subject ||
        visita.workOrderStatus !== WorkOrderStatus.ASSIGNED
      )
        throw new ForbiddenException({
          code: 'CHECK_ASSIGNMENT_REQUIRED',
          message: 'Sólo el mecánico asignado puede iniciar.',
          details: {},
        });
      visita.workOrderStatus = WorkOrderStatus.IN_PROGRESS;
      visita.startedAt = new Date();
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_STARTED', {});
      return this.detail(saved.id, actor, manager);
    });
  }

  async condition(id: string, dto: CheckConditionDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    return this.db.transaction(async (manager) => {
      const { visita } = await this.writableCheck(
        manager,
        id,
        actor,
        dto.expectedVersion,
      );
      this.assertMutable(visita);
      if (
        visita.assignedUserId !== actor.subject ||
        visita.workOrderStatus !== WorkOrderStatus.IN_PROGRESS
      )
        throw new ForbiddenException({
          code: 'CHECK_ASSIGNMENT_REQUIRED',
          message: 'Sólo el mecánico asignado puede capturar condición.',
          details: {},
        });
      const policy = await manager.findOne(CheckPsiPolicy, {
        where: {
          unidadId: visita.unidad.id,
          tipoVehiculoId: visita.unidad.tipo.id,
        },
        order: { version: 'DESC' },
      });
      if (!policy)
        throw new UnprocessableEntityException({
          code: 'PSI_CONFIGURATION_REQUIRED',
          message: 'No existe configuración PSI para la unidad.',
          details: { unidadId: visita.unidad.id },
        });
      const payload = dto.payload as {
        fluids?: Record<string, { status?: string; severity?: string }>;
        tires?: Array<{ position: string; psi: number; condition?: string }>;
      };
      const fluids = payload.fluids ?? {};
      const tires = payload.tires ?? [];
      const requiredFluids = ['oil', 'coolant', 'washerFluid', 'leaks'];
      const missingFluids = requiredFluids.filter(
        (key) => fluids[key] === undefined,
      );
      const missingPositions = policy.positions.filter(
        (position) => !tires.some((t) => t.position === position),
      );
      if (missingFluids.length || missingPositions.length)
        throw new UnprocessableEntityException({
          code: 'CONDITION_INCOMPLETE',
          message: 'Completa fluidos, fugas y todas las posiciones PSI.',
          details: { missingFluids, missingPositions },
        });
      const findings: Array<{
        sourceKey: string;
        severity: 'OBSERVATION' | 'HARD_BLOCKER';
        details: Record<string, unknown>;
      }> = [];
      for (const key of requiredFluids) {
        const item = fluids[key];
        if (item.status !== 'OK')
          findings.push({
            sourceKey: `fluid:${key}`,
            severity:
              item.severity === 'CRITICAL' ||
              (key === 'leaks' && item.severity === 'SEVERE')
                ? 'HARD_BLOCKER'
                : 'OBSERVATION',
            details: { key, ...item },
          });
      }
      for (const tire of tires) {
        const outsideCritical =
          tire.psi < policy.criticalMin || tire.psi > policy.criticalMax;
        const outsideNormal =
          tire.psi < policy.normalMin || tire.psi > policy.normalMax;
        if (
          outsideCritical ||
          tire.condition === 'SEVERE' ||
          tire.condition === 'FLAT'
        )
          findings.push({
            sourceKey: `tire:${tire.position}`,
            severity: 'HARD_BLOCKER',
            details: { ...tire, policyVersion: policy.version },
          });
        else if (outsideNormal || tire.condition === 'OBSERVATION')
          findings.push({
            sourceKey: `tire:${tire.position}`,
            severity: 'OBSERVATION',
            details: { ...tire, policyVersion: policy.version },
          });
      }
      const prior = await manager.findOne(CheckCondition, {
        where: { visitaId: id },
      });
      const revision = (prior?.revision ?? 0) + 1;
      const hard = findings.some(
        (finding) => finding.severity === 'HARD_BLOCKER',
      );
      const condition = manager.create(CheckCondition, {
        visitaId: id,
        revision,
        payload: dto.payload,
        progress: 'COMPLETE',
        derivedResult: hard
          ? 'UNFIT'
          : findings.length
            ? 'FIT_WITH_OBSERVATION'
            : 'FIT',
      });
      await manager.save(condition);
      const previousFindings = await manager.find(CheckFinding, {
        where: { visitaId: id },
      });
      const invalidated = previousFindings
        .filter((finding) => finding.classification)
        .map((finding) => ({
          id: finding.id,
          classification: finding.classification,
          preparedContext: finding.preparedContext,
        }));
      const nextKeys = new Set(findings.map((finding) => finding.sourceKey));
      for (const previous of previousFindings) {
        if (!nextKeys.has(previous.sourceKey))
          await manager.delete(CheckFinding, { id: previous.id });
      }
      if (findings.length)
        await manager.save(
          CheckFinding,
          findings.map((finding) => {
            const existing = previousFindings.find(
              (row) => row.sourceKey === finding.sourceKey,
            );
            return {
              id: existing?.id ?? randomUUID(),
              visitaId: id,
              conditionRevision: revision,
              ...finding,
              classification: null,
              classificationNote: null,
              classificationRevision: null,
              preparedContext: null,
            };
          }),
        );
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_CONDITION_CAPTURED', {
        revision,
        findingCount: findings.length,
        policyVersion: policy.version,
        invalidated,
      });
      return { condition, findings, version: saved.version };
    });
  }

  async conditionConfig(id: string, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    const { visita } = await this.writableCheck(this.db.manager, id, actor);
    if (visita.assignedUserId !== actor.subject)
      throw new ForbiddenException({
        code: 'CHECK_ASSIGNMENT_REQUIRED',
        message: 'El CHECK no está asignado a este mecánico.',
        details: {},
      });
    const policy = await this.db.manager.findOne(CheckPsiPolicy, {
      where: {
        unidadId: visita.unidad.id,
        tipoVehiculoId: visita.unidad.tipo.id,
      },
      order: { version: 'DESC' },
    });
    if (!policy)
      throw new UnprocessableEntityException({
        code: 'PSI_CONFIGURATION_REQUIRED',
        message: 'No existe configuración PSI para la unidad.',
        details: {},
      });
    return {
      positions: policy.positions,
      version: policy.version,
      normalMin: policy.normalMin,
      normalMax: policy.normalMax,
      criticalMin: policy.criticalMin,
      criticalMax: policy.criticalMax,
    };
  }

  async conditionDetail(id: string, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    const detail = await this.detail(id, actor);
    const condition = await this.db.manager.findOneBy(CheckCondition, {
      visitaId: id,
    });
    return {
      condition: condition
        ? {
            revision: condition.revision,
            payload: condition.payload,
            progress: condition.progress,
            derivedResult: condition.derivedResult,
          }
        : null,
      version: detail.version,
    };
  }

  async listFindings(id: string, actor: TrustedActor) {
    const detail = await this.detail(id, actor);
    const items = await this.db.manager.find(CheckFinding, {
      where: { visitaId: id },
      order: { sourceKey: 'ASC' },
    });
    return {
      items,
      counts: {
        total: items.length,
        classified: items.filter((item) => item.classification !== null).length,
        prepared: items.filter(
          (item) => item.classification === 'REQUIRES_WORK',
        ).length,
      },
      complete: items.every((item) => item.classification !== null),
      version: detail.version,
    };
  }

  async classifyFinding(
    id: string,
    findingId: string,
    dto: ClassifyFindingDto,
    actor: TrustedActor,
  ) {
    this.authorize(actor, [Rol.MECANICO]);
    return this.db.transaction(async (manager) => {
      const visita = await this.evidenceWriter(
        id,
        actor,
        dto.expectedVersion,
        manager,
      );
      const finding = await manager.findOne(CheckFinding, {
        where: { id: findingId, visitaId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!finding) throw new NotFoundException('No se encontró el hallazgo.');
      const condition = await manager.findOneBy(CheckCondition, {
        visitaId: id,
      });
      if (!condition || finding.conditionRevision !== condition.revision)
        throw new ConflictException({
          code: 'FINDING_SOURCE_STALE',
          message: 'La condición cambió; recarga los hallazgos.',
          details: { findingId },
        });
      const evidenceRefs = (
        await manager.find(CheckEvidence, {
          where: { visitaId: id, status: 'READY' },
        })
      ).map((item) => item.id);
      const generatedNote = finding.sourceKey.startsWith('fluid:')
        ? `Anomalía en ${finding.sourceKey.slice('fluid:'.length)}`
        : `Anomalía en llanta ${finding.sourceKey.slice('tire:'.length)}`;
      finding.classification = dto.classification;
      finding.classificationNote = dto.note?.trim() || generatedNote;
      finding.classificationRevision = condition.revision;
      finding.preparedContext =
        dto.classification === 'REQUIRES_WORK'
          ? prepareCorrectiveContext({
              unidadId: visita.unidad.id,
              checkId: id,
              findingId: finding.id,
              note: finding.classificationNote,
              evidenceRefs,
            })
          : null;
      await manager.save(finding);
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'FINDING_CLASSIFIED', {
        findingId,
        classification: finding.classification,
        conditionRevision: condition.revision,
      });
      if (finding.preparedContext)
        await this.audit(
          manager,
          saved,
          actor,
          'CORRECTIVE_PREPARED_FROM_CHECK',
          { findingId, evidenceRefs },
        );
      return { finding, version: saved.version };
    });
  }

  private async reviewMaterial(
    manager: EntityManager,
    visita: Visita,
    check: CheckInspection,
    actor: TrustedActor,
    revision: number,
  ) {
    const condition = await manager.findOneBy(CheckCondition, {
      visitaId: visita.id,
    });
    if (
      !condition ||
      condition.progress !== 'COMPLETE' ||
      !condition.derivedResult
    )
      throw new UnprocessableEntityException({
        code: 'CONDITION_INCOMPLETE',
        message: 'La condición del CHECK está incompleta.',
        details: {},
      });
    const evidence = await manager.find(CheckEvidence, {
      where: { visitaId: visita.id, status: 'READY' },
      order: { id: 'ASC' },
    });
    const readiness = evidenceReadiness(evidence);
    if (!readiness.ready)
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_INCOMPLETE',
        message: 'Se requieren 2–5 fotos y cobertura completa.',
        details: readiness,
      });
    const findings = await manager.find(CheckFinding, {
      where: { visitaId: visita.id },
      order: { sourceKey: 'ASC' },
    });
    const incomplete = findings.filter(
      (finding) =>
        finding.classification === null ||
        finding.classificationRevision !== condition.revision,
    );
    if (incomplete.length)
      throw new UnprocessableEntityException({
        code: 'FINDINGS_INCOMPLETE',
        message: 'Clasifica todos los hallazgos vigentes.',
        details: { findingIds: incomplete.map((finding) => finding.id) },
      });
    const policy = await manager.findOne(CheckPsiPolicy, {
      where: {
        unidadId: visita.unidad.id,
        tipoVehiculoId: visita.unidad.tipo.id,
      },
      order: { version: 'DESC' },
    });
    if (!policy)
      throw new UnprocessableEntityException({
        code: 'PSI_CONFIGURATION_REQUIRED',
        message: 'No existe configuración PSI para la unidad.',
        details: {},
      });

    const snapshot: Record<string, unknown> = {
      schemaVersion: 1,
      checkId: visita.id,
      revision,
      unit: {
        id: visita.unidad.id,
        numeroInterno: visita.unidad.numeroInterno,
        placas: visita.unidad.placas,
        vin: visita.unidad.vin,
        tipoId: visita.unidad.tipo.id,
        marcaModelo: visita.unidad.marcaModelo,
      },
      operationalContext: {
        operationalDate: check.operationalDate,
        facilityId: check.facilityId,
        timezone: check.timezone,
        dayEndInstant: check.dayEndInstant.toISOString(),
        calendarVersion: check.calendarVersion,
        mappingVersion: check.mappingVersion,
        source: check.source,
      },
      condition: {
        revision: condition.revision,
        payload: condition.payload,
        result: condition.derivedResult,
        policy: {
          id: policy.id,
          version: policy.version,
          positions: policy.positions,
          normalMin: policy.normalMin,
          normalMax: policy.normalMax,
          criticalMin: policy.criticalMin,
          criticalMax: policy.criticalMax,
        },
      },
      evidence: evidence.map((item) => ({
        id: item.id,
        objectKey: item.objectKey,
        objectVersionId: item.objectVersionId,
        sha256: item.sha256,
        mimeType: item.mimeType,
        bytes: item.bytes,
        tags: [...item.tags].sort(),
        readyAt: item.readyAt?.toISOString() ?? null,
      })),
      findings: findings.map((finding) => ({
        id: finding.id,
        sourceKey: finding.sourceKey,
        conditionRevision: finding.conditionRevision,
        severity: finding.severity,
        details: finding.details,
        classification: finding.classification,
        note: finding.classificationNote,
        preparedContext: finding.preparedContext,
      })),
      disposition: {
        result: condition.derivedResult,
        reason:
          condition.derivedResult === 'UNFIT'
            ? 'Existe al menos un bloqueo de seguridad vigente.'
            : condition.derivedResult === 'FIT_WITH_OBSERVATION'
              ? 'Existen observaciones sin bloqueo de seguridad.'
              : 'No se detectaron anomalías.',
      },
      signer: {
        subject: actor.subject,
        displayName: actor.displayName,
        authMode: actor.authMode,
        attributionLevel: actor.attributionLevel,
      },
    };
    return {
      snapshot,
      hash: canonicalHash(snapshot),
      condition,
      findings,
      evidence,
    };
  }

  async review(id: string, dto: ReviewCheckDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    return this.db.transaction(async (manager) => {
      const visita = await this.evidenceWriter(
        id,
        actor,
        dto.expectedVersion,
        manager,
      );
      const check = await manager.findOne(CheckInspection, {
        where: { visitaId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!check) throw new NotFoundException('No se encontró el CHECK.');
      const reviewedVersion = visita.version + 1;
      const material = await this.reviewMaterial(
        manager,
        visita,
        check,
        actor,
        reviewedVersion,
      );
      check.reviewedVersion = reviewedVersion;
      check.reviewHash = material.hash;
      check.reviewSnapshot = material.snapshot;
      await manager.save(check);
      visita.version = reviewedVersion;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'REVIEW_STARTED', {
        reviewedVersion: saved.version,
        reviewHash: material.hash,
        result: material.condition.derivedResult,
        exceptionCount: material.findings.length,
      });
      return {
        reviewedVersion: saved.version,
        reviewedHash: material.hash,
        result: material.condition.derivedResult,
        snapshot: material.snapshot,
        exceptions: material.findings.map((finding) => ({
          id: finding.id,
          sourceKey: finding.sourceKey,
          severity: finding.severity,
          classification: finding.classification,
        })),
      };
    });
  }

  private signatureLimitBytes() {
    const value = Number(
      process.env.CHECK_SIGNATURE_MAX_BYTES ??
        process.env.CHECK_EVIDENCE_MAX_BYTES,
    );
    if (!Number.isInteger(value) || value <= 0)
      throw new UnprocessableEntityException({
        code: 'SIGNATURE_CONFIGURATION_REQUIRED',
        message: 'Configure el límite de bytes para firma CHECK.',
        details: {},
      });
    return value;
  }

  private completionResponse(
    visita: Visita,
    check: CheckInspection,
    correctiveIds: string[],
  ) {
    return {
      id: visita.id,
      status: visita.workOrderStatus,
      version: visita.version,
      completedAt: visita.completedAt,
      result: check.result,
      snapshotHash: check.snapshotHash,
      reviewedVersion: check.reviewedVersion,
      reviewedHash: check.reviewHash,
      correctiveIds,
      signatureContentPath: `/checks/${visita.id}/signature/content`,
    };
  }

  async complete(id: string, dto: CompleteCheckDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO]);
    if (!this.storage || !this.correctiveFactory)
      throw new UnprocessableEntityException({
        code: 'CHECK_COMPLETION_UNAVAILABLE',
        message: 'Storage o factory de cierre no configurados.',
        details: {},
      });
    await this.detail(id, actor);
    let verified: ReturnType<typeof verifyNonblankCanvasPng>;
    try {
      verified = verifyNonblankCanvasPng(
        dto.signatureDataUrl,
        dto.signatureWidth,
        dto.signatureHeight,
        this.signatureLimitBytes(),
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : 'SIGNATURE_INVALID';
      throw new UnprocessableEntityException({
        code,
        message:
          code === 'SIGNATURE_BLANK'
            ? 'La firma no puede estar vacía.'
            : 'La firma PNG no es válida.',
        details: {},
      });
    }
    const requestHash = canonicalHash({
      checkId: id,
      reviewedVersion: dto.reviewedVersion,
      reviewedHash: dto.reviewedHash,
      signatureHash: verified.sha256,
      signatureWidth: verified.width,
      signatureHeight: verified.height,
      signatureMethod: dto.signatureMethod,
      signerSubject: actor.subject,
    });
    const replay = async (manager: EntityManager, check: CheckInspection) => {
      const visita = await manager.findOneByOrFail(Visita, { id });
      if (
        check.completionKey !== dto.idempotencyKey ||
        check.completionHash !== requestHash
      )
        throw new ConflictException({
          code: 'CHECK_ALREADY_COMPLETED',
          message: 'El CHECK ya fue cerrado con otra solicitud.',
          details: {},
        });
      const correctiveIds = (
        await manager.find(Visita, {
          where: { sourceCheckId: id, workOrderType: WorkOrderType.CORRECTIVE },
          order: { id: 'ASC' },
        })
      ).map((item) => item.id);
      return this.completionResponse(visita, check, correctiveIds);
    };
    const existing = await this.db.manager.findOneBy(CheckInspection, {
      visitaId: id,
    });
    if (existing?.completionKey) return replay(this.db.manager, existing);

    const temporaryKey = `checks/${id}/temporary/signature-${randomUUID()}`;
    await this.storage.putTemporary(temporaryKey, verified.content);
    const finalKey = `checks/${id}/signatures/${verified.sha256}`;
    const immutable = await this.storage.referenceImmutableObject(
      temporaryKey,
      finalKey,
    );

    return this.db.transaction(async (manager) => {
      const unitRef = await manager.findOne(Visita, {
        where: { id },
        relations: { unidad: true },
      });
      if (!unitRef) throw new NotFoundException('No se encontró el CHECK.');
      await this.unitOperations.lock(manager, unitRef.unidad.id);
      const { visita } = await this.writableCheck(manager, id, actor);
      const check = await manager.findOne(CheckInspection, {
        where: { visitaId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!check) throw new NotFoundException('No se encontró el CHECK.');
      if (check.completionKey) return replay(manager, check);
      if (
        visita.workOrderStatus !== WorkOrderStatus.IN_PROGRESS ||
        visita.assignedUserId !== actor.subject
      )
        throw new ConflictException({
          code: 'INVALID_STATE',
          message:
            'Sólo el mecánico asignado puede cerrar un CHECK en progreso.',
          details: {},
        });
      if (
        visita.version !== dto.reviewedVersion ||
        check.reviewedVersion !== dto.reviewedVersion ||
        check.reviewHash !== dto.reviewedHash ||
        !check.reviewSnapshot ||
        canonicalHash(check.reviewSnapshot) !== dto.reviewedHash
      )
        throw new ConflictException({
          code: 'REVIEW_STALE',
          message: 'La revisión cambió; vuelve a revisar antes de firmar.',
          details: {},
          currentVersion: visita.version,
        });
      const current = await this.reviewMaterial(
        manager,
        visita,
        check,
        actor,
        dto.reviewedVersion,
      );
      if (current.hash !== dto.reviewedHash)
        throw new ConflictException({
          code: 'REVIEW_STALE',
          message: 'El contenido cambió después de la revisión.',
          details: {},
          currentVersion: visita.version,
        });

      const signature = manager.create(CheckSignature, {
        id: randomUUID(),
        visitaId: id,
        objectKey: immutable.key,
        objectVersionId: immutable.versionId,
        mimeType: 'image/png',
        bytes: immutable.bytes,
        sha256: immutable.sha256,
        width: verified.width,
        height: verified.height,
        method: dto.signatureMethod,
        signerSubject: actor.subject,
        signerName: actor.displayName,
        attributionLevel: actor.attributionLevel,
        signedContentHash: dto.reviewedHash,
      });
      await manager.save(signature);

      const prepared = current.findings
        .filter(
          (finding) =>
            finding.classification === 'REQUIRES_WORK' &&
            finding.preparedContext,
        )
        .map((finding) => finding.preparedContext as PreparedCorrective);
      const correctives: Visita[] = [];
      for (const context of prepared) {
        const corrective = this.correctiveFactory!.createAtCompletion(
          manager,
          context,
          actor.subject,
        );
        corrective.createdActorName = actor.displayName;
        corrective.attributionLevel = actor.attributionLevel;
        correctives.push(await manager.save(corrective));
      }

      check.result = current.condition.derivedResult;
      check.snapshotHash = dto.reviewedHash;
      check.signedSnapshot = current.snapshot;
      check.completionKey = dto.idempotencyKey;
      check.completionHash = requestHash;
      await manager.save(check);
      visita.workOrderStatus = WorkOrderStatus.COMPLETED;
      visita.completedAt = new Date();
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'SIGNED', {
        signatureId: signature.id,
        signatureHash: signature.sha256,
        signedContentHash: signature.signedContentHash,
      });
      for (const corrective of correctives)
        await this.audit(
          manager,
          saved,
          actor,
          'CORRECTIVE_CREATED_FROM_CHECK',
          { correctiveId: corrective.id, findingId: corrective.findingId },
        );
      await this.audit(manager, saved, actor, 'COMPLETED', {
        result: check.result,
        snapshotHash: check.snapshotHash,
        correctiveIds: correctives.map((item) => item.id),
      });
      if (this.outbox) {
        const eventId = randomUUID();
        await this.outbox.enqueueAndDispatch(manager, CHECK_COMPLETED, {
          eventId,
          eventType: CHECK_COMPLETED,
          schemaVersion: 1,
          occurredAt: saved.completedAt!.toISOString(),
          actorRef: actor.subject,
          unidadId: saved.unidad.id,
          checkId: saved.id,
          revision: saved.version,
          source: check.source,
          operationalDate: check.operationalDate,
          facilityId: check.facilityId,
          snapshotHash: check.snapshotHash,
          result: check.result,
          correctiveIds: correctives.map((item) => item.id),
        });
      }
      return this.completionResponse(
        saved,
        check,
        correctives.map((item) => item.id),
      );
    });
  }

  async invalidate(id: string, dto: InvalidateCheckDto, actor: TrustedActor) {
    this.authorize(actor, [Rol.MECANICO, Rol.LOGISTICA]);
    const mechanic = actor.roles.includes(Rol.MECANICO);
    const logistics = actor.roles.includes(Rol.LOGISTICA);
    const allowed =
      (mechanic &&
        ['NEW_SAFETY_ANOMALY', 'AUTHORIZED_INVALIDATION'].includes(dto.type)) ||
      (logistics &&
        ['INCIDENT_DAMAGE', 'AUTHORIZED_INVALIDATION'].includes(dto.type));
    if (!allowed || dto.type === 'MAINTENANCE_REINSPECTION_REQUIRED')
      throw new ForbiddenException({
        code: 'INVALIDATION_CAUSE_DENIED',
        message: 'El rol no puede registrar esta causa.',
        details: {},
      });
    const replay = (prior: CheckInvalidation) => {
      if (
        prior.checkId !== id ||
        prior.type !== dto.type ||
        prior.reason !== dto.reason.trim()
      )
        throw new ConflictException({
          code: 'SOURCE_EVENT_REUSED',
          message: 'El sourceEventId ya identifica otra invalidación.',
          details: {},
        });
      return prior;
    };
    try {
      return await this.db.transaction(async (manager) => {
        const prior = await manager.findOneBy(CheckInvalidation, {
          sourceEventId: dto.sourceEventId,
        });
        if (prior) return replay(prior);
        const unitRef = await manager.findOne(Visita, {
          where: { id },
          relations: { unidad: true },
        });
        if (!unitRef) throw new NotFoundException('No se encontró el CHECK.');
        await this.unitOperations.lock(manager, unitRef.unidad.id);
        const { visita } = await this.writableCheck(manager, id, actor);
        if (visita.workOrderStatus !== WorkOrderStatus.COMPLETED)
          throw new ConflictException({
            code: 'INVALID_STATE',
            message: 'Sólo un CHECK completado puede invalidarse.',
            details: {},
          });
        const row = await manager.save(
          CheckInvalidation,
          manager.create(CheckInvalidation, {
            id: randomUUID(),
            checkId: id,
            unidadId: visita.unidad.id,
            type: dto.type,
            reason: dto.reason.trim(),
            sourceEventId: dto.sourceEventId,
            actorId: actor.subject,
            actorName: actor.displayName,
            sourceWorkOrderId: null,
          }),
        );
        await this.audit(manager, visita, actor, 'INVALIDATED', {
          invalidationId: row.id,
          type: row.type,
          reason: row.reason,
          sourceEventId: row.sourceEventId,
        });
        if (this.outbox)
          await this.outbox.enqueueAndDispatch(manager, CHECK_INVALIDATED, {
            eventId: randomUUID(),
            eventType: CHECK_INVALIDATED,
            schemaVersion: 1,
            occurredAt: row.createdAt.toISOString(),
            actorRef: actor.subject,
            unidadId: visita.unidad.id,
            checkId: id,
            invalidationId: row.id,
            sourceEventId: row.sourceEventId,
            reason: row.reason,
            type: row.type,
          });
        return row;
      });
    } catch (error) {
      if (!uniqueViolation(error, 'check_invalidation_source_uidx'))
        throw error;
      await this.detail(id, actor);
      const winner = await this.db.manager.findOneBy(CheckInvalidation, {
        sourceEventId: dto.sourceEventId,
      });
      if (!winner) throw error;
      return replay(winner);
    }
  }

  private evidenceLimitBytes() {
    const value = Number(process.env.CHECK_EVIDENCE_MAX_BYTES);
    if (!Number.isInteger(value) || value <= 0)
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_CONFIGURATION_REQUIRED',
        message: 'Configure el límite de bytes para evidencia CHECK.',
        details: {},
      });
    return value;
  }

  private decodeEvidence(dataUrl: string) {
    const maxBytes = this.evidenceLimitBytes();
    const match =
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
        dataUrl,
      );
    if (!match)
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_FORMAT_INVALID',
        message: 'La evidencia debe ser PNG, JPEG o WebP.',
        details: {},
      });
    if (match[2].length > Math.ceil((maxBytes * 4) / 3) + 8)
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_TOO_LARGE',
        message: 'La imagen excede el límite configurado.',
        details: { maxBytes },
      });
    const content = Buffer.from(match[2], 'base64');
    if (!content.length || content.byteLength > maxBytes)
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_TOO_LARGE',
        message: 'La imagen excede el límite configurado.',
        details: { maxBytes },
      });
    const detected = detectImageMime(content);
    if (!detected || detected !== match[1])
      throw new UnprocessableEntityException({
        code: 'EVIDENCE_CONTENT_MISMATCH',
        message: 'El contenido no coincide con el tipo de imagen declarado.',
        details: {},
      });
    return { content, mimeType: detected };
  }

  private async evidenceWriter(
    id: string,
    actor: TrustedActor,
    expectedVersion?: number,
    manager: EntityManager = this.db.manager,
  ) {
    this.authorize(actor, [Rol.MECANICO]);
    const { visita } = await this.writableCheck(
      manager,
      id,
      actor,
      expectedVersion,
    );
    this.assertMutable(visita);
    if (
      visita.assignedUserId !== actor.subject ||
      visita.workOrderStatus !== WorkOrderStatus.IN_PROGRESS
    )
      throw new ForbiddenException({
        code: 'CHECK_ASSIGNMENT_REQUIRED',
        message: 'Sólo el mecánico asignado puede gestionar evidencia.',
        details: {},
      });
    return visita;
  }

  async reserveEvidence(
    id: string,
    dto: ReserveEvidenceDto,
    actor: TrustedActor,
  ) {
    this.evidenceLimitBytes();
    return this.db.transaction(async (manager) => {
      const visita = await this.evidenceWriter(
        id,
        actor,
        dto.expectedVersion,
        manager,
      );
      const count = await manager.count(CheckEvidence, {
        where: { visitaId: id },
      });
      if (count >= 5)
        throw new ConflictException({
          code: 'PHOTO_LIMIT_EXCEEDED',
          message: 'El CHECK admite máximo cinco evidencias.',
          details: { max: 5 },
        });
      const evidenceId = randomUUID();
      const row = manager.create(CheckEvidence, {
        id: evidenceId,
        visitaId: id,
        objectKey: `checks/${id}/temporary/${evidenceId}`,
        objectVersionId: null,
        status: 'TEMPORARY',
        tags: [...new Set(dto.tags)],
        mimeType: null,
        bytes: null,
        sha256: null,
        actorId: actor.subject,
        readyAt: null,
      });
      await manager.save(row);
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_EVIDENCE_RESERVED', {
        evidenceId,
        tags: row.tags,
      });
      return {
        reservationId: evidenceId,
        objectKey: row.objectKey,
        maxBytes: this.evidenceLimitBytes(),
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        version: saved.version,
      };
    });
  }

  async registerEvidence(
    id: string,
    dto: RegisterEvidenceDto,
    actor: TrustedActor,
  ) {
    if (!this.storage)
      throw new UnprocessableEntityException({
        code: 'PRIVATE_STORAGE_UNAVAILABLE',
        message: 'El storage privado CHECK no está configurado.',
        details: {},
      });
    await this.evidenceWriter(id, actor, dto.expectedVersion);
    const reservation = await this.db.manager.findOne(CheckEvidence, {
      where: { id: dto.reservationId, visitaId: id },
    });
    if (!reservation || reservation.status !== 'TEMPORARY')
      throw new ConflictException({
        code: 'EVIDENCE_RESERVATION_INVALID',
        message: 'La reserva ya no está disponible.',
        details: {},
      });
    if (reservation.actorId !== actor.subject)
      throw new ForbiddenException({
        code: 'EVIDENCE_SCOPE_DENIED',
        message: 'La reserva pertenece a otro actor.',
        details: {},
      });
    const { content, mimeType } = this.decodeEvidence(dto.dataUrl);
    const temporary = await this.storage.putTemporary(
      reservation.objectKey,
      content,
    );
    const finalKey = `checks/${id}/evidence/${reservation.id}-${temporary.sha256}`;
    const immutable = await this.storage.referenceImmutableObject(
      reservation.objectKey,
      finalKey,
    );
    return this.db.transaction(async (manager) => {
      const visita = await this.evidenceWriter(
        id,
        actor,
        dto.expectedVersion,
        manager,
      );
      const current = await manager.findOne(CheckEvidence, {
        where: { id: reservation.id, visitaId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current || current.status !== 'TEMPORARY')
        throw new ConflictException({
          code: 'EVIDENCE_RESERVATION_INVALID',
          message: 'La reserva ya fue utilizada.',
          details: {},
        });
      current.objectKey = immutable.key;
      current.objectVersionId = immutable.versionId;
      current.status = 'READY';
      current.tags = [...new Set(dto.tags)];
      current.mimeType = mimeType;
      current.bytes = immutable.bytes;
      current.sha256 = immutable.sha256;
      current.readyAt = new Date();
      await manager.save(current);
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_EVIDENCE_READY', {
        evidenceId: current.id,
        tags: current.tags,
        mimeType,
        bytes: current.bytes,
        sha256: current.sha256,
      });
      return { ...current, version: saved.version };
    });
  }

  async listEvidence(id: string, actor: TrustedActor) {
    await this.detail(id, actor);
    const items = await this.db.manager.find(CheckEvidence, {
      where: { visitaId: id, status: 'READY' },
      order: { createdAt: 'ASC' },
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        tags: item.tags,
        mimeType: item.mimeType,
        bytes: item.bytes,
        sha256: item.sha256,
        createdAt: item.createdAt,
        contentPath: `/checks/${id}/evidence/${item.id}/content`,
      })),
      ...evidenceReadiness(items),
    };
  }

  async evidenceContent(id: string, evidenceId: string, actor: TrustedActor) {
    if (!this.storage) throw new NotFoundException('Evidencia no disponible.');
    await this.detail(id, actor);
    const item = await this.db.manager.findOne(CheckEvidence, {
      where: { id: evidenceId, visitaId: id, status: 'READY' },
    });
    if (!item || !item.mimeType)
      throw new NotFoundException('No se encontró la evidencia.');
    return {
      content: await this.storage.readPrivate(item.objectKey),
      mimeType: item.mimeType,
    };
  }

  async signatureContent(id: string, actor: TrustedActor) {
    if (!this.storage) throw new NotFoundException('Firma no disponible.');
    await this.detail(id, actor);
    const signature = await this.db.manager.findOneBy(CheckSignature, {
      visitaId: id,
    });
    if (!signature) throw new NotFoundException('No se encontró la firma.');
    return {
      content: await this.storage.readPrivate(signature.objectKey),
      mimeType: signature.mimeType,
    };
  }

  async deleteEvidence(id: string, evidenceId: string, actor: TrustedActor) {
    const deleted = await this.db.transaction(async (manager) => {
      const visita = await this.evidenceWriter(id, actor, undefined, manager);
      const item = await manager.findOne(CheckEvidence, {
        where: { id: evidenceId, visitaId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException('No se encontró la evidencia.');
      await manager.delete(CheckEvidence, { id: item.id });
      visita.version += 1;
      const saved = await manager.save(visita);
      await this.audit(manager, saved, actor, 'CHECK_EVIDENCE_REMOVED', {
        evidenceId,
        previousStatus: item.status,
      });
      return { item, version: saved.version };
    });
    if (deleted.item.status === 'TEMPORARY' && this.storage)
      await this.storage.removeUnreferencedTemporary(deleted.item.objectKey);
    return { id: evidenceId, version: deleted.version };
  }
  async detail(
    id: string,
    actor: TrustedActor,
    manager: EntityManager = this.db.manager,
  ) {
    this.authorize(actor, [
      Rol.MECANICO,
      Rol.LOGISTICA,
      Rol.ADMIN_DIRECTIVO,
      'SYSTEM',
    ]);
    const visita = await manager.findOneBy(Visita, {
      id,
      workOrderType: WorkOrderType.CHECK,
    });
    if (!visita) throw new NotFoundException('No se encontró el CHECK.');
    await this.facility(manager, visita.unidad.id, actor);
    const check = await manager.findOneByOrFail(CheckInspection, {
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
    const invalidations =
      visita.workOrderStatus === WorkOrderStatus.COMPLETED
        ? await manager.find(CheckInvalidation, {
            where: { checkId: id },
            order: { createdAt: 'ASC' },
          })
        : [];
    const expired = new Date() >= check.dayEndInstant;
    return {
      ...this.summary(visita),
      source: check.source,
      facilityId: check.facilityId,
      operationalDate: check.operationalDate,
      timezone: check.timezone,
      dayEndInstant: check.dayEndInstant,
      calendarVersion: check.calendarVersion,
      mappingVersion: check.mappingVersion,
      result: check.result,
      reviewedVersion: check.reviewedVersion,
      reviewedHash: check.reviewHash,
      snapshotHash: check.snapshotHash,
      completedAt: visita.completedAt,
      signatureContentPath: check.snapshotHash
        ? `/checks/${id}/signature/content`
        : null,
      validity:
        visita.workOrderStatus === WorkOrderStatus.COMPLETED
          ? {
              valid: !expired && invalidations.length === 0,
              expired,
              invalidated: invalidations.length > 0,
              invalidations,
            }
          : null,
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
          await this.unitOperations.lock(manager, unidadId);
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
      ) {
        qb.andWhere(
          'v.work_order_status IN (:...activeStatuses) AND ((v.assigned_user_id IS NULL AND v.work_order_status IN (:...eligibleStatuses)) OR v.assigned_user_id=:subject)',
          {
            subject: actor.subject,
            eligibleStatuses: activeStatuses,
            activeStatuses,
          },
        );
      }
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
