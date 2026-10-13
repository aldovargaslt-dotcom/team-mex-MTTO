import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertasService } from '../alertas/alertas.service';
import { AndonService } from '../andon/andon.service';
import { CurrentUser } from '../auth/current-user';
import { Rol } from '../auth/roles.enum';
import { InventarioService } from '../inventario/inventario.service';
import { SaludService } from '../salud/salud.service';
import {
  canEditThresholds,
  canMutateTypes,
  familyVisibleToRole,
  isValidAlertCode,
  listVisibleTypes,
  MSG_CODIGO_DUPLICADO,
  MSG_CODIGO_INVALIDO,
  MSG_SIN_PERMISO_TIPO,
  MSG_SIN_PERMISO_UMBRAL,
  MSG_TIPO_NO_ENCONTRADO,
} from './alert-catalog.rules';
import {
  AlertTypeRecord,
  SEED_ALERT_CODES,
  SEED_ALERT_TYPES,
  ThresholdMode,
} from './alert-catalog.types';
import {
  CreateAlertTypeDto,
  PatchCatalogUmbralesDto,
} from './dto/alert-catalog.dto';
import {
  ActiveAttention,
  AttentionResponse,
  comparePriorities,
} from './attention.types';
import { ThresholdChangeEntity } from './entities/threshold-change.entity';
import { AlertTypeEntity } from './entities/alert-type.entity';
import { AlertTypeActivePort } from './ports';

@Injectable()
export class AlertCatalogService implements OnModuleInit, AlertTypeActivePort {
  constructor(
    @InjectRepository(AlertTypeEntity)
    private readonly tipos: Repository<AlertTypeEntity>,
    private readonly alertas: AlertasService,
    @Optional()
    @Inject(forwardRef(() => AndonService))
    private readonly andon?: AndonService,
    @Optional()
    @Inject(forwardRef(() => InventarioService))
    private readonly inventario?: InventarioService,
    @Optional()
    @Inject(forwardRef(() => SaludService))
    private readonly salud?: SaludService,
  ) {}

  async onModuleInit() {
    await this.seedTypes();
  }

  async seedTypes() {
    for (const seed of SEED_ALERT_TYPES) {
      const existing = await this.tipos.findOne({ where: { code: seed.code } });
      if (existing) continue;
      await this.tipos.save(this.tipos.create(seed));
    }
  }

  async isActive(code: string): Promise<boolean> {
    const row = await this.tipos.findOne({ where: { code } });
    if (!row) {
      const seed = SEED_ALERT_TYPES.find((t) => t.code === code);
      return seed?.active ?? false;
    }
    return row.active;
  }

  async list(rol: Rol): Promise<AlertTypeRecord[]> {
    const rows = await this.loadAll();
    return listVisibleTypes(rows, rol);
  }

  async getVisible(code: string, rol: Rol): Promise<AlertTypeRecord> {
    const row = await this.requireType(code);
    if (
      !familyVisibleToRole(row.family, rol) ||
      (!row.active && rol !== Rol.ADMIN_DIRECTIVO)
    ) {
      throw new NotFoundException(MSG_TIPO_NO_ENCONTRADO);
    }
    return row;
  }

