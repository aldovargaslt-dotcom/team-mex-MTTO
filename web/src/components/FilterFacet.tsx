'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FilterFacet({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('filter-facet', className)}>
      <p className="filter-facet__kicker">{label}</p>
      <div className="filter-facet__controls">{children}</div>
    </div>
  );
}
