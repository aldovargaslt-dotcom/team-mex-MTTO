import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { FacilityCalendarPort } from '../visitas/checks/facility-calendar.port';
import { UnitReferencePort } from './unit-reference.port';
import { CreateInsuranceVersionDto } from './vehicle-documents.dto';
import {
  VEHICLE_DOCUMENT_TYPE,
  VehicleDocumentVersion,
} from './vehicle-document.entity';
import {
  InsurancePolicySnapshot,
  VehicleInsurancePolicyPort,
} from './vehicle-insurance.port';
import { evaluateInsurance } from './vehicle-insurance.rules';
import { UnitOperationCoordinator } from '../kernel/unit-operation.module';

@Injectable()
export class VehicleDocumentsService extends VehicleInsurancePolicyPort {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VehicleDocumentVersion)
    private readonly documents: Repository<VehicleDocumentVersion>,
    private readonly units: UnitReferencePort,
    private readonly calendars: FacilityCalendarPort,
    private readonly unitOperations: UnitOperationCoordinator,
  ) {
    super();
  }

  async currentInsurance(unidadId: string, actor: TrustedActor) {
    await this.assertUnit(unidadId);
    const calendar = await this.assertScope(
      unidadId,
      actor,
      this.dataSource.manager,
    );
    const operationalDate = calendar.day.operationalDate;
    return (await this.evaluateBatch([{ unidadId, operationalDate }])).get(
      unidadId,
    )!;
  }

  async createInsuranceVersion(
    unidadId: string,
    dto: CreateInsuranceVersionDto,
    actor: TrustedActor,
  ) {
    await this.assertUnit(unidadId);
    return this.dataSource.transaction(async (manager) => {
      await this.unitOperations.lock(manager, unidadId);
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`vehicle-document:${unidadId}:${VEHICLE_DOCUMENT_TYPE}`],
      );
      await this.assertScope(unidadId, actor, manager);
      const current = await manager.findOne(VehicleDocumentVersion, {
        where: { unidadId, documentType: VEHICLE_DOCUMENT_TYPE, current: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (current && dto.expectedVersion == null) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_REQUIRED',
          message: 'Indica la versión vigente antes de reemplazar la póliza.',
          currentVersion: current.version,
        });
      }
      if (current && dto.expectedVersion !== current.version) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_CONFLICT',
          message: 'La póliza cambió. Actualiza y vuelve a intentar.',
          currentVersion: current.version,
        });
      }
      if (!current && dto.expectedVersion != null) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_CONFLICT',
          message: 'La unidad todavía no tiene una póliza vigente.',
          currentVersion: null,
        });
      }
      if (current) {
        current.current = false;
        await manager.save(current);
      }
      const created = manager.create(VehicleDocumentVersion, {
        unidadId,
        documentType: VEHICLE_DOCUMENT_TYPE,
        expirationDate: dto.expirationDate,
        version: (current?.version ?? 0) + 1,
        current: true,
        issuer: dto.issuer?.trim() || null,
        reference: dto.reference?.trim() || null,
        objectKey: null,
        supersedesId: current?.id ?? null,
        createdBy: actor.subject,
      });
      return manager.save(created);
    });
  }

  async evaluateBatch(
    requests: { unidadId: string; operationalDate: string }[],
    transactionContext?: EntityManager,
  ): Promise<Map<string, InsurancePolicySnapshot>> {
    const result = new Map<string, InsurancePolicySnapshot>();
    if (!requests.length) return result;
    const manager = transactionContext ?? this.dataSource.manager;
    try {
      const rows = await manager.find(VehicleDocumentVersion, {
        where: {
          unidadId: In([
            ...new Set(requests.map((request) => request.unidadId)),
          ]),
          documentType: VEHICLE_DOCUMENT_TYPE,
          current: true,
        },
      });
      const byUnit = new Map(rows.map((row) => [row.unidadId, row]));
      for (const request of requests) {
        const current = byUnit.get(request.unidadId) ?? null;
        result.set(request.unidadId, {
          unidadId: request.unidadId,
          ...evaluateInsurance(current, request.operationalDate),
          documentId: current?.id ?? null,
          version: current?.version ?? null,
          expirationDate: current?.expirationDate ?? null,
        });
      }
      return result;
    } catch {
      for (const request of requests) {
        result.set(request.unidadId, {
          unidadId: request.unidadId,
          status: 'SOURCE_UNAVAILABLE',
          reason: 'POLICY_SOURCE_UNAVAILABLE',
          operationalDate: request.operationalDate,
          documentId: null,
          version: null,
          expirationDate: null,
        });
      }
      return result;
    }
  }

  private async assertUnit(unidadId: string) {
    if (!(await this.units.exists(unidadId))) {
      throw new NotFoundException('No se encontró la unidad.');
    }
  }

  private async assertScope(
    unidadId: string,
    actor: TrustedActor,
    manager: EntityManager,
  ) {
    const calendar = await this.calendars.resolve(
      unidadId,
      manager,
      new Date(),
    );
    if (!actor.facilityScopes.includes(calendar.mapping.facilityId)) {
      throw new ForbiddenException({
        code: 'FACILITY_SCOPE_FORBIDDEN',
        message: 'La unidad está fuera del facility autorizado.',
        details: {},
      });
    }
    return calendar;
  }
}
