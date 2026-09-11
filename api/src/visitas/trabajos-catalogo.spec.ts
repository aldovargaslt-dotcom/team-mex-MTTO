import { CategoriaTrabajo } from './enums';
import { CATALOGO_TRABAJOS, esTrabajoCatalogo } from './trabajos-catalogo';

describe('trabajos-catalogo', () => {
  it('cubre categorías A–E con kit de tiempo, bomba de agua y carrocería', () => {
    expect(CATALOGO_TRABAJOS.map((c) => c.categoria)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(esTrabajoCatalogo(CategoriaTrabajo.A, 'Kit de tiempo')).toBe(true);
    expect(esTrabajoCatalogo(CategoriaTrabajo.A, 'Bomba de agua')).toBe(true);
    expect(esTrabajoCatalogo(CategoriaTrabajo.E, 'Carrocería')).toBe(true);
    expect(esTrabajoCatalogo(CategoriaTrabajo.A, 'Carrocería')).toBe(false);
  });
});
