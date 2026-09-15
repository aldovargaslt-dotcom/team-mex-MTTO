'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/flota', label: 'Tablero', exact: true },
  { href: '/flota/ranking', label: 'Ranking' },
  { href: '/flota/sitios', label: 'Sitios' },
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

export function FlotaNav() {
  const pathname = usePathname();

  return (
    <nav className="subnav" aria-label="Flota">
      {LINKS.map((link) => {
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
    </nav>
  );
}
