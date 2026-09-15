'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function FilterDisclosure({
  summary,
  label,
  children,
}: {
  summary: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="filter-disclosure">
      <summary aria-label={label}>
        <span>{summary}</span>
        <ChevronDown className="filter-disclosure__chevron" aria-hidden />
      </summary>
      <div className="filter-disclosure__panel">{children}</div>
    </details>
  );
}
