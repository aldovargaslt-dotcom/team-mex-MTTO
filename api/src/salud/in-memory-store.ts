import { EstadoHealthAlert } from './enums';
import { SaludStore } from './ports';
import { HealthAlert, HealthConfig, HealthSnapshot } from './salud-types';

export class InMemorySaludStore implements SaludStore {
  configs: HealthConfig[] = [];
  snapshots = new Map<string, HealthSnapshot>();
  alerts: HealthAlert[] = [];

  async getActiveConfig() {
    return this.configs.find((c) => c.isActive) ?? null;
  }

  async listConfigs() {
    return [...this.configs].sort((a, b) => b.version - a.version);
  }

  async insertConfig(config: HealthConfig) {
    this.configs.push(config);
  }

  async deactivateConfigs() {
    this.configs = this.configs.map((c) => ({ ...c, isActive: false }));
  }

  async getSnapshot(unidadId: string) {
    return this.snapshots.get(unidadId) ?? null;
  }

  async upsertSnapshot(row: HealthSnapshot) {
    this.snapshots.set(row.unidadId, row);
  }

  async getActiveAlert(unidadId: string) {
    return (
      this.alerts.find(
        (a) => a.unidadId === unidadId && a.estado === EstadoHealthAlert.ABIERTO,
      ) ?? null
    );
  }

  async insertAlert(alert: HealthAlert) {
    this.alerts.push(alert);
  }

  async updateAlert(alert: HealthAlert) {
    this.alerts = this.alerts.map((a) => (a.id === alert.id ? alert : a));
  }
}
