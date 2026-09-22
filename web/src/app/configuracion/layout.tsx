'use client';

import { ConfiguracionNav } from '@/components/ConfiguracionNav';
import { RoleGate } from '@/components/RoleGate';

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA']}>
      <ConfiguracionNav />
      {children}
    </RoleGate>
  );
}
