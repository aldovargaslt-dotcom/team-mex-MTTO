'use client';

import { FlotaNav } from '@/components/FlotaNav';
import { RoleGate } from '@/components/RoleGate';

export default function FlotaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <FlotaNav />
      {children}
    </RoleGate>
  );
}
