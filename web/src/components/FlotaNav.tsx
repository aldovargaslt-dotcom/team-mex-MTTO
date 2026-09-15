'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, LayoutList, MapPinned } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const LINKS: {
  href: string;
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}[] = [
  { href: '/flota', label: 'Tablero', exact: true, icon: LayoutList },
  { href: '/flota/ranking', label: 'Ciclos', icon: History },
  { href: '/flota/sitios', label: 'Sitios', icon: MapPinned },
];

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
        const active = isActive(pathname, link.href, link.exact);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'active gap-1.5' : 'gap-1.5'}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-3.5" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
