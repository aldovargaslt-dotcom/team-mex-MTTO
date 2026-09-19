import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';
import {
  alertaSinRegreso,
  errorRegreso,
  errorSalida,
  filtrarUnidadesOps,
  kpisUnidadesOps,
  MSG_REGRESO_NO_EN_RUTA,
  MSG_SALIDA_SIN_AMBITO,
} from './logistica-rules';
import { LogisticaUnidadRow } from './logistica-types';
import { resolveUmbralHoras } from '../alertas/umbral-rules';

const U1 = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-09-19T12:00:00.000Z');
const HACE_2H = new Date('2026-09-19T10:00:00.000Z');
const HACE_9H = new Date('2026-09-19T03:00:00.000Z');
const HACE_25H = new Date('2026-09-18T11:00:00.000Z');

function row(
  partial: Partial<LogisticaUnidadRow> & Pick<LogisticaUnidadRow, 'placas'>,
): LogisticaUnidadRow {
  const opsEstado = partial.opsEstado ?? 'DISPONIBLE';
  const ambito = partial.ambito ?? 'LOCAL';
  const salidaAt = partial.salidaAt ?? null;
  const thresholdHoras = resolveUmbralHoras({ ambito });
  return {
    unidadId: partial.unidadId ?? U1,
    placas: partial.placas,
    numeroInterno: partial.numeroInterno ?? 'UNIDAD',
    choferNombre: partial.choferNombre ?? null,
    opsEstado,
    ambito,
    destino: partial.destino ?? null,
    salidaAt,
    alerta:
      partial.alerta !== undefined
        ? partial.alerta
        : alertaSinRegreso({
            opsEstado,
            salidaAt,
            now: NOW,
            thresholdHoras,
          }),
  };
}

describe('Logística Flota ops (ADR-004 L5–L7)', () => {
  it('L5 ubicación es ambito FORANEO|LOCAL, no tipo STOCK|RUTAS', () => {
    const rows = [
      row({
        placas: '63AL5K',
        numeroInterno: 'RAM FORANEO',
        ambito: 'FORANEO',
        opsEstado: 'EN_RUTA',
        destino: 'Cliente FEMSA',
        salidaAt: HACE_25H.toISOString(),
      }),
      row({ placas: 'VU2625C', numeroInterno: 'FOTON', ambito: 'LOCAL' }),
    ];
    expect(rows.map((r) => r.ambito).sort()).toEqual(['FORANEO', 'LOCAL']);
    expect(filtrarUnidadesOps(rows, '63al', 'TODAS').map((r) => r.placas)).toEqual([
      '63AL5K',
    ]);
    expect(filtrarUnidadesOps(rows, 'foton', 'DISPONIBLE')[0].numeroInterno).toBe(
      'FOTON',
    );
    expect(
      filtrarUnidadesOps(rows, undefined, 'TODAS', 'LOCAL').map((r) => r.placas),
    ).toEqual(['VU2625C']);
    expect(kpisUnidadesOps(rows)).toEqual({
      enRuta: 1,
      disponibles: 1,
      total: 2,
      sinRegreso: 1,
    });
  });

  it('L6/L7 registrar regreso solo desde EN_RUTA; salida exige ambito', () => {
    expect(errorRegreso(OpsEstadoUnidad.EN_RUTA)).toBeNull();
    expect(errorRegreso(OpsEstadoUnidad.DISPONIBLE)).toBe(MSG_REGRESO_NO_EN_RUTA);
    expect(errorSalida('LOCAL')).toBeNull();
    expect(errorSalida('FORANEO')).toBeNull();
    expect(errorSalida()).toBe(MSG_SALIDA_SIN_AMBITO);
  });
});

describe('Logística Flota sin regreso (ADR-004 L8–L9)', () => {
  it('L8/L9 EN_RUTA bajo umbral no alerta; LOCAL 8h / FORANEO 24h', () => {
    const localReciente = row({
      placas: 'VU2626C',
      ambito: 'LOCAL',
      opsEstado: 'EN_RUTA',
      salidaAt: HACE_2H.toISOString(),
    });
    const localVencida = row({
      placas: 'VU2625C',
      ambito: 'LOCAL',
      opsEstado: 'EN_RUTA',
      salidaAt: HACE_9H.toISOString(),
    });
    const foraneoReciente = row({
      placas: 'VU2627C',
      ambito: 'FORANEO',
      opsEstado: 'EN_RUTA',
      salidaAt: HACE_9H.toISOString(),
    });
    const foraneoVencida = row({
      placas: '63AL5K',
      ambito: 'FORANEO',
      opsEstado: 'EN_RUTA',
      salidaAt: HACE_25H.toISOString(),
    });
    expect(localReciente.alerta).toBeNull();
    expect(localVencida.alerta).toBe('SIN_REGRESO');
    expect(foraneoReciente.alerta).toBeNull();
    expect(foraneoVencida.alerta).toBe('SIN_REGRESO');
    expect(
      filtrarUnidadesOps(
        [localReciente, localVencida, foraneoVencida],
        undefined,
        'TODAS',
        undefined,
        'SIN_REGRESO',
      ).map((r) => r.placas),
    ).toEqual(['VU2625C', '63AL5K']);
  });
});
