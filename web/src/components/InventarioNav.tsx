'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const OPS = [
  { href: '/inventario/stock', label: 'Existencias' },
  { href: '/inventario', label: 'Refacciones', exact: true },
  { href: '/inventario/analisis', label: 'Análisis' },
  { href: '/inventario/pendientes', label: 'Comprobantes' },
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
  const primaryNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = primaryNav.current;
    const active = nav?.querySelector<HTMLElement>('.active');
    if (!nav || !active) return;
    const parent = nav.getBoundingClientRect();
    const link = active.getBoundingClientRect();
    if (link.left < parent.left) nav.scrollLeft += link.left - parent.left;
    else if (link.right > parent.right) nav.scrollLeft += link.right - parent.right;
  }, [pathname]);

  return (
    <>
      <nav ref={primaryNav} className="subnav inventory-primary-nav" aria-label="Inventario">
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
          aria-current={catalogOpen ? 'location' : undefined}
        >
          Catálogo
        </Link>
      </nav>
      {catalogOpen ? (
        <nav className="subnav inventory-catalog-nav" aria-label="Catálogo">
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
