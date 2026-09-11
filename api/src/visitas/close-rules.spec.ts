import { EstadoUnidad } from '../common/estado-unidad.enum';
import { erroresCierre, mensajeKmInvalido } from './close-rules';
import { EstadoVisita, TipoFirma, TipoVisita } from './enums';

describe('close-rules', () => {
  const base = {
    estadoVisita: EstadoVisita.BORRADOR,
    unidadEstado: EstadoUnidad.ACTIVA,
    choferId: 'chofer-1',
    km: 1000,
    ultimoKmCerrado: 500,
    tipo: TipoVisita.PREDICTIVO,
    trabajos: 1,
    firmas: [TipoFirma.CHOFER, TipoFirma.JEFE],
  };

  it('acepta un cierre completo', () => {
    expect(erroresCierre(base)).toEqual([]);
  });

  it('exige unidad activa, chofer, km, tipo, trabajos y ambas firmas', () => {
    expect(
      erroresCierre({ ...base, unidadEstado: EstadoUnidad.INACTIVA })[0],
    ).toMatch(/inactiva/i);
    expect(erroresCierre({ ...base, choferId: null })[0]).toMatch(/chofer/i);
    expect(erroresCierre({ ...base, km: null })[0]).toMatch(/kilometraje/i);
    expect(erroresCierre({ ...base, tipo: null })[0]).toMatch(/predictivo/i);
    expect(erroresCierre({ ...base, trabajos: 0 })[0]).toMatch(/trabajo/i);
    expect(erroresCierre({ ...base, firmas: [TipoFirma.CHOFER] })[0]).toMatch(
      /firmas/i,
    );
  });

  it('no permite km menor al último cerrado ni siquiera como valor suelto', () => {
    expect(mensajeKmInvalido(400, 500)).toMatch(/último km cerrado/i);
    expect(mensajeKmInvalido(500, 500)).toBeNull();
    expect(mensajeKmInvalido(0, null)).toBeNull();
    expect(mensajeKmInvalido(-1, null)).toMatch(/mayor o igual a 0/i);
  });

  it('no reabre una visita ya cerrada', () => {
    expect(
      erroresCierre({ ...base, estadoVisita: EstadoVisita.CERRADO })[0],
    ).toMatch(/ya está cerrada/i);
  });
});
