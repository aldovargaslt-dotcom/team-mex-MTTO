'use client';

import { UnidadesNav } from '@/components/UnidadesNav';

export default function UnidadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UnidadesNav />
      {children}
    </>
  );
}
