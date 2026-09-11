import { CategoriaTrabajo } from './enums';

export type CategoriaCatalogo = {
  categoria: CategoriaTrabajo;
  nombre: string;
  items: string[];
};

export const CATALOGO_TRABAJOS: CategoriaCatalogo[] = [
  {
    categoria: CategoriaTrabajo.A,
    nombre: 'Motor',
    items: [
      'Kit de tiempo',
      'Bomba de agua',
      'Aceite de motor',
      'Filtro de aceite',
      'Filtro de aire',
      'Bandas y tensores',
    ],
  },
  {
    categoria: CategoriaTrabajo.B,
    nombre: 'Combustible y enfriamiento',
    items: [
      'Filtro de combustible',
      'Inyectores',
      'Anticongelante',
      'Mangueras y abrazaderas',
      'Radiador',
    ],
  },
  {
    categoria: CategoriaTrabajo.C,
    nombre: 'Frenos y dirección',
    items: [
      'Balatas o pastillas',
      'Tambores o discos',
      'Líquido de frenos',
      'Dirección y terminales',
    ],
  },
  {
    categoria: CategoriaTrabajo.D,
    nombre: 'Eléctrico y rodamiento',
    items: [
      'Batería',
      'Luces y cableado',
      'Amortiguadores',
      'Llantas y presión',
    ],
  },
  {
    categoria: CategoriaTrabajo.E,
    nombre: 'Carrocería',
    items: [
      'Carrocería',
      'Espejos y cristales',
      'Cabina e interiores',
      'Limpieza general',
    ],
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
