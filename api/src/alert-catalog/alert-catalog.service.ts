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
    if (type.code === SEED_ALERT_CODES.MTTO_VENCIDO) {
      if (!this.andon) {
        throw new BadRequestException('Andon no está disponible.');
      }
      const updates = dto.umbrales ?? [];
      const saved = [];
      for (const row of updates) {
        saved.push(
          await this.andon.updateUmbral(row.tipoVehiculoId, row.tKm, row.tDias),
        );
      }
      return {
        code: type.code,
        mode: type.thresholdMode,
        umbrales: saved.length ? saved : await this.andon.listUmbrales(),
      };
    }
    if (type.code === SEED_ALERT_CODES.STOCK_BAJO) {
      if (!this.inventario) {
        throw new BadRequestException('Inventario no está disponible.');
      }
      const items = dto.items ?? [];
      const saved = [];
      for (const row of items) {
        saved.push(
          await this.inventario.updateItem(row.itemId, { minQty: row.minQty }),
        );
      }
      return {
        code: type.code,
        mode: type.thresholdMode,
        items: saved,
      };
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
          recoveryThreshold:
            dto.recoveryThreshold ?? current.recoveryThreshold,
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
