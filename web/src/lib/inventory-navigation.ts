export type InventoryDestination = { href: string; label: string; exact?: boolean };

export const INVENTORY_OPS: readonly InventoryDestination[] = [
  { href: '/inventario/stock', label: 'Existencias' },
  { href: '/inventario', label: 'Refacciones', exact: true },
  { href: '/inventario/analisis', label: 'Análisis' },
  { href: '/inventario/pendientes', label: 'Comprobantes' },
];

export const INVENTORY_CATALOG: readonly InventoryDestination[] = [
  { href: '/inventario/familias', label: 'Categorías' },
  { href: '/inventario/proveedores', label: 'Proveedores' },
];

export function isInventoryDestination(pathname: string | null, href: string, exact?: boolean) {
  return pathname === href || (!exact && Boolean(pathname?.startsWith(`${href}/`)));
}

export function currentInventorySection(pathname: string | null) {
  const current = [...INVENTORY_OPS, ...INVENTORY_CATALOG].find((link) =>
    isInventoryDestination(pathname, link.href, link.exact));
  return current ?? { href: '', label: pathname?.startsWith('/inventario/movimientos')
    ? 'Movimientos' : pathname?.startsWith('/inventario/consumo') ? 'Consumo' : 'Inventario' };
}
