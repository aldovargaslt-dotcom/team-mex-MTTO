import { CategoriaTrabajo } from './enums';

export type CategoriaCatalogo = {
  categoria: CategoriaTrabajo;
  nombre: string;
  items: string[];
};

export const CATALOGO_TRABAJOS: CategoriaCatalogo[] = [
  {
    categoria: CategoriaTrabajo.A,
    nombre: 'Motor y sistema de distribución / auxiliares',
    items: [
      'Kit de tiempo / distribución',
      'Bomba de agua y refrigerante',
      'Afinación / filtros de aceite',
      'Bandas de accesorios / poleas',
    ],
  },
  {
    categoria: CategoriaTrabajo.B,
    nombre: 'Sistema de frenos',
    items: ['Balatas delanteras / traseras', 'Discos y líquido de frenos'],
  },
  {
    categoria: CategoriaTrabajo.C,
    nombre: 'Suspensión y dirección',
    items: ['Amortiguadores y bujes', 'Alineación y balanceo'],
  },
  {
    categoria: CategoriaTrabajo.D,
    nombre: 'Llantas y neumáticos',
    items: ['Calibración y rotación'],
  },
  {
    categoria: CategoriaTrabajo.E,
    nombre: 'Carrocería, luces e interiores',
    items: ['Sistema eléctrico y luces', 'Carrocería e interiores'],
  },
];

const ITEM_SET = new Map<string, Set<string>>(
  CATALOGO_TRABAJOS.map((categoria) => [
    categoria.categoria,
    new Set(categoria.items),
  ]),
);

export function esTrabajoCatalogo(
  categoria: string,
  item: string,
): boolean {
  return ITEM_SET.get(categoria as CategoriaTrabajo)?.has(item) === true;
}