  async create(dto: CreateAlertTypeDto, rol: Rol): Promise<AlertTypeRecord> {
    if (!canMutateTypes(rol)) {
      throw new ForbiddenException(MSG_SIN_PERMISO_TIPO);
    }
    const code = dto.code.trim().toUpperCase();
    if (!isValidAlertCode(code)) {
      throw new BadRequestException(MSG_CODIGO_INVALIDO);
    }
    const existing = await this.tipos.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException(MSG_CODIGO_DUPLICADO);
    }
    const saved = await this.tipos.save(
      this.tipos.create({
        code,
        label: dto.label.trim(),
        family: dto.family,
        owningModule: dto.owningModule,
        thresholdMode: dto.thresholdMode,
        active: dto.active ?? true,
        seeded: false,
      }),
    );
    return this.toRecord(saved);
  }

  async setActive(
    code: string,
    active: boolean,
    rol: Rol,
  ): Promise<AlertTypeRecord> {
    if (!canMutateTypes(rol)) {
      throw new ForbiddenException(MSG_SIN_PERMISO_TIPO);
    }
    const row = await this.requireType(code);
    row.active = active;
    await this.tipos.save(row);
    return this.toRecord(row);
  }

  async getUmbrales(code: string, rol: Rol) {
    const type = await this.getVisible(code, rol);
    if (!canEditThresholds(type.family, rol) && rol !== Rol.ADMIN_DIRECTIVO) {
      throw new ForbiddenException(MSG_SIN_PERMISO_UMBRAL);
    }
    return this.loadUmbrales(type);
  }

  async patchUmbrales(
    code: string,
    dto: PatchCatalogUmbralesDto,
    user: CurrentUser,
  ) {
    const type = await this.requireType(code);
    if (!canEditThresholds(type.family, user.rol)) {
      throw new ForbiddenException(MSG_SIN_PERMISO_UMBRAL);
    }
    if (
      type.thresholdMode === ThresholdMode.CATALOG &&
      type.code === SEED_ALERT_CODES.FLOTA_SIN_REGRESO
    ) {
      return {
        code: type.code,
        mode: type.thresholdMode,
        sinRegreso: await this.alertas.patchConfig({
          localH: dto.localH,
          foraneoH: dto.foraneoH,
        }),
      };
    }
    if (
      type.code === SEED_ALERT_CODES.MTTO_VENCIDO ||
      type.code === SEED_ALERT_CODES.STOCK_BAJO
    ) {
      return this.saveAttentionThresholds(type, dto, user);
    }
    if (type.code === SEED_ALERT_CODES.SALUD_UMBRAL) {
      if (!this.salud) {
        throw new BadRequestException('Salud no está disponible.');
      }
      const current = await this.salud.getConfig();
      const next = await this.salud.updateConfig(
        {
          dimensions: current.dimensions,
          alertEnabled: dto.alertEnabled ?? current.alertEnabled,
          alertThreshold: dto.alertThreshold ?? current.alertThreshold,
          recoveryThreshold: dto.recoveryThreshold ?? current.recoveryThreshold,
          alertSeverity: dto.alertSeverity ?? current.alertSeverity,
        },
        user,
      );
      return {
        code: type.code,
        mode: type.thresholdMode,
        salud: {
          alertEnabled: next.alertEnabled,
          alertThreshold: next.alertThreshold,
          recoveryThreshold: next.recoveryThreshold,
          alertSeverity: next.alertSeverity,
        },
      };
    }
    throw new BadRequestException(
      'Este tipo no tiene avisos configurables aún.',
    );
  }

  private requireUnique(ids: string[]) {
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('No repitas la misma unidad o refacción.');
  }

  async previewUmbrales(
    code: string,
    dto: PatchCatalogUmbralesDto,
    user: CurrentUser,
  ) {
    const type = await this.getVisible(code, user.rol);
    if (!canEditThresholds(type.family, user.rol))
      throw new ForbiddenException(MSG_SIN_PERMISO_UMBRAL);
    if (code === SEED_ALERT_CODES.MTTO_VENCIDO && this.andon) {
      this.requireUnique((dto.umbrales ?? []).map((row) => row.tipoVehiculoId));
      const before = await this.andon.previewPriorities();
      const after = await this.andon.previewPriorities(dto.umbrales);
      return comparePriorities(
        type.active ? before : new Map(),
        type.active ? after : new Map(),
      );
    }
    if (code === SEED_ALERT_CODES.STOCK_BAJO && this.inventario) {
      this.requireUnique((dto.items ?? []).map((row) => row.itemId));
      const before = await this.inventario.previewPriorities();
      const after = await this.inventario.previewPriorities(dto.items);
      return comparePriorities(
        type.active ? before : new Map(),
        type.active ? after : new Map(),
      );
    }
    throw new BadRequestException('Este tipo no admite vista previa.');
  }

  private async saveAttentionThresholds(
    type: AlertTypeRecord,
    dto: PatchCatalogUmbralesDto,
    user: CurrentUser,
  ) {
    if (
      (type.code === SEED_ALERT_CODES.MTTO_VENCIDO && !this.andon) ||
      (type.code === SEED_ALERT_CODES.STOCK_BAJO && !this.inventario)
    ) {
      throw new BadRequestException('No está disponible el módulo de alertas.');
    }
    await this.tipos.manager.transaction(async (manager) => {
      await manager
        .getRepository(AlertTypeEntity)
        .findOne({
          where: { code: type.code },
          lock: { mode: 'pessimistic_write' },
        });
      const before = await this.loadUmbrales(type);
      const changes: unknown[] = [];
      if (type.code === SEED_ALERT_CODES.MTTO_VENCIDO) {
        this.requireUnique(
          (dto.umbrales ?? []).map((row) => row.tipoVehiculoId),
        );
        for (const row of dto.umbrales ?? []) {
          changes.push(
            await this.andon!.updateUmbral(
              row.tipoVehiculoId,
              row.tKm,
              row.tDias,
              row.criticalOverdueKm,
              row.criticalOverdueDays,
              manager,
            ),
          );
        }
      } else {
        this.requireUnique((dto.items ?? []).map((row) => row.itemId));
        for (const row of dto.items ?? []) {
          changes.push(
            await this.inventario!.updateAlertThreshold(
              row.itemId,
              row.minQty,
              row.criticalQty,
              manager,
            ),
          );
        }
      }
      const repo = manager.getRepository(ThresholdChangeEntity);
      await repo.save(
        repo.create({
          code: type.code,
          actorId: user.userId,
          actorRole: user.rol,
          before,
          after: { changes },
        }),
      );
    });
    if (type.code === SEED_ALERT_CODES.MTTO_VENCIDO)
      await this.andon!.evaluarPendientes();
    if (type.code === SEED_ALERT_CODES.STOCK_BAJO)
      await this.inventario!.reconcileAlertThresholds(
        (dto.items ?? []).map((row) => row.itemId),
      );
    return this.loadUmbrales(type);
  }

  async attention(): Promise<AttentionResponse> {
    const [maintenanceActive, stockActive] = await Promise.all([
      this.isActive(SEED_ALERT_CODES.MTTO_VENCIDO),
      this.isActive(SEED_ALERT_CODES.STOCK_BAJO),
    ]);
    const settled = await Promise.allSettled([
      !maintenanceActive
        ? Promise.resolve([])
        : this.andon
          ? this.andon.listAvisos()
          : Promise.reject(new Error('Mantenimiento no disponible')),
      !stockActive
        ? Promise.resolve([])
        : this.inventario
          ? this.inventario.listStock()
          : Promise.reject(new Error('Inventario no disponible')),
      this.inventario
        ? this.inventario.listPendientes()
        : Promise.reject(new Error('Inventario no disponible')),
    ]);
    const items: ActiveAttention[] = [];
    if (settled[0].status === 'fulfilled') {
      for (const row of settled[0].value) {
        const reasons: string[] = [];
        if (row.diasDesde >= row.umbralDias)
          reasons.push(
            row.atrasoDias > 0
              ? `${row.atrasoDias} ${row.atrasoDias === 1 ? 'día' : 'días'} de atraso`
              : 'plazo de días alcanzado',
          );
        if (row.kmDesde >= row.umbralKm)
          reasons.push(
            `${row.atrasoKm.toLocaleString('es-MX')} km sobre el intervalo`,
          );
        items.push({
          id: `maintenance:${row.unidadId}`,
          kind: 'maintenance',
          area: 'FLOTA',
          severity: row.severity,
          title: [row.marcaModelo, row.numeroInterno ?? row.placas ?? 'Unidad']
            .filter(Boolean)
            .join(' · '),
          detail: `Mantenimiento vencido · ${reasons.join(' · ') || 'Requiere revisión'}`,
          reference: row.placas,
          photo: row.fotoDataUrl,
          href: `/unidades/${row.unidadId}?vista=mantenimiento`,
          action: 'Atender mantenimiento',
          createdAt: row.abiertaAt,
        });
      }
    }
    if (settled[1].status === 'fulfilled') {
      for (const row of settled[1].value.filter(
        (item) => item.activo && item.severity !== null,
      )) {
        const missing = Math.max(0, (row.minQty ?? 0) - row.qty);
        items.push({
          id: `stock:${row.itemId}`,
          kind: 'stock',
          area: 'INVENTARIO',
          severity: row.severity!,
          title: row.nombre,
          detail:
            row.qty === 0
              ? `Sin existencias · mínimo ${row.minQty} piezas`
              : missing > 0
                ? `Stock bajo · faltan ${missing} ${missing === 1 ? 'pieza' : 'piezas'} para el mínimo`
                : `Stock en el mínimo · ${row.qty} piezas disponibles`,
          reference: row.sku,
          photo: null,
          href: `/inventario/stock?itemId=${row.itemId}`,
          action: 'Revisar faltante',
          createdAt: new Date(row.updatedAt).toISOString(),
        });
      }
    }
    if (settled[2].status === 'fulfilled') {
      for (const row of settled[2].value.filter(
        (item) => item.estado === 'PENDIENTE' && !item.ticketDataUrl,
      )) {
        items.push({
          id: `purchase:${row.id}`,
          kind: 'purchase',
          area: 'INVENTARIO',
          severity: 'WARNING',
          title: row.nombre,
          detail: row.purchase ? 'Comprobante pendiente' : 'Comprobante de compra pendiente',
          reference: row.sku,
          photo: null,
          href: row.href,
          action: row.purchase ? 'Adjuntar comprobante' : 'Revisar compra',
          createdAt: new Date(row.createdAt).toISOString(),
        });
      }
    }
    return {
      items: [...new Map(items.map((row) => [row.id, row])).values()].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt),
      ),
      sources: settled.map((source, index) => ({
        id: ['maintenance', 'stock', 'purchases'][index],
        name: ['mantenimiento', 'existencias', 'compras pendientes'][index],
        status: source.status === 'fulfilled' ? 'ok' : 'error',
      })),
    };
  }

  private async loadUmbrales(type: AlertTypeRecord) {
    if (type.code === SEED_ALERT_CODES.FLOTA_SIN_REGRESO) {
      return {
        code: type.code,
        mode: type.thresholdMode,
        sinRegreso: await this.alertas.getConfig(),
      };
    }
    if (type.code === SEED_ALERT_CODES.MTTO_VENCIDO) {
      return {
        code: type.code,
        mode: type.thresholdMode,
        umbrales: this.andon ? await this.andon.listUmbrales() : [],
      };
    }
    if (type.code === SEED_ALERT_CODES.STOCK_BAJO) {
      return {
        code: type.code,
        mode: type.thresholdMode,
        items: this.inventario ? await this.inventario.listStock() : [],
      };
    }
    if (type.code === SEED_ALERT_CODES.SALUD_UMBRAL) {
      const cfg = this.salud ? await this.salud.getConfig() : null;
      return {
        code: type.code,
        mode: type.thresholdMode,
        salud: cfg
          ? {
              alertEnabled: cfg.alertEnabled,
              alertThreshold: cfg.alertThreshold,
              recoveryThreshold: cfg.recoveryThreshold,
              alertSeverity: cfg.alertSeverity,
            }
          : null,
      };
    }
    return { code: type.code, mode: type.thresholdMode };
  }

  private async loadAll(): Promise<AlertTypeRecord[]> {
    const rows = await this.tipos.find({ order: { code: 'ASC' } });
    if (rows.length === 0) {
      return SEED_ALERT_TYPES;
    }
    return rows.map((row) => this.toRecord(row));
  }

  private async requireType(code: string): Promise<AlertTypeEntity> {
    const row = await this.tipos.findOne({ where: { code } });
    if (!row) {
      throw new NotFoundException(MSG_TIPO_NO_ENCONTRADO);
    }
    return row;
  }

  private toRecord(row: AlertTypeEntity): AlertTypeRecord {
    return {
      code: row.code,
      label: row.label,
      family: row.family,
      owningModule: row.owningModule,
      thresholdMode: row.thresholdMode,
      active: row.active,
      seeded: row.seeded,
    };
  }
}
