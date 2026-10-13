import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  In,
  Not,
  IsNull,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/current-user';
import { Rol } from '../auth/roles.enum';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { ChoferesService } from '../choferes/choferes.service';
import { Chofer } from '../choferes/chofer.entity';
import { puedeAsignarChoferAVisita } from '../choferes/estado-chofer.enum';
import {
  OrigenConsumo,
  VISITA_CERRADA,
  buildVisitaCerrada,
} from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { UnidadesService } from '../unidades/unidades.service';
import { Unidad } from '../unidades/unidad.entity';
import { erroresCierre, mensajeKmInvalido } from './close-rules';
import { EstadoVisita, TipoFirma } from './enums';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { UpdateVisitaDto } from './dto/update-visita.dto';
import { esTrabajoCatalogo } from './trabajos-catalogo';
import { InventoryMaterialsPort } from '../inventario/materials.port';
import { MaterialCommandDto } from './dto/material-command.dto';
import { decimal as exact, formatDecimal } from '../inventario/cost-decimal';
import { Visita } from './visita.entity';
import {
  maintenanceTypes,
  canonicalMaintenanceType,
  WorkOrderStatus,
  LEGACY_SLOT_INDEX,
} from './work-order';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';
import { CheckInvalidation } from './checks/check-invalidation.entity';
import { CheckAuditEvent } from './checks/check-audit.entity';
import { CheckInspection } from './checks/check-inspection.entity';
import { UnitOperationCoordinator } from '../kernel/unit-operation.module';

@Injectable()
export class VisitasService {
  constructor(
    @InjectRepository(Visita)
    private readonly repo: Repository<Visita>,
    @InjectRepository(VisitaTrabajo)
    private readonly trabajos: Repository<VisitaTrabajo>,
    @InjectRepository(VisitaFoto)
    private readonly fotos: Repository<VisitaFoto>,
    @InjectRepository(VisitaFirma)
    private readonly firmas: Repository<VisitaFirma>,
    @InjectRepository(VisitaPieza)
    private readonly piezas: Repository<VisitaPieza>,
    private readonly unidades: UnidadesService,
    private readonly choferes: ChoferesService,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
    private readonly unitOperations: UnitOperationCoordinator,
    private readonly materials: InventoryMaterialsPort,
  ) {}

  async createDraft(unidadId: string, dto: CreateVisitaDto, user: CurrentUser) {
    return this.createMaintenance(unidadId, dto, user, true);
  }

