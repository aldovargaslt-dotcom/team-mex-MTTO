import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#d8d8de] disabled:text-[#5c5c66] disabled:border-[#d8d8de] [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[color:var(--cta-hover)]',
        secondary:
          'bg-card text-navy border border-border hover:bg-muted',
        outline:
          'bg-card text-navy border-[1.5px] border-navy hover:bg-muted',
        ghost: 'bg-transparent text-white hover:bg-white/10 min-h-9 text-[13px]',
        destructive:
          'bg-transparent text-destructive border border-[#f0c7c3] hover:bg-red-50',
        link: 'text-navy underline-offset-4 hover:underline h-auto min-h-0 min-w-0 px-0',
      },
      size: {
        default: 'min-h-11 min-w-11 h-11 px-4',
        compact: 'min-h-8 min-w-0 h-8 px-2.5 text-[13px]',
        lg: 'min-h-12 h-12 px-6 text-base',
        icon: 'size-11',
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
