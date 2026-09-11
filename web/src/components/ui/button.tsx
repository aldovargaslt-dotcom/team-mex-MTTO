import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#d8d8de] disabled:text-[#5c5c66] disabled:border-[#d8d8de] [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[color:var(--cta-hover)]',
        secondary:
          'bg-card text-navy border border-border hover:bg-muted',
        outline:
          'bg-card text-navy border-[1.5px] border-navy hover:bg-muted',
        ghost: 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white min-h-8 text-[12px] font-normal',
        destructive:
          'bg-transparent text-destructive border border-[#f0c7c3] hover:bg-red-50',
        link: 'text-navy underline-offset-4 hover:underline h-auto min-h-0 min-w-0 px-0',
        entrada:
          'bg-btn-entrada text-btn-entrada-foreground border border-btn-entrada-border hover:bg-btn-entrada-hover',
        quiet:
          'bg-btn-quiet text-btn-quiet-foreground border border-btn-quiet-border hover:bg-btn-quiet-hover',
        dangerSoft:
          'bg-btn-danger-soft text-btn-danger-soft-foreground border border-btn-danger-soft-border hover:bg-btn-danger-soft-hover',
      },
      size: {
        default: 'min-h-11 min-w-11 h-11 px-3.5 md:min-h-10 md:min-w-10 md:h-10',
        compact: 'min-h-11 min-w-11 h-11 px-3 text-[13px] md:min-h-8 md:min-w-0 md:h-8 md:px-2.5',
        lg: 'min-h-11 h-11 px-5 md:min-h-10 md:h-10',
        icon: 'size-11 md:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
