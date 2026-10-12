import { AndonEngine } from './andon-engine';
import { InMemoryAndonStore } from './in-memory-store';
import { InMemoryUnidadCatalog } from './in-memory-catalog';
import { FakeWhatsAppAdapter } from './fake-whatsapp';
import { EstadoAviso } from './enums';

describe('Reevaluación viva — AC-03', () => {
  it('ajustar reglas retira aviso sin visita ficticia; leer Enterado no lo retira', async () => {
    const store = new InMemoryAndonStore();
    const catalog = new InMemoryUnidadCatalog();
    const whatsapp = new FakeWhatsAppAdapter();
    catalog.put({ unidadId: 'unit', tipoVehiculoId: 'type', activa: true });
    await store.setLastClosed({
      unidadId: 'unit',
      tipoVehiculoId: 'type',
      visitaId: 'real-visit',
      km: 100,
      cerradoAt: '2026-01-01T00:00:00.000Z',
    });
    await store.setUmbral({ tipoVehiculoId: 'type', tKm: 10000, tDias: 90 });
    const onResuelto = jest.fn();
    const engine = new AndonEngine({
      store,
      catalog,
      whatsapp,
      inbox: { onAbierto: jest.fn(), onResuelto },
    });
    const notice = await engine.evaluarUnidad({
      unidadId: 'unit',
      currentKm: 100,
      now: new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(notice?.severity).toBe('CRITICAL');
    await store.updateAviso({ ...notice!, estado: EstadoAviso.ENTERADO });
    await engine.evaluarTodas(new Date('2026-05-02T00:00:00.000Z'));
    expect((await store.getNoResuelto('unit'))?.estado).toBe(
      EstadoAviso.ENTERADO,
    );
    await store.setUmbral({ tipoVehiculoId: 'type', tKm: 10000, tDias: 150 });
    await engine.evaluarTodas(new Date('2026-05-02T00:00:00.000Z'));
    expect(await store.getNoResuelto('unit')).toBeNull();
    expect((await store.getAviso(notice!.id))?.visitaResolutoriaId).toBeNull();
    expect((await store.getLastClosed('unit'))?.visitaId).toBe('real-visit');
    expect(onResuelto).toHaveBeenCalledTimes(1);
  });

  it('lectura diaria conserva km observados de un aviso abierto por kilometraje', async () => {
    const store = new InMemoryAndonStore();
    const catalog = new InMemoryUnidadCatalog();
    catalog.put({ unidadId: 'unit', tipoVehiculoId: 'type', activa: true });
    await store.setLastClosed({
      unidadId: 'unit',
      tipoVehiculoId: 'type',
      visitaId: 'visit',
      km: 100,
      cerradoAt: '2026-01-01T00:00:00.000Z',
    });
    const engine = new AndonEngine({
      store,
      catalog,
      whatsapp: new FakeWhatsAppAdapter(),
    });
    await engine.evaluarUnidad({
      unidadId: 'unit',
      currentKm: 11100,
      now: new Date('2026-01-02T00:00:00.000Z'),
    });
    await engine.evaluarTodas(new Date('2026-01-03T00:00:00.000Z'));
    expect(await store.getNoResuelto('unit')).not.toBeNull();
  });
});
