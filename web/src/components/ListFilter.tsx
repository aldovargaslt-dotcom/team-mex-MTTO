'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
};

export function ListFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('list-filter', className)}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.id === value;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            className={cn('inline-flex items-center justify-center gap-1.5', selected && 'active')}
            onClick={() => onChange(option.id)}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
