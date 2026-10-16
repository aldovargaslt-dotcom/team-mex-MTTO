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
      <div className="inventory-workspace">
        <InventarioNav />
        {children}
      </div>
    </RoleGate>
  );
}
