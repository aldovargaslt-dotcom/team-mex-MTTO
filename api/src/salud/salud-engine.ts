import { randomUUID } from 'crypto';
import { defaultHealthConfigValues, validateAlertSeverity, validateAlertThresholds, validateWeights } from './config-rules';
import {
  EstadoHealthAlert,
  HealthAlertType,
} from './enums';
import { evaluateHealthAlertRule } from './health-alert-rules';
import { computeUnitHealth } from './health-score';
import {
  AndonHealthInputPort,
  HealthAlertPort,
  OdometerPort,
  SaludCatalog,
  SaludStore,
  andonSourceAlerts,
} from './ports';
import {
  HealthAlert,
  HealthComputation,
  HealthConfig,
  UnidadHealthRef,
} from './salud-types';

export class SaludConfigInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaludConfigInvalidError';
  }
}

export type SaludEngineDeps = {
  store: SaludStore;
  catalog: SaludCatalog;
  andon: AndonHealthInputPort;
  odometer: OdometerPort;
  inbox?: HealthAlertPort;
  now?: () => Date;
  newId?: () => string;
};

export type EvaluateOpts = {
  reevaluatePolicy?: boolean;
};

export type UnidadHealthResult = {
  unitId: string;
  numeroInterno: string | null;
  available: boolean;
  score: number | null;
  rawScore: number | null;
  status: string | null;
  label: string;
  breakdown: HealthComputation['breakdown'];
  cap: HealthComputation['cap'];
  drivers: HealthComputation['drivers'];
  derivedAlert: { id: string; estado: EstadoHealthAlert } | null;
  message: string | null;
  configVersion: number;
  weights: HealthConfig['dimensions'];
};

export class SaludEngine {
  constructor(private readonly deps: SaludEngineDeps) {}

  private nowIso() {
    return (this.deps.now?.() ?? new Date()).toISOString();
  }

  private id() {
    return this.deps.newId?.() ?? randomUUID();
  }

  async ensureActiveConfig(createdBy = 'seed'): Promise<HealthConfig> {
    const existing = await this.deps.store.getActiveConfig();
    if (existing) return existing;
    const defaults = defaultHealthConfigValues();
    const config: HealthConfig = {
      id: this.id(),
      version: 1,
      ...defaults,
      isActive: true,
      createdAt: this.nowIso(),
      createdBy,
    };
    await this.deps.store.insertConfig(config);
    return config;
  }

  async listVersions() {
    return this.deps.store.listConfigs();
  }

  async saveConfig(
    input: {
      dimensions: HealthConfig['dimensions'];
      alertEnabled: boolean;
      alertThreshold: number;
      recoveryThreshold: number;
      alertSeverity: string;
    },
    createdBy: string | null,
  ): Promise<HealthConfig> {
    const weightsErr = validateWeights(input.dimensions);
    if (weightsErr) throw new SaludConfigInvalidError(weightsErr);
    const thrErr = validateAlertThresholds(
      input.alertThreshold,
      input.recoveryThreshold,
    );
    if (thrErr) throw new SaludConfigInvalidError(thrErr);
    if (!validateAlertSeverity(input.alertSeverity)) {
      throw new SaludConfigInvalidError('Severidad de alerta no válida.');
    }
    const previous = await this.deps.store.listConfigs();
    const nextVersion =
      previous.reduce((max, c) => Math.max(max, c.version), 0) + 1;
    await this.deps.store.deactivateConfigs();
    const config: HealthConfig = {
      id: this.id(),
      version: nextVersion,
      dimensions: input.dimensions,
      alertEnabled: input.alertEnabled,
      alertThreshold: input.alertThreshold,
      recoveryThreshold: input.recoveryThreshold,
      alertSeverity: input.alertSeverity,
      isActive: true,
      createdAt: this.nowIso(),
      createdBy,
    };
    await this.deps.store.insertConfig(config);
    await this.evaluateTodas({ reevaluatePolicy: true });
    return config;
  }

