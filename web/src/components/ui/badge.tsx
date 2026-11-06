import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide w-fit whitespace-nowrap shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-muted text-navy',
        outline: 'text-foreground',
        success: 'border-transparent bg-status-success-bg text-status-success-fg',
        muted: 'border-transparent bg-status-muted-bg text-status-muted-fg',
        warning: 'border-transparent bg-status-warning-bg text-status-warning-fg',
        danger: 'border-transparent bg-status-danger-bg text-status-danger-fg',
        info: 'border-transparent bg-status-info-bg text-status-info-fg',
        navy: 'border-transparent bg-navy text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
