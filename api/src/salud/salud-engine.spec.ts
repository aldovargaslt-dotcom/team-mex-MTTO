import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_T_DIAS, DEFAULT_T_KM } from '../andon/enums';
import { EstadoHealthAlert, HealthAlertType, HealthDimensionId } from './enums';
import { InMemorySaludStore } from './in-memory-store';
import {
  AndonHealthInput,
  AndonHealthInputPort,
  HealthAlertOpened,
  HealthAlertPort,
  HealthAlertResolved,
  OdometerPort,
  SaludCatalog,
} from './ports';
import { SaludEngine } from './salud-engine';
import { LastClosedForHealth, UnidadHealthRef } from './salud-types';

const UNIDAD = '11111111-1111-4111-8111-111111111111';
const TIPO = '22222222-2222-4222-8222-222222222222';
const LAST: LastClosedForHealth = {
  unidadId: UNIDAD,
  visitaId: '33333333-3333-4333-8333-333333333331',
  tipoVehiculoId: TIPO,
  km: 10000,
  cerradoAt: '2026-01-01T00:00:00.000Z',
};

class FakeCatalog implements SaludCatalog {
  unidades = new Map<string, UnidadHealthRef>();
  async get(id: string) {
    return this.unidades.get(id) ?? null;
  }
  async list() {
    return [...this.unidades.values()];
  }
}

class FakeAndon implements AndonHealthInputPort {
  lastClosed: LastClosedForHealth | null = LAST;
  hasNoResuelto = false;
  tKm = DEFAULT_T_KM;
  tDias = DEFAULT_T_DIAS;
  async get(): Promise<AndonHealthInput> {
    return {
      lastClosed: this.lastClosed,
      tKm: this.tKm,
      tDias: this.tDias,
      tipoVehiculoId: TIPO,
      hasNoResuelto: this.hasNoResuelto,
    };
  }
}

class FakeOdo implements OdometerPort {
  km: number | null = null;
  async getLatestKm() {
    return this.km;
  }
}

class FakeInbox implements HealthAlertPort {
  opened: HealthAlertOpened[] = [];
  resolved: HealthAlertResolved[] = [];
  async onOpened(event: HealthAlertOpened) {
    this.opened.push(event);
  }
  async onResolved(event: HealthAlertResolved) {
    this.resolved.push(event);
  }
}

function harness(now = '2026-01-01T00:00:00.000Z') {
  const store = new InMemorySaludStore();
  const catalog = new FakeCatalog();
  catalog.unidades.set(UNIDAD, {
    unidadId: UNIDAD,
    tipoVehiculoId: TIPO,
    numeroInterno: 'U-101',
    activa: true,
  });
  const andon = new FakeAndon();
  const odometer = new FakeOdo();
  const inbox = new FakeInbox();
  const engine = new SaludEngine({
    store,
    catalog,
    andon,
    odometer,
    inbox,
    now: () => new Date(now),
    newId: () => 'alert-1',
  });
  return { engine, store, catalog, andon, odometer, inbox };
}