  async evaluateUnidad(
    unidadId: string,
    opts: EvaluateOpts = {},
  ): Promise<UnidadHealthResult> {
    const config = await this.ensureActiveConfig();
    const unidad = await this.deps.catalog.get(unidadId);
    const andon = await this.deps.andon.get(unidadId);
    const flotaKm = await this.deps.odometer.getLatestKm(unidadId);
    const lastKm = andon.lastClosed?.km ?? null;
    const currentKm =
      lastKm == null && flotaKm == null
        ? null
        : Math.max(lastKm ?? 0, flotaKm ?? 0);

    const computation = computeUnitHealth({
      config,
      lastClosed: andon.lastClosed,
      currentKm,
      nowIso: this.nowIso(),
      tKm: andon.tKm,
      tDias: andon.tDias,
      sourceAlerts: andonSourceAlerts(andon.hasNoResuelto),
    });

    const previous = await this.deps.store.getSnapshot(unidadId);
    const active = await this.deps.store.getActiveAlert(unidadId);
    const decision = evaluateHealthAlertRule({
      enabled: config.alertEnabled,
      alertThreshold: config.alertThreshold,
      recoveryThreshold: config.recoveryThreshold,
      previousScore: previous?.score ?? null,
      currentScore: computation.score,
      hasActive: active != null,
      reevaluatePolicy: opts.reevaluatePolicy,
    });

    let derived = active;
    if (decision === 'CREATE' && computation.score != null) {
      const alert: HealthAlert = {
        id: this.id(),
        unidadId,
        type: HealthAlertType.HEALTH_BELOW_THRESHOLD,
        estado: EstadoHealthAlert.ABIERTO,
        scoreAtOpen: computation.score,
        thresholdAtOpen: config.alertThreshold,
        openedAt: this.nowIso(),
        resolvedAt: null,
        resolvedReason: null,
      };
      await this.deps.store.insertAlert(alert);
      derived = alert;
      await this.deps.inbox?.onOpened({
        alert,
        unidad,
        score: computation.score,
        threshold: config.alertThreshold,
        numeroInterno: unidad?.numeroInterno ?? 'Unidad',
        drivers: computation.drivers,
        severity: config.alertSeverity,
      });
    } else if (decision === 'RESOLVE' && active && computation.score != null) {
      const resolved: HealthAlert = {
        ...active,
        estado: EstadoHealthAlert.RESUELTO,
        resolvedAt: this.nowIso(),
        resolvedReason: 'Health recovered above configured threshold.',
      };
      await this.deps.store.updateAlert(resolved);
      derived = resolved;
      await this.deps.inbox?.onResolved({
        alert: resolved,
        unidadId,
        score: computation.score,
      });
    }

    await this.deps.store.upsertSnapshot({
      unidadId,
      score: computation.score,
      rawScore: computation.rawScore,
      status: computation.status,
      computedAt: this.nowIso(),
      configVersion: config.version,
    });

    return this.toResult(unidadId, unidad, config, computation, derived);
  }

  async evaluateTodas(opts: EvaluateOpts = {}) {
    const unidades = await this.deps.catalog.list();
    const results: UnidadHealthResult[] = [];
    for (const unidad of unidades) {
      results.push(await this.evaluateUnidad(unidad.unidadId, opts));
    }
    return results;
  }

  async handleVisitaCerrada(unidadId: string) {
    return this.evaluateUnidad(unidadId);
  }

  private toResult(
    unidadId: string,
    unidad: UnidadHealthRef | null,
    config: HealthConfig,
    computation: HealthComputation,
    derived: HealthAlert | null,
  ): UnidadHealthResult {
    return {
      unitId: unidadId,
      numeroInterno: unidad?.numeroInterno ?? null,
      available: computation.available,
      score: computation.score,
      rawScore: computation.rawScore,
      status: computation.status,
      label: computation.label,
      breakdown: computation.breakdown,
      cap: computation.cap,
      drivers: computation.drivers,
      derivedAlert:
        derived && derived.estado === EstadoHealthAlert.ABIERTO
          ? { id: derived.id, estado: derived.estado }
          : null,
      message: computation.message,
      configVersion: config.version,
      weights: config.dimensions,
    };
  }
}
