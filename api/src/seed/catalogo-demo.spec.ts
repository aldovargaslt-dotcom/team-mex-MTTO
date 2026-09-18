import {
  CHOFERES_DEMO,
  TIPO_CAMIONES_3_Y_MEDIA,
  TIPO_RUTAS,
  TIPO_STOCK,
  TIPOS_DEMO,
  UNIDADES_DEMO,
  UNIDAD_ANDON_DEMO,
  PLACAS_ANDON_DEMO,
} from './catalogo-demo';

describe('catalogo-demo (Aldo fleet, Slice 1)', () => {
  it('locks 3 ops-group tipos (not models)', () => {
    expect(TIPOS_DEMO.map((t) => t.nombre)).toEqual([
      TIPO_STOCK,
      TIPO_RUTAS,
      TIPO_CAMIONES_3_Y_MEDIA,
    ]);
    expect(TIPOS_DEMO.map((t) => t.nombre)).toEqual([
      'STOCK',
      'RUTAS',
      'CAMIONES 3 Y MEDIA',
    ]);
  });

  it('locks 7 ACTIVO choferes with exact names, no placeholders', () => {
    expect([...CHOFERES_DEMO]).toEqual([
      'WERO',
      'DON NOE',
      'DON MIGUEL',
      'JULIO',
      'JOEL',
      'BRYAN',
      'RUBEN',
    ]);
    expect(CHOFERES_DEMO).toHaveLength(7);
    const joined = CHOFERES_DEMO.join(' ');
    expect(joined).not.toMatch(/Juan|María|Maria|Pérez|placeholder|N\/A|test/i);
  });

  it('does not include the previous placeholder catalog keys', () => {
    const placas = UNIDADES_DEMO.map((u) => u.placas);
    expect(placas).not.toContain('TMX-101-A');
    expect([...CHOFERES_DEMO]).not.toContain('Juan Pérez');
    expect(TIPOS_DEMO.map((t) => t.nombre)).not.toContain('Camión');
  });

  it('locks 13 unidades: exact nombre|placas|tipo|chofer', () => {
    expect(UNIDADES_DEMO).toHaveLength(13);
    expect(
      UNIDADES_DEMO.map((u) => [
        u.nombre,
        u.placas,
        u.tipoNombre,
        u.choferNombre,
      ]),
    ).toEqual([
      ['FOTON', 'VU2625C', 'STOCK', null],
      ['NISSAN REDILAS', 'VU2632C', 'STOCK', null],
      ['URVAN', 'VU2629C', 'STOCK', null],
      ['NISSAN CERRADA', 'VU2630C', 'RUTAS', 'WERO'],
      ['URVAN 2018', 'VU2634C', 'RUTAS', 'DON NOE'],
      ['TOYOTA 2017', 'VU2628C', 'RUTAS', 'DON MIGUEL'],
      ['DUCATO 2021', 'VU2626C', 'RUTAS', 'JULIO'],
      ['TRANSIT 2023', 'WH9236C', 'RUTAS', 'JOEL'],
      ['DUCATO 2023', 'VU2627C', 'RUTAS', 'BRYAN'],
      ['RAM CODISA', 'VU2622C', 'CAMIONES 3 Y MEDIA', null],
      ['RAM FORANEO', '63AL5K', 'CAMIONES 3 Y MEDIA', null],
      ['FORD 2017', 'VU2624C', 'CAMIONES 3 Y MEDIA', 'RUBEN'],
      ['CHATO NUEVO', 'WR2023C', 'CAMIONES 3 Y MEDIA', null],
    ]);
  });

  it('uses unique natural keys (tipo nombre, chofer nombre, placas, unidad nombre)', () => {
    const placas = UNIDADES_DEMO.map((u) => u.placas);
    expect(new Set(placas).size).toBe(placas.length);
    const nombres = UNIDADES_DEMO.map((u) => u.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    const tipos = TIPOS_DEMO.map((t) => t.nombre);
    expect(new Set(tipos).size).toBe(tipos.length);
    expect(new Set(CHOFERES_DEMO).size).toBe(CHOFERES_DEMO.length);
  });

  it('maps chofer names only to catalog choferes', () => {
    const allowed = new Set<string>(CHOFERES_DEMO);
    for (const unidad of UNIDADES_DEMO) {
      if (unidad.choferNombre) {
        expect(allowed.has(unidad.choferNombre)).toBe(true);
      }
    }
  });

  it('Andon demo unit is FOTON / VU2625C (STOCK, no chofer)', () => {
    expect(UNIDAD_ANDON_DEMO).toBe('FOTON');
    expect(PLACAS_ANDON_DEMO).toBe('VU2625C');
    const foton = UNIDADES_DEMO.find((u) => u.nombre === UNIDAD_ANDON_DEMO);
    expect(foton?.placas).toBe(PLACAS_ANDON_DEMO);
    expect(foton?.tipoNombre).toBe('STOCK');
    expect(foton?.choferNombre).toBeNull();
  });
});
