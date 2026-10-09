'use client';

import { ConfiguracionNav } from '@/components/ConfiguracionNav';
import { RoleGate } from '@/components/RoleGate';
import { usePathname } from 'next/navigation';

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <RoleGate
      allow={
        pathname?.startsWith('/configuracion/usuarios')
          ? ['ADMIN_DIRECTIVO']
          : ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA']
      }
    >
      <ConfiguracionNav />
      {children}
    </RoleGate>
  );
}
