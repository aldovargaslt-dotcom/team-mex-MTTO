'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { InventorySectionMenu } from '@/components/InventorySectionMenu';
import { useRole } from '@/lib/role';
import { INVENTORY_OPS as OPS, INVENTORY_CATALOG as CATALOGO, isInventoryDestination as isActive } from '@/lib/inventory-navigation';

export function InventarioNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const catalogOpen = CATALOGO.some((link) => isActive(pathname, link.href, link.exact));
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
      {role === 'ADMIN_DIRECTIVO' ? <div className="inventory-mobile-nav"><InventorySectionMenu /></div> : null}
      <nav ref={primaryNav} className="subnav inventory-primary-nav" aria-label="Inventario">
        {OPS.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
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
          href="/inventario"
          className={catalogOpen ? 'active' : ''}
          aria-current={catalogOpen ? 'location' : undefined}
        >
          Catálogo
        </Link>
      </nav>
      {catalogOpen ? (
        <nav className="subnav inventory-catalog-nav" aria-label="Catálogo">
          {CATALOGO.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
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
