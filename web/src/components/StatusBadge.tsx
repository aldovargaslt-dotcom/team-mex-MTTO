import { TriangleAlert } from 'lucide-react';
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

export function AtencionBadge({ tieneAviso }: { tieneAviso: boolean }) {
  if (!tieneAviso) {
    return <span className="text-xs text-muted-foreground">Sin aviso</span>;
  }
  return (
    <Badge variant="warning" className="normal-case tracking-normal gap-1">
      <TriangleAlert className="size-3.5" aria-hidden />
      Requiere inspección
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
