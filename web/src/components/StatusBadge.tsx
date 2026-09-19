import type { AlertaStock, EstadoChofer, EstadoUnidad, OpsChofer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { etiquetaAlertaStock, etiquetaEstadoChofer, etiquetaOpsChofer } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StatusBadge({
  estado,
  className,
}: {
  estado: EstadoUnidad;
  className?: string;
}) {
  const activa = estado === 'ACTIVA';
  return (
    <Badge
      variant={activa ? 'success' : 'muted'}
      className={cn(
        'gap-1 px-2 py-0.5 normal-case tracking-normal',
        className,
      )}
    >
      <span className="status-dot" aria-hidden />
      {activa ? 'Activa' : 'Inactiva'}
    </Badge>
  );
}

export function ChoferEstadoBadge({ estado }: { estado: EstadoChofer }) {
  const activo = estado === 'ACTIVO';
  return (
    <Badge variant={activo ? 'success' : 'muted'}>
      {etiquetaEstadoChofer(estado)}
    </Badge>
  );
}

export function ChoferOpsBadge({ ops }: { ops: OpsChofer }) {
  return (
    <Badge
      variant={ops === 'EN_RUTA' ? 'info' : 'muted'}
      className="normal-case tracking-normal"
    >
      {etiquetaOpsChofer(ops)}
    </Badge>
  );
}

export function StockAlertaBadge({ alerta }: { alerta: AlertaStock | null }) {
  if (!alerta) {
    return (
      <Badge variant="muted" className="normal-case tracking-normal">
        —
      </Badge>
    );
  }
  const variant =
    alerta === 'OK' ? 'success' : alerta === 'BAJO' ? 'warning' : 'danger';
  return <Badge variant={variant}>{etiquetaAlertaStock(alerta)}</Badge>;
}
