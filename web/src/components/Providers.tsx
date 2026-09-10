'use client';

import { RoleProvider } from '@/lib/role';
import { AppShell } from './AppShell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AppShell>{children}</AppShell>
    </RoleProvider>
  );
}
