import { CategoriaTrabajo } from './enums';
import { CATALOGO_TRABAJOS, esTrabajoCatalogo } from './trabajos-catalogo';

describe('trabajos-catalogo', () => {
  it('es exactamente el brief: 5 categorías y 11 ítems, sin combustible', () => {
    expect(CATALOGO_TRABAJOS).toHaveLength(5);
    expect(CATALOGO_TRABAJOS.flatMap((c) => c.items)).toHaveLength(11);
    expect(CATALOGO_TRABAJOS.map((c) => [c.categoria, c.nombre, ...c.items])).toEqual([
      [
        CategoriaTrabajo.A,
        'Motor y sistema de distribución / auxiliares',
        'Kit de tiempo / distribución',
        'Bomba de agua y refrigerante',
        'Afinación / filtros de aceite',
        'Bandas de accesorios / poleas',
      ],
      [
        CategoriaTrabajo.B,
        'Sistema de frenos',
        'Balatas delanteras / traseras',
        'Discos y líquido de frenos',
      ],
      [
        CategoriaTrabajo.C,
        'Suspensión y dirección',
        'Amortiguadores y bujes',
        'Alineación y balanceo',
      ],
      [
        CategoriaTrabajo.D,
        'Llantas y neumáticos',
        'Calibración y rotación',
      ],
      [
        CategoriaTrabajo.E,
        'Carrocería, luces e interiores',
        'Sistema eléctrico y luces',
        'Carrocería e interiores',
      ],
    ]);
    expect(JSON.stringify(CATALOGO_TRABAJOS)).not.toMatch(/combustible/i);
    expect(esTrabajoCatalogo(CategoriaTrabajo.A, 'Kit de tiempo / distribución')).toBe(
      true,
    );
    expect(esTrabajoCatalogo(CategoriaTrabajo.B, 'Filtro de combustible')).toBe(
      false,
    );
  });
});
