import { EstadoUnidad } from './estado-unidad.enum';
import { MotivoInactivacion } from './motivo-inactivacion.enum';
import { mensajesHub, puedeCrearVisita } from './hub-policy';
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
    expect(puedeCrearVisita(Rol.LOGISTICA, EstadoUnidad.ACTIVA)).toBe(false);
  });

  it('mensajes en español según rol, estado y catálogo de choferes', () => {
    expect(
      mensajesHub(Rol.ADMIN_DIRECTIVO, EstadoUnidad.ACTIVA, true)[0],
    ).toMatch(/administrador/i);
    expect(
      mensajesHub(Rol.SUPERVISOR, EstadoUnidad.INACTIVA, true)[0],
    ).toMatch(/inactiva/i);
    expect(
      mensajesHub(
        Rol.SUPERVISOR,
        EstadoUnidad.INACTIVA,
        true,
        MotivoInactivacion.ENVIO_ESPECIAL,
      )[0],
    ).toMatch(/envío especial/i);
    expect(
      mensajesHub(Rol.LOGISTICA, EstadoUnidad.ACTIVA, true)[0],
    ).toMatch(/Logística no crea/i);
    expect(
      mensajesHub(Rol.SUPERVISOR, EstadoUnidad.ACTIVA, false)[0],
    ).toBe(
      'No hay choferes activos. Pide alta o reactivación a administración.',
    );
    expect(
      mensajesHub(Rol.SUPERVISOR, EstadoUnidad.ACTIVA, true)[0],
    ).toMatch(/nueva visita/i);
  });
});
