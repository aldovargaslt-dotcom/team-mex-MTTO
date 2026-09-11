import * as React from 'react';
import { cn } from '@/lib/utils';

export const controlClassName =
  'flex h-11 w-full min-h-11 md:h-10 md:min-h-10 rounded-md border border-input bg-card px-2.5 text-sm text-foreground shadow-none transition-colors touch-manipulation file:border-0 file:bg-transparent file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(controlClassName, className)}
      {...props}
    />
  );
}

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(controlClassName, className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClassName, 'min-h-[88px] py-2.5', className)}
      {...props}
    />
  );
}

export { Input, NativeSelect, Textarea };
