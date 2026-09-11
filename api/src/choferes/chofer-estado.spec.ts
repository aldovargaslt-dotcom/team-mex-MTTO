import {
  EstadoChofer,
  MENSAJE_SIN_CHOFERES_ACTIVOS,
  puedeAsignarChoferAVisita,
} from './estado-chofer.enum';

describe('chofer estado v0', () => {
  it('solo ACTIVO se puede asignar a una visita', () => {
    expect(puedeAsignarChoferAVisita(EstadoChofer.ACTIVO)).toBe(true);
    expect(puedeAsignarChoferAVisita(EstadoChofer.INACTIVO)).toBe(false);
  });

  it('el aviso sin activos pide alta o reactivación', () => {
    expect(MENSAJE_SIN_CHOFERES_ACTIVOS).toBe(
      'No hay choferes activos. Pide alta o reactivación a administración.',
    );
  });
});
