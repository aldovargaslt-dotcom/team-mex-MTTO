import { CategoriaTrabajo } from './enums';
import { CATALOGO_TRABAJOS, esTrabajoCatalogo } from './trabajos-catalogo';

describe('trabajos-catalogo', () => {
  it('cubre el checklist A–E del brief, sin ítems inventados', () => {
    expect(CATALOGO_TRABAJOS.map((c) => c.categoria)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(CATALOGO_TRABAJOS.map((c) => c.nombre)).toEqual([
      'Motor y sistema de distribución / auxiliares',
      'Sistema de frenos',
      'Suspensión y dirección',
      'Llantas y neumáticos',
      'Carrocería, luces e interiores',
    ]);
    expect(
      esTrabajoCatalogo(CategoriaTrabajo.A, 'Kit de tiempo / distribución'),
    ).toBe(true);
    expect(
      esTrabajoCatalogo(CategoriaTrabajo.A, 'Bomba de agua y refrigerante'),
    ).toBe(true);
    expect(
      esTrabajoCatalogo(CategoriaTrabajo.E, 'Carrocería e interiores'),
    ).toBe(true);
    expect(esTrabajoCatalogo(CategoriaTrabajo.A, 'Carrocería')).toBe(false);
    expect(esTrabajoCatalogo(CategoriaTrabajo.B, 'Filtro de combustible')).toBe(
      false,
    );
  });
});
