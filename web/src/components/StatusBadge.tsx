import type { EstadoChofer, EstadoUnidad } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { etiquetaEstadoChofer } from '@/lib/format';

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
