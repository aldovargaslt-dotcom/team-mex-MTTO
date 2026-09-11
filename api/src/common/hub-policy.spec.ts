import { EstadoUnidad } from './estado-unidad.enum';
import { mensajeVisita, puedeCrearVisita } from './hub-policy';
import { Rol } from '../auth/roles.enum';

describe('hub-policy', () => {
  it('solo SUPERVISOR + ACTIVA puede crear visita', () => {
    expect(puedeCrearVisita(Rol.SUPERVISOR, EstadoUnidad.ACTIVA)).toBe(true);
    expect(puedeCrearVisita(Rol.SUPERVISOR, EstadoUnidad.INACTIVA)).toBe(false);
    expect(puedeCrearVisita(Rol.ADMIN_DIRECTIVO, EstadoUnidad.ACTIVA)).toBe(
      false,
    );
    expect(puedeCrearVisita(Rol.ADMIN_DIRECTIVO, EstadoUnidad.INACTIVA)).toBe(
      false,
    );
  });

  it('mensajes en español', () => {
    expect(mensajeVisita(Rol.ADMIN_DIRECTIVO, EstadoUnidad.ACTIVA)).toMatch(
      /administrador/i,
    );
    expect(mensajeVisita(Rol.SUPERVISOR, EstadoUnidad.INACTIVA)).toMatch(
      /inactiva/i,
    );
  });
});
