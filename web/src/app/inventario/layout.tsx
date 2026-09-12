'use client';

import { RoleGate } from '@/components/RoleGate';
import { InventarioNav } from '@/components/InventarioNav';

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <InventarioNav />
      {children}
    </RoleGate>
  );
}
