'use client';

import { cn } from '@/lib/utils';

type Option<T extends string> = {
  id: T;
  label: string;
};

export function ListFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  segmented = false,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (id: T) => void;
  className?: string;
  segmented?: boolean;
}) {
  return (
    <div
      className={cn(
        'list-filter',
        segmented && 'list-filter--segmented',
        className,
      )}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            className={selected ? 'active' : ''}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
