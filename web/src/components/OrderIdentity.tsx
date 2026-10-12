import { ClipboardCheck, FileText } from 'lucide-react';
import { numeroOrden } from '@/lib/format';

/** A document identity, distinct from the vehicle the order concerns. */
export function OrderIdentity({ id, check }: { id: string; check: boolean }) {
  const Icon = check ? ClipboardCheck : FileText;
  return (
    <span className="flex w-full min-w-0 items-center justify-between gap-2 border-b border-border pb-2 text-xs">
      <span className="flex min-w-0 items-center gap-2 font-medium text-navy">
        <Icon className="size-4 shrink-0" aria-hidden />
        {check ? 'Orden de revisión' : 'Orden de trabajo'}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {check ? `CHK · ${id.slice(0, 8).toUpperCase()}` : numeroOrden(id)}
      </span>
    </span>
  );
}
