import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { TrustedActor, validateActor } from '../../auth/trusted-actor';
import { Rol } from '../../auth/roles.enum';
import { UnitOperationCoordinator } from '../../kernel/unit-operation.module';
import { Visita } from '../visita.entity';
import { maintenanceTypes, WorkOrderStatus } from '../work-order';
import { FacilityCalendarPort } from './facility-calendar.port';
import { ReadinessHold, RepairVerification } from './readiness-hold.entity';
import {
  CreateReadinessHoldDto,
  VerifyReadinessHoldsDto,
} from './unit-readiness.dto';
import {
  canonicalHash,
  verifyNonblankCanvasPng,
} from './check-completion.rules';
import { MaintenanceAssigneesPort } from '../../auth/actor-directory.port';
import { AssignMaintenanceDto } from './unit-readiness.dto';
import { ReadinessAudit } from './readiness-settings.entity';

@Injectable()
export class ReadinessHoldsService {
  constructor(
    private readonly db: DataSource,
    private readonly calendars: FacilityCalendarPort,
    private readonly units: UnitOperationCoordinator,
    private readonly directory: MaintenanceAssigneesPort,
  ) {}
  async assignees(unidadId: string, actor: TrustedActor) {
    await this.authorize(this.db.manager, unidadId, actor);
    if (!actor.roles.includes(Rol.SUPERVISOR))
      throw new ForbiddenException(
        'La asignación de mantenimiento requiere Supervisor.',
      );
    const { mapping } = await this.calendars.resolve(
      unidadId,
      this.db.manager,
      new Date(),
    );
    return {
      items: await this.directory.maintenanceAssignees(mapping.facilityId),
    };
  }
  async assign(
    unidadId: string,
    orderId: string,
    dto: AssignMaintenanceDto,
    actor: TrustedActor,
  ) {
    return this.db.transaction(async (manager) => {
      await this.units.lock(manager, unidadId);
      await this.authorize(manager, unidadId, actor);
      if (!actor.roles.includes(Rol.SUPERVISOR))
        throw new ForbiddenException('Solo Supervisor asigna mantenimiento.');
      const { mapping } = await this.calendars.resolve(
        unidadId,
        manager,
        new Date(),
      );
      const candidates = await this.directory.maintenanceAssignees(
        mapping.facilityId,
      );
      if (!candidates.some((c) => c.subject === dto.assignedActorId))
        throw new BadRequestException(
          'Selecciona un mecánico activo del facility.',
        );
      const order = await this.order(manager, unidadId, orderId);
      if (
        order.version !== dto.expectedVersion ||
        !['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(order.workOrderStatus)
      )
        throw new ConflictException('La orden cambió o ya no está activa.');
      const previous = order.assignedUserId;
      order.assignedUserId = dto.assignedActorId;
      order.assignedAt = new Date();
      await manager.save(order);
      await manager.save(ReadinessAudit, {
        id: randomUUID(),
        facilityId: mapping.facilityId,
        actorId: actor.subject,
        event: 'MAINTENANCE_ASSIGNED',
        details: { orderId, previous, assignedTo: order.assignedUserId },
        createdAt: new Date(),
      });
      return {
        id: order.id,
        assignedTo: order.assignedUserId,
        version: order.version,
      };
    });
  }
  async authorize(
    manager: EntityManager,
    unidadId: string,
    actor: TrustedActor,
  ) {
    validateActor(actor, process.env.NODE_ENV);
    const { mapping } = await this.calendars.resolve(
      unidadId,
      manager,
      new Date(),
    );
    if (!actor.facilityScopes.includes(mapping.facilityId))
      throw new ForbiddenException('Unidad fuera de tu facility.');
  }
  private async order(
    manager: EntityManager,
    unidadId: string,
    orderId: string,
  ) {
    const order = await manager.findOne(Visita, {
      where: {
        id: orderId,
        unidad: { id: unidadId },
        workOrderType: In(maintenanceTypes),
      },
    });
    if (!order)
      throw new NotFoundException('No se encontró la orden de esta unidad.');
    return order;
  }
  async create(
    unidadId: string,
    dto: CreateReadinessHoldDto,
    actor: TrustedActor,
  ) {
    validateActor(actor, process.env.NODE_ENV);
    if (
      !actor.roles.some((r) => [Rol.MECANICO, Rol.LOGISTICA].includes(r as Rol))
    )
      throw new ForbiddenException(
        'Solo mecánico o control tower puede retener por seguridad.',
      );
    if (!dto.reason.trim())
      throw new BadRequestException('Describe el problema de seguridad.');
    return this.db.transaction(async (manager) => {
      await this.units.lock(manager, unidadId);
      await this.authorize(manager, unidadId, actor);
      await this.order(manager, unidadId, dto.orderId);
      const existing = await manager.findOneBy(ReadinessHold, {
        actorId: actor.subject,
        commandId: dto.idempotencyKey,
      });
      if (existing) {
        if (
          existing.unidadId !== unidadId ||
          existing.orderId !== dto.orderId ||
          existing.reason !== dto.reason.trim()
        )
          throw new ConflictException(
            'El identificador ya se utilizó con otro contenido.',
          );
        return existing;
      }
      return manager.save(ReadinessHold, {
        id: randomUUID(),
        unidadId,
        orderId: dto.orderId,
        reason: dto.reason.trim(),
        actorId: actor.subject,
        actorName: actor.displayName,
        commandId: dto.idempotencyKey,
        createdAt: new Date(),
        verificationId: null,
      });
    });
  }
  async verify(
    unidadId: string,
    dto: VerifyReadinessHoldsDto,
    actor: TrustedActor,
  ) {
    validateActor(actor, process.env.NODE_ENV);
    if (!actor.roles.includes(Rol.MECANICO))
      throw new ForbiddenException('La verificación requiere un mecánico.');
    if (!dto.observation.trim())
      throw new BadRequestException(
        'Registra tu verificación personal de la reparación.',
      );
    let signature: ReturnType<typeof verifyNonblankCanvasPng>;
    try {
      signature = verifyNonblankCanvasPng(
        dto.signatureDataUrl,
        640,
        180,
        1024 * 1024,
      );
    } catch {
      throw new BadRequestException(
        'La firma debe ser PNG, válida y no vacía.',
      );
    }
    const requestHash = canonicalHash({
      unidadId,
      orderId: dto.orderId,
      holdIds: [...dto.holdIds].sort(),
      observation: dto.observation.trim(),
      signatureHash: signature.sha256,
    });
    return this.db.transaction(async (manager) => {
      await this.units.lock(manager, unidadId);
      await this.authorize(manager, unidadId, actor);
      const prior = await manager.findOneBy(RepairVerification, {
        actorId: actor.subject,
        commandId: dto.idempotencyKey,
      });
      if (prior) {
        if (prior.requestHash !== requestHash)
          throw new ConflictException(
            'El identificador ya se utilizó con otra firma o contenido.',
          );
        return {
          id: prior.id,
          createdAt: prior.createdAt,
          outcome: 'VERIFIED',
        };
      }
      const order = await this.order(manager, unidadId, dto.orderId);
      if (order.workOrderStatus !== WorkOrderStatus.COMPLETED)
        throw new ConflictException(
          'Cierra la orden antes de verificar la reparación.',
        );
      const holds = await manager.find(ReadinessHold, {
        where: {
          id: In(dto.holdIds),
          unidadId,
          orderId: dto.orderId,
          verificationId: IsNull(),
        },
      });
      if (holds.length !== dto.holdIds.length)
        throw new ConflictException(
          'Las retenciones cambiaron. Recarga y revisa los bloqueos actuales.',
        );
      const id = randomUUID(),
        createdAt = new Date();
      await manager.save(RepairVerification, {
        id,
        unidadId,
        orderId: dto.orderId,
        actorId: actor.subject,
        actorName: actor.displayName,
        commandId: dto.idempotencyKey,
        requestHash,
        snapshot: {
          holds: holds.map((h) => ({
            id: h.id,
            reason: h.reason,
            createdAt: h.createdAt,
          })),
          observation: dto.observation.trim(),
          orderVersion: order.version,
          signer: {
            subject: actor.subject,
            name: actor.displayName,
            attribution: actor.attributionLevel,
          },
        },
        signatureDataUrl: dto.signatureDataUrl,
        signatureHash: signature.sha256,
        createdAt,
      });
      await manager.update(
        ReadinessHold,
        { id: In(dto.holdIds) },
        { verificationId: id },
      );
      return { id, createdAt, outcome: 'VERIFIED' };
    });
  }
}
