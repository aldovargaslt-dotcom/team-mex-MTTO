import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Hint } from '@/components/ui/hint';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  children,
  className,
  hint,
  help,
  error,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  help?: string;
  /** Inline blocking message; marks the control invalid and describes it. */
  error?: string | null;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const control =
    error && errorId && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-invalid': true,
          'aria-describedby': errorId,
        })
      : children;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {help ? (
        <div className="flex items-center gap-1">
          <Label htmlFor={htmlFor}>{label}</Label>
          <Hint label={help} />
        </div>
      ) : (
        <Label htmlFor={htmlFor}>{label}</Label>
      )}
      {control}
      {error ? (
        <p id={errorId} className="text-[12px] font-medium text-destructive">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
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
          ? 'bg-status-warning-bg text-status-warning-fg'
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
  help,
  kicker,
  actions,
}: {
  title: ReactNode;
  lede?: ReactNode;
  help?: string;
  kicker?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? (
          <p className="text-xs text-muted-foreground">{kicker}</p>
        ) : null}
        <h1 className="inline-flex items-center gap-1.5 text-[20px] font-semibold text-navy">
          {title}
          {help ? <Hint label={help} /> : null}
        </h1>
        {lede ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{lede}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
