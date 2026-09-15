import type { AlertaStock, EstadoChofer, EstadoUnidad } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { etiquetaAlertaStock, etiquetaEstadoChofer } from '@/lib/format';

export function StatusBadge({ estado }: { estado: EstadoUnidad }) {
  const activa = estado === 'ACTIVA';
  return (
    <Badge variant={activa ? 'success' : 'muted'}>
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

export function CondicionUnidadBadge({
  label,
  variant,
}: {
  label: string;
  variant: 'danger' | 'warning' | null;
}) {
  if (!variant) {
    return (
      <span className="text-[12px] text-muted-foreground">{label}</span>
    );
  }
  return (
    <Badge variant={variant} className="normal-case tracking-normal">
      {label}
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