describe('SaludEngine (H4, H8–H13, H15)', () => {
  it('H4 derived alert no cambia alerts_score', async () => {
    const h = harness();
    h.andon.hasNoResuelto = true;
    const first = await h.engine.evaluateUnidad(UNIDAD);
    expect(
      first.breakdown.find((d) => d.id === HealthDimensionId.ALERTS)?.score,
    ).toBe(70);
    await h.store.insertAlert({
      id: 'derived-1',
      unidadId: UNIDAD,
      type: HealthAlertType.HEALTH_BELOW_THRESHOLD,
      estado: EstadoHealthAlert.ABIERTO,
      scoreAtOpen: 50,
      thresholdAtOpen: 60,
      openedAt: '2026-01-01T00:00:00.000Z',
      resolvedAt: null,
      resolvedReason: null,
    });
    const second = await h.engine.evaluateUnidad(UNIDAD);
    expect(
      second.breakdown.find((d) => d.id === HealthDimensionId.ALERTS)?.score,
    ).toBe(70);
  });

  it('H8 unidad inactiva calcula igual', async () => {
    const a = harness();
    const healthy = await a.engine.evaluateUnidad(UNIDAD);
    const b = harness();
    b.catalog.unidades.set(UNIDAD, {
      ...b.catalog.unidades.get(UNIDAD)!,
      activa: false,
    });
    const inactive = await b.engine.evaluateUnidad(UNIDAD);
    expect(inactive.score).toBe(healthy.score);
  });

  it('H9 70→59 crea una alerta', async () => {
    const h = harness('2026-01-10T00:00:00.000Z');
    await h.store.upsertSnapshot({
      unidadId: UNIDAD,
      score: 70,
      rawScore: 70,
      status: null,
      computedAt: '2026-01-09T00:00:00.000Z',
      configVersion: 1,
    });
    h.andon.hasNoResuelto = true;
    h.andon.lastClosed = { ...LAST, cerradoAt: '2025-01-01T00:00:00.000Z' };
    const result = await h.engine.evaluateUnidad(UNIDAD);
    expect(result.score).toBeLessThan(60);
    expect(h.inbox.opened).toHaveLength(1);
    expect(result.derivedAlert?.estado).toBe(EstadoHealthAlert.ABIERTO);
  });

  it('H10 no duplica mientras hay activa', async () => {
    const h = harness('2026-06-01T00:00:00.000Z');
    h.andon.lastClosed = { ...LAST, cerradoAt: '2025-01-01T00:00:00.000Z' };
    await h.engine.evaluateUnidad(UNIDAD);
    expect(h.inbox.opened).toHaveLength(1);
    await h.engine.evaluateUnidad(UNIDAD);
    expect(h.inbox.opened).toHaveLength(1);
    expect(
      h.store.alerts.filter((a) => a.estado === EstadoHealthAlert.ABIERTO),
    ).toHaveLength(1);
  });

  it('H12 previous null current bajo crea alerta', async () => {
    const h = harness('2026-06-01T00:00:00.000Z');
    h.andon.lastClosed = { ...LAST, cerradoAt: '2025-01-01T00:00:00.000Z' };
    await h.engine.evaluateUnidad(UNIDAD);
    expect(h.inbox.opened).toHaveLength(1);
  });

  it('H11 histeresis: por debajo KEEP, recuperada RESOLVE', async () => {
    const h = harness('2026-01-01T00:00:00.000Z');
    h.andon.lastClosed = { ...LAST, cerradoAt: '2025-01-01T00:00:00.000Z' };
    await h.engine.evaluateUnidad(UNIDAD);
    expect(h.inbox.opened).toHaveLength(1);

    h.andon.lastClosed = LAST;
    h.andon.hasNoResuelto = false;
    const recovered = await h.engine.evaluateUnidad(UNIDAD);
    expect(recovered.score).toBeGreaterThanOrEqual(65);
    expect(h.inbox.resolved).toHaveLength(1);
  });

  it('H13 PUT threshold reevalúa y crea', async () => {
    const h = harness('2026-04-06T00:00:00.000Z');
    const before = await h.engine.evaluateUnidad(UNIDAD);
    expect(before.score).toBeGreaterThanOrEqual(60);
    expect(before.score).toBeLessThan(70);
    expect(h.inbox.opened).toHaveLength(0);
    await h.engine.saveConfig(
      {
        dimensions: [
          { id: HealthDimensionId.MAINTENANCE, weight: 45 },
          { id: HealthDimensionId.ALERTS, weight: 40 },
          { id: HealthDimensionId.INSPECTIONS, weight: 15 },
        ],
        alertEnabled: true,
        alertThreshold: 70,
        recoveryThreshold: 75,
        alertSeverity: 'WARNING',
      },
      'admin-1',
    );
    expect(h.inbox.opened.length).toBeGreaterThanOrEqual(1);
    const versions = await h.engine.listVersions();
    expect(versions.filter((v) => v.isActive)).toHaveLength(1);
  });

  it('H15 el motor no importa Andon/Inventario/Notifications/Twilio', () => {
    const src = readFileSync(join(__dirname, 'salud-engine.ts'), 'utf8');
    expect(src).not.toMatch(/andon\//);
    expect(src).not.toMatch(/inventario\//);
    expect(src).not.toMatch(/notifications\//);
    expect(src).not.toMatch(/twilio/i);
  });
});
