import { Rol } from '../auth/roles.enum';
import { TipoFirmaFlota, TipoMovimientoFlota } from './enums';
import { FlotaDomainError, FlotaEngine } from './flota-engine';
import { RegistrarMovimientoInput } from './flota-types';
import {
  InMemoryFlotaStore,
  sitioInactivo,
  sitioPatio,
} from './in-memory-flota-store';

const UNIDAD = '11111111-1111-4111-8111-111111111111';
const UNIDAD_2 = '11111111-1111-4111-8111-111111111112';
const CHOFER = '22222222-2222-4222-8222-222222222221';
const CHOFER_2 = '22222222-2222-4222-8222-222222222222';
const SITIO = '33333333-3333-4333-8333-333333333331';
const NOW = '2026-09-12T18:00:00.000Z';
const FIRMA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function firmas() {
  return [
    { tipo: TipoFirmaFlota.CHOFER, dataUrl: FIRMA },
    { tipo: TipoFirmaFlota.AVAL, dataUrl: FIRMA },
  ];
}

function input(
  over: Partial<RegistrarMovimientoInput> = {},
): RegistrarMovimientoInput {
  return {
    tipo: TipoMovimientoFlota.SALIDA,
    unidadId: UNIDAD,
    choferId: CHOFER,
    sitioId: SITIO,
    occurredAt: '2026-09-12T12:00:00.000Z',
    km: 1000,
    notas: 'Cliente Norte',
    firmas: firmas(),
    createdBy: 'log-1',
    avalRol: Rol.LOGISTICA,
    ...over,
  };
}

function harness() {
  const store = new InMemoryFlotaStore();
  store.putSitio({ ...sitioPatio(SITIO) });
  const engine = new FlotaEngine(store);
  const catalogs = {
    nowIso: NOW,
    unidad: { id: UNIDAD, activa: true },
    chofer: { id: CHOFER, activo: true },
    ultimoKmVisita: 900 as number | null,
    andonAbierto: false,
  };
  return { store, engine, catalogs };
}

describe('Flota v0 (ADR-004 F1–F11)', () => {
  it('F1 segunda SALIDA abierta en la misma unidad falla', async () => {
    const { engine, catalogs } = harness();
    await engine.registrar(input(), catalogs);
    await expect(engine.registrar(input({ km: 1100 }), catalogs)).rejects.toThrow(
      /salida abierta/i,
    );
  });

  it('F2 ENTRADA sin salida abierta falla; con salida la cierra', async () => {
    const { engine, store, catalogs } = harness();
    await expect(
      engine.registrar(input({ tipo: TipoMovimientoFlota.ENTRADA }), catalogs),
    ).rejects.toThrow(/salida abierta/i);

    const salida = await engine.registrar(input(), catalogs);
    expect(salida.movimiento.tipo).toBe(TipoMovimientoFlota.SALIDA);
    const entrada = await engine.registrar(
      input({
        tipo: TipoMovimientoFlota.ENTRADA,
        occurredAt: '2026-09-12T16:00:00.000Z',
        km: 1200,
      }),
      catalogs,
    );
    expect(entrada.movimiento.tipo).toBe(TipoMovimientoFlota.ENTRADA);
    const op = await store.getOperativa(UNIDAD);
    expect(op?.salidaAbiertaId).toBeNull();
    expect(op?.choferActualId).toBeNull();
    expect(op?.choferUltimoId).toBe(CHOFER);
  });

  it('F3 chofer inactivo no registra', async () => {
    const { engine, catalogs } = harness();
    await expect(
      engine.registrar(input(), {
        ...catalogs,
        chofer: { id: CHOFER, activo: false },
      }),
    ).rejects.toBeInstanceOf(FlotaDomainError);
  });

  it('F4 sitio inactivo o inexistente no registra', async () => {
    const { engine, store, catalogs } = harness();
    store.putSitio(sitioInactivo(SITIO));
    await expect(engine.registrar(input(), catalogs)).rejects.toThrow(
      /sitio no está activo/i,
    );
    await expect(
      engine.registrar(input({ sitioId: 'no-existe' }), catalogs),
    ).rejects.toThrow(/No se encontró el sitio/i);
  });

  it('F5 occurredAt futuro no registra', async () => {
    const { engine, catalogs } = harness();
    await expect(
      engine.registrar(input({ occurredAt: '2026-09-13T00:00:00.000Z' }), catalogs),
    ).rejects.toThrow(/futura/i);
  });

  it('F6 ENTRADA anterior a la SALIDA falla', async () => {
    const { engine, catalogs } = harness();
    await engine.registrar(input(), catalogs);
    await expect(
      engine.registrar(
        input({
          tipo: TipoMovimientoFlota.ENTRADA,
          occurredAt: '2026-09-12T10:00:00.000Z',
          km: 1100,
        }),
        catalogs,
      ),
    ).rejects.toThrow(/anterior/i);
  });

  it('F7 km de entrada menor al de salida falla', async () => {
    const { engine, catalogs } = harness();
    await engine.registrar(input({ km: 2000 }), catalogs);
    await expect(
      engine.registrar(
        input({
          tipo: TipoMovimientoFlota.ENTRADA,
          occurredAt: '2026-09-12T16:00:00.000Z',
          km: 1500,
        }),
        catalogs,
      ),
    ).rejects.toThrow(/menor al de la salida/i);
  });

  it('F8 sin las dos firmas no hay movimiento', async () => {
    const { engine, store, catalogs } = harness();
    await expect(
      engine.registrar(input({ firmas: [firmas()[0]] }), catalogs),
    ).rejects.toThrow(/firmas del chofer y del aval/i);
    expect(store.movimientos.size).toBe(0);
  });

  it('F9 un chofer no tiene dos SALIDA abiertas', async () => {
    const { engine, catalogs } = harness();
    await engine.registrar(input(), catalogs);
    await expect(
      engine.registrar(
        input({ unidadId: UNIDAD_2 }),
        { ...catalogs, unidad: { id: UNIDAD_2, activa: true } },
      ),
    ).rejects.toThrow(/ya tiene una unidad en ruta/i);
    const ok = await engine.registrar(
      input({ unidadId: UNIDAD_2, choferId: CHOFER_2 }),
      {
        ...catalogs,
        unidad: { id: UNIDAD_2, activa: true },
        chofer: { id: CHOFER_2, activo: true },
      },
    );
    expect(ok.movimiento.unidadId).toBe(UNIDAD_2);
  });

  it('F10 bitácora permitida si la unidad está INACTIVA', async () => {
    const { engine, catalogs } = harness();
    const res = await engine.registrar(input(), {
      ...catalogs,
      unidad: { id: UNIDAD, activa: false },
    });
    expect(res.movimiento.id).toBeTruthy();
  });

  it('F11 alta + proyección + firmas juntos; aviso suave Andon/km no bloquea', async () => {
    const { engine, store, catalogs } = harness();
    const res = await engine.registrar(input({ km: 800 }), {
      ...catalogs,
      andonAbierto: true,
      ultimoKmVisita: 900,
    });
    expect(res.avisos.some((a) => /alerta abierta/i.test(a))).toBe(true);
    expect(res.avisos.some((a) => /último km de visita/i.test(a))).toBe(true);
    expect(res.movimiento.firmas).toHaveLength(2);
    const op = await store.getOperativa(UNIDAD);
    expect(op?.salidaAbiertaId).toBe(res.movimiento.id);
    expect(store.movimientos.size).toBe(1);
  });
});
