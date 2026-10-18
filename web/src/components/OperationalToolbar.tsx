import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared query surface; callers retain data, filtering and authorization. */
export function OperationalToolbar({ label, className, children }: {
  label: string; className?: string; children: ReactNode;
}) {
  return <section aria-label={label} className={cn('operational-toolbar', className)}>{children}</section>;
}