  async createMaintenance(
    unidadId: string,
    dto: CreateVisitaDto,
    user: CurrentUser,
    legacySlot: boolean,
    metadata: Partial<
      Pick<
        Visita,
        | 'blocksOperation'
        | 'blockReason'
        | 'blockActor'
        | 'requiresReinspection'
        | 'createdActorName'
        | 'attributionLevel'
        | 'creationKey'
        | 'creationHash'
      >
    > = {},
    authorizeInTransaction?: (manager: EntityManager) => Promise<void>,
  ) {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        await authorizeInTransaction?.(manager);
        const existing = legacySlot
          ? await manager.findOne(Visita, {
              where: {
                unidad: { id: unidadId },
                estado: EstadoVisita.BORRADOR,
                legacyCompatDraft: true,
                workOrderType: In(maintenanceTypes),
              },
            })
          : null;
        if (existing) {
          return { outcome: 'EXISTING_DRAFT' as const, id: existing.id };
        }

        const unidad = await manager.findOne(Unidad, {
          where: { id: unidadId },
          relations: { tipo: true },
        });
        if (!unidad) {
          throw new NotFoundException('No se encontró la unidad.');
        }
        if (unidad.estado !== EstadoUnidad.ACTIVA) {
          throw new BadRequestException(
            'No se puede crear una visita porque la unidad está inactiva.',
          );
        }

        const chofer = await manager.findOne(Chofer, {
          where: { id: dto.choferId },
        });
        if (!chofer) {
          throw new NotFoundException('No se encontró el chofer.');
        }
        if (!puedeAsignarChoferAVisita(chofer.estado)) {
          throw new BadRequestException(
            'El chofer no está activo. Seleccione un chofer activo.',
          );
        }

        const ultimo = await manager.findOne(Visita, {
          where: {
            unidad: { id: unidadId },
            estado: EstadoVisita.CERRADO,
            workOrderType: In(maintenanceTypes),
          },
          order: { cerradoAt: 'DESC' },
        });
        const errorKm = mensajeKmInvalido(dto.km, ultimo?.km ?? null);
        if (errorKm) {
          throw new BadRequestException(errorKm);
        }

        const visita = manager.create(Visita, {
          unidad,
          estado: EstadoVisita.BORRADOR,
          workOrderType: canonicalMaintenanceType(dto.tipo),
          workOrderStatus: WorkOrderStatus.PENDING,
          legacyCompatDraft: legacySlot,
          ...metadata,
          createdBy: user.userId,
          chofer,
          km: dto.km,
          tipo: dto.tipo,
          observaciones: null,
          trabajos: [],
          fotos: [],
          firmas: [],
          piezas: [],
        });
        const saved = await manager.save(visita);
        return { outcome: 'CREATED' as const, id: saved.id };
      });
      const detail = await this.findDetalle(result.id, user);
      return { outcome: result.outcome, ...detail };
    } catch (error: unknown) {
      if (!this.isSingleDraftViolation(error)) throw error;
      const winner = await this.repo.findOne({
        where: {
          unidad: { id: unidadId },
          estado: EstadoVisita.BORRADOR,
          workOrderType: In(maintenanceTypes),
          legacyCompatDraft: true,
        },
      });
      if (!winner) throw error;
      const detail = await this.findDetalle(winner.id, user);
      return { outcome: 'EXISTING_DRAFT' as const, ...detail };
    }
  }

  private isSingleDraftViolation(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;
    const direct = error as { code?: string; constraint?: string };
    const wrapped =
      'driverError' in error
        ? (error.driverError as { code?: string; constraint?: string })
        : undefined;
    return (
      (direct.code === '23505' && direct.constraint === LEGACY_SLOT_INDEX) ||
      (wrapped?.code === '23505' && wrapped.constraint === LEGACY_SLOT_INDEX)
    );
  }

  async findDetalle(id: string, user: CurrentUser, manager?: EntityManager) {
    const visita = await (manager ? manager.getRepository(Visita) : this.repo).findOne({
      where: { id, workOrderType: In(maintenanceTypes), estado: Not(IsNull()) },
      relations: {
        trabajos: true,
        fotos: true,
        firmas: true,
        piezas: true,
        chofer: true,
        unidad: { tipo: true },
      },
    });
    if (!visita) {
      throw new NotFoundException('No se encontró la visita.');
    }
    if (
      user.rol === Rol.ADMIN_DIRECTIVO &&
      visita.estado === EstadoVisita.BORRADOR
    ) {
      throw new NotFoundException('No se encontró la visita.');
    }
    return this.toDetalle(visita);
  }

  async listByUnidad(unidadId: string, user: CurrentUser) {
    await this.unidades.findOne(unidadId);
    const visitas = await this.repo.find({
      where: {
        unidad: { id: unidadId },
        workOrderType: In(maintenanceTypes),
        estado: Not(IsNull()),
      },
      relations: { chofer: true, trabajos: true },
      order: { createdAt: 'DESC' },
    });
    const visibles =
      user.rol === Rol.ADMIN_DIRECTIVO
        ? visitas.filter((v) => v.estado === EstadoVisita.CERRADO)
        : visitas;
    return visibles.map((v) => this.toResumen(v));
  }

  async updateDraft(id: string, dto: UpdateVisitaDto, _user: CurrentUser) {
    return this.dataSource.transaction(async manager => {
    await manager.query('SELECT id FROM public.visitas WHERE id=$1 FOR UPDATE', [id]);
    const visita = await this.requireDraft(id, manager);
    if (dto.choferId !== undefined) {
      visita.chofer = dto.choferId
        ? await this.choferes.requireActivo(dto.choferId)
        : null;
    }
    if (dto.km !== undefined) {
      if (dto.km != null) {
        await this.assertKmPersistible(visita.unidad.id, dto.km);
      }
      visita.km = dto.km;
    }
    if (dto.tipo !== undefined) {
      visita.tipo = dto.tipo;
      if (dto.tipo !== null)
        visita.workOrderType = canonicalMaintenanceType(dto.tipo);
    }
    if (dto.observaciones !== undefined) {
      visita.observaciones = dto.observaciones?.trim() || null;
    }
    await manager.getRepository(Visita).save(visita);

    if (dto.trabajos) {
      this.assertTrabajosCatalogo(dto.trabajos);
      await manager.getRepository(VisitaTrabajo).delete({ visita: { id } });
      if (dto.trabajos.length) {
        await manager.getRepository(VisitaTrabajo).save(
          dto.trabajos.map((trabajo) =>
            manager.getRepository(VisitaTrabajo).create({
              visita: { id } as Visita,
              categoria: trabajo.categoria,
              item: trabajo.item,
            }),
          ),
        );
      }
    }
    if (dto.fotos) {
      await manager.getRepository(VisitaFoto).delete({ visita: { id } });
      if (dto.fotos.length) {
        await manager.getRepository(VisitaFoto).save(
          dto.fotos.map((foto) =>
            manager.getRepository(VisitaFoto).create({
              visita: { id } as Visita,
              dataUrl: foto.dataUrl,
            }),
          ),
        );
      }
    }
    if (dto.firmas) {
      await manager.getRepository(VisitaFirma).delete({ visita: { id } });
      const byTipo = new Map(dto.firmas.map((firma) => [firma.tipo, firma]));
      if (byTipo.size) {
        await manager.getRepository(VisitaFirma).save(
          [...byTipo.values()].map((firma) =>
            manager.getRepository(VisitaFirma).create({
              visita: { id } as Visita,
              tipo: firma.tipo,
              dataUrl: firma.dataUrl,
            }),
          ),
        );
      }
    }
    if (dto.piezas) {
      await this.replacePiezas(id, dto.piezas, manager);
    }

    return this.findDetalle(id, _user, manager);
    });
  }

  async removeDraft(id: string) {
    await this.dataSource.transaction(async manager => {
      await manager.query('SELECT id FROM public.visitas WHERE id=$1 FOR UPDATE', [id]);
      const visita = await manager.findOneBy(Visita, { id, workOrderType: In(maintenanceTypes) });
      if (!visita) throw new NotFoundException('No se encontró la visita.');
      if (visita.estado !== EstadoVisita.BORRADOR) throw new BadRequestException('La visita no es un borrador disponible.');
      if (await this.materials.hasPostings(manager, id)) throw new BadRequestException('Esta orden tiene movimientos contabilizados. Conserva la orden y corrige los destinos físicos; no se puede eliminar su historial.');
      await manager.delete(VisitaFirma, { visita: { id } });
      await manager.delete(VisitaFoto, { visita: { id } });
      await manager.delete(VisitaTrabajo, { visita: { id } });
      await manager.delete(VisitaPieza, { visita: { id } });
      await manager.remove(visita);
    });
    return { message: 'Borrador eliminado.' };
  }

  async materialsRead(id: string, user: CurrentUser) {
    await this.findDetalle(id, user);
    return this.materials.read(id);
  }

  async materialsCommand(id: string, dto: MaterialCommandDto, user: CurrentUser) {
    const result = await this.dataSource.transaction(async manager => {
      await manager.query('SELECT id FROM public.visitas WHERE id=$1 FOR UPDATE', [id]);
      const visita = await manager.findOneBy(Visita, { id, workOrderType: In(maintenanceTypes) });
      if (!visita || visita.estado === null || visita.workOrderStatus === WorkOrderStatus.CANCELLED) throw new NotFoundException('No se encontró la orden disponible.');
      return this.materials.command(manager, id, dto.key, dto.revision, dto.command, user, visita.estado === EstadoVisita.CERRADO);
    });
    await this.materials.reconcile(id);
    return result;
  }

  async materialsReceipt(id: string, purchaseId: string, dataUrl: string, user: CurrentUser) {
    await this.findDetalle(id, user);
    return this.dataSource.transaction(async manager => {
      await manager.query('SELECT id FROM public.visitas WHERE id=$1 FOR UPDATE', [id]);
      return this.materials.attachReceipt(manager, id, purchaseId, dataUrl, user);
    });
  }

  async readMaterialsReceipt(id: string, purchaseId: string, user: CurrentUser) {
    await this.findDetalle(id, user);
    return this.materials.receipt(id, purchaseId);
  }

  async close(id: string, user: CurrentUser) {
    await this.dataSource.transaction(async (manager) => {
      let visita = await manager.findOne(Visita, {
        where: {
          id,
          workOrderType: In(maintenanceTypes),
          estado: Not(IsNull()),
        },
        relations: {
          chofer: true,
          unidad: { tipo: true },
          trabajos: true,
          firmas: true,
          piezas: true,
        },
      });
      if (!visita) {
        throw new NotFoundException('No se encontró la visita.');
      }
      await this.unitOperations.lock(manager, visita.unidad.id);
      await manager.query('SELECT id FROM public.visitas WHERE id=$1 FOR UPDATE', [id]);
      visita = await manager.findOneOrFail(Visita, { where: { id }, relations: { chofer: true, unidad: { tipo: true }, trabajos: true, firmas: true, piezas: true } });
      const materialView = await this.materials.read(id, manager);
      if (materialView.summary.pendingDestinations.length) throw new BadRequestException('Faltan piezas por asignar a un destino antes de cerrar.');
      const ultimoKm = await this.ultimoKmCerrado(visita.unidad.id);
      const errores = erroresCierre({
        estadoVisita: visita.estado!,
        unidadEstado: visita.unidad.estado,
        choferId: visita.chofer?.id ?? null,
        km: visita.km,
        ultimoKmCerrado: ultimoKm,
        tipo: visita.tipo,
        trabajos: visita.trabajos.length,
        firmas: visita.firmas.map((firma) => firma.tipo),
      });
      if (errores.length) {
        throw new BadRequestException(errores[0]);
      }
      if (visita.chofer && !puedeAsignarChoferAVisita(visita.chofer.estado)) {
        throw new BadRequestException(
          'El chofer no está activo. Seleccione un chofer activo.',
        );
      }
      visita.estado = EstadoVisita.CERRADO;
      visita.cerradoAt = new Date();
      visita.workOrderStatus = WorkOrderStatus.COMPLETED;
      visita.completedAt = visita.cerradoAt;
      visita.legacyCompatDraft = false;
      await manager.save(visita);
      const eventId = randomUUID();
      const legacy = (visita.piezas ?? []).map(pieza => ({ itemId: pieza.itemId, qty: pieza.qty, origen: pieza.origen }));
      await this.materials.prepareClose(manager, visita.id, eventId, legacy);
      const posted = materialView.state.postings.filter(p => ['WAREHOUSE_USE', 'DIRECT_USE'].includes(p.kind))
        .map(p => {
          const reversals = materialView.state.postings.filter(r => r.reverses === p.id && r.kind === 'USE_REVERSAL');
          const net = exact(p.qty) + reversals.reduce((sum, r) => sum + exact(r.qty), 0n);
          return { itemId: p.itemId, qty: Number(formatDecimal(net)), origen: p.kind === 'WAREHOUSE_USE' ? OrigenConsumo.DESDE_STOCK : OrigenConsumo.COMPRA_EXTERNA };
        }).filter(p => p.qty > 0);
      const payload = buildVisitaCerrada({
        eventId,
        visitaId: visita.id,
        unidadId: visita.unidad.id,
        tipoVehiculoId: visita.unidad.tipo.id,
        km: visita.km as number,
        cerradoAt: visita.cerradoAt,
        consumos: [...legacy, ...posted],
      });
      await this.outbox.enqueueAndDispatch(manager, VISITA_CERRADA, payload);
      if (visita.requiresReinspection) {
        const completedCheck = await manager
          .getRepository(Visita)
          .createQueryBuilder('check')
          .innerJoin(
            CheckInspection,
            'inspection',
            'inspection.visita_id=check.id',
          )
          .where('check.unidad_id=:unidadId', { unidadId: visita.unidad.id })
          .andWhere("check.work_order_type='CHECK'")
          .andWhere("check.work_order_status='COMPLETED'")
          .andWhere('inspection.snapshot_hash IS NOT NULL')
          .andWhere('inspection.day_end_instant>:now', { now: new Date() })
          .orderBy('check.completed_at', 'DESC')
          .getOne();
        if (completedCheck) {
          const sourceEventId = `maintenance:${visita.id}:completed`;
          const existing = await manager.findOneBy(CheckInvalidation, {
            sourceEventId,
          });
          if (!existing) {
            const actorId = user.userId ?? `legacy:${user.rol}`;
            const invalidationRow: CheckInvalidation = manager.create(
              CheckInvalidation,
              {
                id: randomUUID(),
                checkId: completedCheck.id,
                unidadId: visita.unidad.id,
                type: 'MAINTENANCE_REINSPECTION_REQUIRED' as const,
                reason:
                  'El mantenimiento completado requiere reinspección explícita.',
                sourceEventId,
                actorId,
                actorName: actorId,
                sourceWorkOrderId: visita.id,
              },
            );
            const invalidation = await manager.save(invalidationRow);
            await manager.save(
              CheckAuditEvent,
              manager.create(CheckAuditEvent, {
                id: randomUUID(),
                checkId: completedCheck.id,
                unidadId: visita.unidad.id,
                event: 'INVALIDATED',
                actorId,
                actorName: actorId,
                details: {
                  invalidationId: invalidation.id,
                  type: invalidation.type,
                  sourceEventId,
                  sourceWorkOrderId: visita.id,
                },
              }),
            );
            await this.outbox.enqueueAndDispatch(manager, 'CHECK_INVALIDATED', {
              eventId: randomUUID(),
              eventType: 'CHECK_INVALIDATED',
              schemaVersion: 1,
              occurredAt: invalidation.createdAt.toISOString(),
              actorRef: actorId,
              unidadId: visita.unidad.id,
              checkId: completedCheck.id,
              invalidationId: invalidation.id,
              sourceEventId,
              reason: invalidation.reason,
              type: invalidation.type,
              sourceWorkOrderId: visita.id,
            });
          }
        }
      }
    });
    return this.findDetalle(id, user);
  }

  async ultimoKmCerrado(unidadId: string): Promise<number | null> {
    const last = await this.repo.findOne({
      where: {
        unidad: { id: unidadId },
        estado: EstadoVisita.CERRADO,
        workOrderType: In(maintenanceTypes),
      },
      order: { cerradoAt: 'DESC' },
    });
    return last?.km ?? null;
  }

  async listBorradores(unidadId: string) {
    const visitas = await this.repo.find({
      where: {
        unidad: { id: unidadId },
        estado: EstadoVisita.BORRADOR,
        workOrderType: In(maintenanceTypes),
        legacyCompatDraft: true,
      },
      relations: { chofer: true, trabajos: true },
      order: { updatedAt: 'DESC' },
    });
    return visitas.map((v) => this.toResumen(v));
  }

  async listHistorial(unidadId: string) {
    const visitas = await this.repo.find({
      where: {
        unidad: { id: unidadId },
        estado: EstadoVisita.CERRADO,
        workOrderType: In(maintenanceTypes),
      },
      relations: { chofer: true, trabajos: true },
      order: { cerradoAt: 'DESC' },
    });
    return visitas.map((v) => this.toResumen(v));
  }

  private async assertKmPersistible(unidadId: string, km: number) {
    const ultimo = await this.ultimoKmCerrado(unidadId);
    const error = mensajeKmInvalido(km, ultimo);
    if (error) {
      throw new BadRequestException(error);
    }
  }

  private assertTrabajosCatalogo(
    trabajos: { categoria: string; item: string }[],
  ) {
    for (const trabajo of trabajos) {
      if (!esTrabajoCatalogo(trabajo.categoria, trabajo.item)) {
        throw new BadRequestException(
          `El trabajo «${trabajo.item}» no pertenece a la categoría ${trabajo.categoria}.`,
        );
      }
    }
  }

  private async replacePiezas(
    visitaId: string,
    piezas: { itemId: string; qty: number; origen: OrigenConsumo }[],
    manager = this.dataSource.manager,
  ) {
    const seen = new Set<string>();
    for (const pieza of piezas) {
      if (seen.has(pieza.itemId)) {
        throw new BadRequestException(
          'No se puede repetir el mismo SKU en las piezas de la visita.',
        );
      }
      seen.add(pieza.itemId);
      if (pieza.qty <= 0) {
        throw new BadRequestException(
          'La cantidad de cada pieza debe ser positiva.',
        );
      }
    }
    await manager.getRepository(VisitaPieza).delete({ visita: { id: visitaId } });
    if (piezas.length) {
      await manager.getRepository(VisitaPieza).save(
        piezas.map((pieza) =>
          manager.getRepository(VisitaPieza).create({
            visita: { id: visitaId } as Visita,
            itemId: pieza.itemId,
            qty: pieza.qty,
            origen: pieza.origen,
          }),
        ),
      );
    }
  }

  private async requireDraft(id: string, manager?: EntityManager) {
    const visita = await (manager ? manager.getRepository(Visita) : this.repo).findOne({
      where: { id, workOrderType: In(maintenanceTypes), estado: Not(IsNull()) },
      relations: { chofer: true, unidad: true },
    });
    if (!visita) {
      throw new NotFoundException('No se encontró la visita.');
    }
    if (visita.estado !== EstadoVisita.BORRADOR) {
      throw new BadRequestException(
        'La visita ya está cerrada y no se puede modificar.',
      );
    }
    return visita;
  }

  toResumen(visita: Visita) {
    return {
      id: visita.id,
      estado: visita.estado,
      tipo: visita.tipo,
      km: visita.km,
      choferId: visita.chofer?.id ?? null,
      choferNombre: visita.chofer?.nombre ?? null,
      createdBy: visita.createdBy,
      createdAt: visita.createdAt,
      updatedAt: visita.updatedAt,
      cerradoAt: visita.cerradoAt,
      openedAt: visita.openedAt ?? null,
      openedBy: visita.openedBy ?? null,
      trabajosCount: visita.trabajos?.length ?? 0,
    };
  }

  toDetalle(visita: Visita) {
    const piezas = visita.piezas ?? [];
    return {
      id: visita.id,
      unidadId: visita.unidad.id,
      unidadNumeroInterno: visita.unidad.numeroInterno,
      tipoVehiculoId: visita.unidad.tipo?.id ?? null,
      tipoVehiculoNombre: visita.unidad.tipo?.nombre ?? null,
      estado: visita.estado,
      chofer: visita.chofer
        ? {
            id: visita.chofer.id,
            nombre: visita.chofer.nombre,
            estado: visita.chofer.estado,
          }
        : null,
      km: visita.km,
      tipo: visita.tipo,
      observaciones: visita.observaciones,
      createdBy: visita.createdBy,
      createdAt: visita.createdAt,
      updatedAt: visita.updatedAt,
      cerradoAt: visita.cerradoAt,
      openedAt: visita.openedAt ?? null,
      openedBy: visita.openedBy ?? null,
      trabajos: (visita.trabajos ?? [])
        .slice()
        .sort((a, b) =>
          a.categoria === b.categoria
            ? a.item.localeCompare(b.item, 'es')
            : a.categoria.localeCompare(b.categoria),
        )
        .map((trabajo) => ({
          id: trabajo.id,
          categoria: trabajo.categoria,
          item: trabajo.item,
        })),
      fotos: (visita.fotos ?? []).map((foto) => ({
        id: foto.id,
        dataUrl: foto.dataUrl,
        createdAt: foto.createdAt,
      })),
      firmas: (visita.firmas ?? []).map((firma) => ({
        id: firma.id,
        tipo: firma.tipo as TipoFirma,
        dataUrl: firma.dataUrl,
        createdAt: firma.createdAt,
      })),
      piezas: piezas.map((pieza) => ({
        id: pieza.id,
        itemId: pieza.itemId,
        qty: pieza.qty,
        origen: pieza.origen,
      })),
    };
  }
}
