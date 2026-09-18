import type { ReactNode } from 'react';
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
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  help?: string;
}) {
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

export function ListChrome({
  title,
  count,
  filters,
  actions,
}: {
  title: ReactNode;
  count?: number;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="list-chrome">
      <div className="list-chrome__title">
        <h1>
          {title}
          {count != null ? (
            <span className="list-chrome__count">{count}</span>
          ) : null}
        </h1>
      </div>
      {filters ? <div className="list-chrome__filters">{filters}</div> : null}
      {actions ? <div className="list-chrome__actions">{actions}</div> : null}
    </div>
  );
}
