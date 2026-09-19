import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';
import {
  alertaSinRegreso,
  errorRegreso,
  filtrarUnidadesOps,
  kpisUnidadesOps,
  MSG_REGRESO_NO_EN_RUTA,
} from './logistica-rules';
import { LogisticaUnidadRow } from './logistica-types';

const U1 = '11111111-1111-4111-8111-111111111111';

function row(
  partial: Partial<LogisticaUnidadRow> & Pick<LogisticaUnidadRow, 'placas'>,
): LogisticaUnidadRow {
  const opsEstado = partial.opsEstado ?? 'DISPONIBLE';
  return {
    unidadId: partial.unidadId ?? U1,
    placas: partial.placas,
    numeroInterno: partial.numeroInterno ?? 'UNIDAD',
    choferNombre: partial.choferNombre ?? null,
    opsEstado,
    ambito: partial.ambito ?? 'LOCAL',
    destino: partial.destino ?? null,
    alerta: alertaSinRegreso(opsEstado),
  };
}

describe('Logística Flota ops (ADR-004 L5–L7)', () => {
  it('L5 ubicación es ambito FORANEO|LOCAL, no tipo STOCK|RUTAS', () => {
    const rows = [
      row({ placas: '63AL5K', numeroInterno: 'RAM FORANEO', ambito: 'FORANEO', opsEstado: 'EN_RUTA', destino: 'Cliente FEMSA' }),
      row({ placas: 'VU2625C', numeroInterno: 'FOTON', ambito: 'LOCAL' }),
    ];
    expect(rows.map((r) => r.ambito).sort()).toEqual(['FORANEO', 'LOCAL']);
    expect(filtrarUnidadesOps(rows, '63al', 'TODAS').map((r) => r.placas)).toEqual([
      '63AL5K',
    ]);
    expect(filtrarUnidadesOps(rows, 'foton', 'DISPONIBLE')[0].numeroInterno).toBe(
      'FOTON',
    );
    expect(kpisUnidadesOps(rows)).toEqual({
      enRuta: 1,
      disponibles: 1,
      total: 2,
    });
  });

  it('L6/L7 registrar regreso solo desde EN_RUTA; alerta sin regreso', () => {
    expect(errorRegreso(OpsEstadoUnidad.EN_RUTA)).toBeNull();
    expect(errorRegreso(OpsEstadoUnidad.DISPONIBLE)).toBe(MSG_REGRESO_NO_EN_RUTA);
    expect(alertaSinRegreso('EN_RUTA')).toBe('SIN_REGRESO');
    expect(alertaSinRegreso('DISPONIBLE')).toBeNull();
  });
});
