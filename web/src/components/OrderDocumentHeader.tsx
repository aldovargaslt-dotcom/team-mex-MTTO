import { OrderIdentity } from '@/components/OrderIdentity';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Displays caller-provided state, without deriving domain status. */
export function OrderDocumentHeader({ id, stateLabel, stateTone = 'muted', className }: {
  id: string; stateLabel: string; stateTone?: 'muted' | 'success' | 'warning'; className?: string;
}) {
  return <div className={cn('order-document-header', className)}>
    <OrderIdentity id={id} check={false} />
    <Badge variant={stateTone} className="normal-case tracking-normal">{stateLabel}</Badge>
  </div>;
}
