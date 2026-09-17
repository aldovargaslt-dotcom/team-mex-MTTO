import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoHealthAlert } from './enums';
import { HealthAlertEntity } from './entities/health-alert.entity';
import { HealthConfigEntity } from './entities/health-config.entity';
import { HealthSnapshotEntity } from './entities/health-snapshot.entity';
import { SaludStore } from './ports';
import { HealthAlert, HealthConfig, HealthSnapshot } from './salud-types';

@Injectable()
export class TypeOrmSaludStore implements SaludStore {
  constructor(
    @InjectRepository(HealthConfigEntity)
    private readonly configs: Repository<HealthConfigEntity>,
    @InjectRepository(HealthSnapshotEntity)
    private readonly snapshots: Repository<HealthSnapshotEntity>,
    @InjectRepository(HealthAlertEntity)
    private readonly alerts: Repository<HealthAlertEntity>,
  ) {}

  async getActiveConfig(): Promise<HealthConfig | null> {
    const row = await this.configs.findOne({ where: { isActive: true } });
    return row ? this.toConfig(row) : null;
  }

  async listConfigs(): Promise<HealthConfig[]> {
    const rows = await this.configs.find({ order: { version: 'DESC' } });
    return rows.map((r) => this.toConfig(r));
  }

  async insertConfig(config: HealthConfig): Promise<void> {
    await this.configs.save(
      this.configs.create({
        id: config.id,
        version: config.version,
        dimensions: config.dimensions,
        alertEnabled: config.alertEnabled,
        alertThreshold: config.alertThreshold,
        recoveryThreshold: config.recoveryThreshold,
        alertSeverity: config.alertSeverity,
        isActive: config.isActive,
        createdAt: new Date(config.createdAt),
        createdBy: config.createdBy,
      }),
    );
  }

  async deactivateConfigs(): Promise<void> {
    await this.configs
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('is_active = :active', { active: true })
      .execute();
  }

  async getSnapshot(unidadId: string): Promise<HealthSnapshot | null> {
    const row = await this.snapshots.findOne({ where: { unidadId } });
    if (!row) return null;
    return {
      unidadId: row.unidadId,
      score: row.score,
      rawScore: row.rawScore,
      status: row.status,
      computedAt: row.computedAt.toISOString(),
      configVersion: row.configVersion,
    };
  }

  async upsertSnapshot(row: HealthSnapshot): Promise<void> {
    const existing = await this.snapshots.findOne({
      where: { unidadId: row.unidadId },
    });
    const entity = existing ?? this.snapshots.create({ unidadId: row.unidadId });
    entity.score = row.score;
    entity.rawScore = row.rawScore;
    entity.status = row.status;
    entity.computedAt = new Date(row.computedAt);
    entity.configVersion = row.configVersion;
    await this.snapshots.save(entity);
  }

  async getActiveAlert(unidadId: string): Promise<HealthAlert | null> {
    const row = await this.alerts.findOne({
      where: { unidadId, estado: EstadoHealthAlert.ABIERTO },
    });
    return row ? this.toAlert(row) : null;
  }

  async insertAlert(alert: HealthAlert): Promise<void> {
    await this.alerts.save(this.toEntity(alert));
  }

  async updateAlert(alert: HealthAlert): Promise<void> {
    await this.alerts.save(this.toEntity(alert));
  }

  private toConfig(row: HealthConfigEntity): HealthConfig {
    return {
      id: row.id,
      version: row.version,
      dimensions: row.dimensions,
      alertEnabled: row.alertEnabled,
      alertThreshold: row.alertThreshold,
      recoveryThreshold: row.recoveryThreshold,
      alertSeverity: row.alertSeverity,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
    };
  }

  private toAlert(row: HealthAlertEntity): HealthAlert {
    return {
      id: row.id,
      unidadId: row.unidadId,
      type: row.type,
      estado: row.estado,
      scoreAtOpen: row.scoreAtOpen,
      thresholdAtOpen: row.thresholdAtOpen,
      openedAt: row.openedAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      resolvedReason: row.resolvedReason,
    };
  }

  private toEntity(alert: HealthAlert): HealthAlertEntity {
    return this.alerts.create({
      id: alert.id,
      unidadId: alert.unidadId,
      type: alert.type,
      estado: alert.estado,
      scoreAtOpen: alert.scoreAtOpen,
      thresholdAtOpen: alert.thresholdAtOpen,
      openedAt: new Date(alert.openedAt),
      resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : null,
      resolvedReason: alert.resolvedReason,
    });
  }
}
