import { CircleCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UmbralAid({
  rebaso,
  motivo,
}: {
  rebaso: boolean;
  motivo?: string | null;
}) {
  if (rebaso) {
    return (
      <div>
        <Badge
          variant="warning"
          className="normal-case tracking-normal gap-1"
        >
          <TriangleAlert className="size-3.5" aria-hidden />
          Rebasó
        </Badge>
        {motivo ? <div className="muted">{motivo}</div> : null}
      </div>
    );
  }
  return (
    <span className="muted inline-flex items-center gap-1">
      <CircleCheck className="size-3.5" aria-hidden />
      Dentro
    </span>
  );
}
