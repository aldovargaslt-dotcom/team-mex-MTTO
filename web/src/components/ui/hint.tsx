import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Hint({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn('hint', className)}
      data-tip={label}
      aria-label={label}
    >
      <CircleHelp className="size-3.5" aria-hidden />
    </button>
  );
}
