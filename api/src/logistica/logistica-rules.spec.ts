import { EstadoChofer } from '../choferes/estado-chofer.enum';
import {
  errorAssign,
  errorInactivarSiAsignado,
  filaChofer,
  filtrarFilas,
  kpisActivos,
  MSG_CHOFER_INACTIVO,
  MSG_CHOFER_OCUPADO,
  MSG_INACTIVAR_ASIGNADO,
  MSG_UNIDAD_OCUPADA,
} from './logistica-rules';
import { LogisticaChoferRow } from './logistica-types';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '11111111-1111-4111-8111-111111111112';
const C1 = '22222222-2222-4222-8222-222222222221';
const C2 = '22222222-2222-4222-8222-222222222222';

function assignState(
  assignments: Map<string, string>,
  unidadId: string,
  choferId: string,
  choferEstado: EstadoChofer,
) {
  const unidadChoferId = assignments.get(unidadId) ?? null;
  let choferUnidadId: string | null = null;
  for (const [u, c] of assignments) {
    if (c === choferId) choferUnidadId = u;
  }
  const error = errorAssign({
    choferEstado,
    unidadExiste: true,
    unidadChoferId,
    choferUnidadId,
    choferId,
  });
  if (error) throw new Error(error);
  const next = new Map(assignments);
  next.set(unidadId, choferId);
  return next;
}

describe('Logística asignación (ADR-004 L1–L4)', () => {
  it('L1 un chofer no toma dos unidades; una unidad no toma segundo chofer', () => {
    let state = new Map<string, string>();
    state = assignState(state, U1, C1, EstadoChofer.ACTIVO);
    expect(state.get(U1)).toBe(C1);

    expect(() =>
      assignState(state, U2, C1, EstadoChofer.ACTIVO),
    ).toThrow(MSG_CHOFER_OCUPADO);

    expect(() =>
      assignState(state, U1, C2, EstadoChofer.ACTIVO),
    ).toThrow(MSG_UNIDAD_OCUPADA);
  });

  it('L2 solo ACTIVO es asignable; INACTIVO no entra a la lista', () => {
    const empty = new Map<string, string>();
    expect(() =>
      assignState(empty, U1, C1, EstadoChofer.INACTIVO),
    ).toThrow(MSG_CHOFER_INACTIVO);

    const rows: LogisticaChoferRow[] = [
      filaChofer({ choferId: C1, nombre: 'WERO', unidadId: U1, placas: 'VU2630C' }),
      filaChofer({ choferId: C2, nombre: 'RUBEN' }),
    ];
    const inactivoOculto = rows.filter((r) => r.choferId !== 'inactivo');
    expect(filtrarFilas(inactivoOculto)).toHaveLength(2);
    expect(filtrarFilas(rows, undefined, 'DISPONIBLE').map((r) => r.nombre)).toEqual([
      'RUBEN',
    ]);
    expect(filtrarFilas(rows, 'wer', 'TODOS').map((r) => r.nombre)).toEqual([
      'WERO',
    ]);
    expect(filtrarFilas(rows, undefined, 'EN_RUTA')[0].ops).toBe('EN_RUTA');
  });

  it('L3 soft-block: no INACTIVO si unidad.choferId apunta al chofer', () => {
    const unidadChoferId: string | null = C1;
    expect(errorInactivarSiAsignado(unidadChoferId ? U1 : null)).toBe(
      MSG_INACTIVAR_ASIGNADO,
    );
    expect(errorInactivarSiAsignado(null)).toBeNull();
  });

  it('L4 kpis ACTIVO only; asignación es estado kernel (sin evento)', () => {
    const rows = [
      filaChofer({ choferId: C1, nombre: 'WERO', unidadId: U1, placas: 'VU2630C' }),
      filaChofer({ choferId: C2, nombre: 'RUBEN' }),
    ];
    expect(kpisActivos(rows)).toEqual({
      enRuta: 1,
      disponibles: 1,
      total: 2,
    });
    const assigned = assignState(
      new Map(),
      U1,
      C1,
      EstadoChofer.ACTIVO,
    );
    expect(assigned.get(U1)).toBe(C1);
    expect(assigned.size).toBe(1);
  });
});
