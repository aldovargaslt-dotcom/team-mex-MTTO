import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  children,
  className,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[13px] text-destructive">
      {children}
    </p>
  );
}

export function Note({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'warn';
}) {
  return (
    <div
      role={variant === 'warn' ? 'status' : undefined}
      className={cn(
        'mt-3 rounded-md px-3 py-2 text-[13px]',
        variant === 'warn'
          ? 'bg-[#fff4e8] text-[#8a4b12]'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  lede,
  kicker,
  actions,
}: {
  title: ReactNode;
  lede?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? (
          <p className="text-xs text-muted-foreground">{kicker}</p>
        ) : null}
        <h1 className="text-[20px] font-semibold text-navy">{title}</h1>
        {lede ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{lede}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
