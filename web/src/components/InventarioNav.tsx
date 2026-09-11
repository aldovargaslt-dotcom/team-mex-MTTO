'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/inventario', label: 'Ítems', exact: true },
  { href: '/inventario/familias', label: 'Familias' },
  { href: '/inventario/proveedores', label: 'Proveedores' },
  { href: '/inventario/stock', label: 'Stock' },
  { href: '/inventario/movimientos', label: 'Movimientos' },
  { href: '/inventario/pendientes', label: 'Compras' },
];

export function InventarioNav() {
  const pathname = usePathname();
  return (
    <nav className="subnav" aria-label="Inventario">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={active ? 'active' : ''}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
