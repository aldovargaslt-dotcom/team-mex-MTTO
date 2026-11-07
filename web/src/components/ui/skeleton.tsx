import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Static placeholder block (EWO-014): no shimmer, hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-md bg-muted', className)} />;
}

/**
 * Loading region with one contextual announcement. The blocks inside are
 * decorative and aria-hidden so a screen reader hears the label once.
 */
export function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn('grid gap-3', className)}>
      <span className="muted text-[13px]">{label}</span>
      <div aria-hidden="true" className="grid gap-3">
        {children}
      </div>
    </div>
  );
}

export function SkeletonRows({ rows, className }: { rows: number; className?: string }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn('h-16 w-full', className)} />
      ))}
    </>
  );
}
