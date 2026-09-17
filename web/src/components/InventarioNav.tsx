'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const OPS = [
  { href: '/inventario', label: 'Refacciones', exact: true },
  { href: '/inventario/stock', label: 'Existencias' },
  { href: '/inventario/movimientos', label: 'Movimientos' },
  { href: '/inventario/consumo', label: 'Consumo' },
  { href: '/inventario/pendientes', label: 'Por recibir' },
] as const;

const CATALOGO = [
  { href: '/inventario/familias', label: 'Categorías' },
  { href: '/inventario/proveedores', label: 'Proveedores' },
] as const;

function isActive(
  pathname: string | null,
  href: string,
  exact?: boolean,
) {
  if (!pathname) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InventarioNav() {
  const pathname = usePathname();
  const catalogOpen = CATALOGO.some((link) => isActive(pathname, link.href));

  return (
    <>
      <nav className="subnav" aria-label="Inventario">
        {OPS.map((link) => {
          const active = isActive(pathname, link.href, 'exact' in link && link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/inventario/familias"
          className={catalogOpen ? 'active' : ''}
        >
          Catálogo
        </Link>
      </nav>
      {catalogOpen ? (
        <nav className="subnav" aria-label="Catálogo">
          {CATALOGO.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
