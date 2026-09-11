'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role';

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: '/unidades', label: 'Unidades', exact: true },
  { href: '/unidades/configuracion', label: 'Configuración' },
];

export function UnidadesNav() {
  const pathname = usePathname();
  const { isAdmin, ready } = useRole();

  const visible =
    ready &&
    isAdmin &&
    (pathname === '/unidades' || pathname === '/unidades/configuracion');
  if (!visible) return null;

  return (
    <nav className="subnav" aria-label="Unidades">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'active' : ''}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
