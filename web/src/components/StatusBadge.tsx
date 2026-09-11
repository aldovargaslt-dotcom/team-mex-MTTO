import type { EstadoUnidad } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ estado }: { estado: EstadoUnidad }) {
  const activa = estado === 'ACTIVA';
  return (
    <Badge variant={activa ? 'success' : 'muted'}>
      {activa ? 'Activa' : 'Inactiva'}
    </Badge>
  );
}
