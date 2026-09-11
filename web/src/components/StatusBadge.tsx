import type { EstadoUnidad } from '@/lib/types';

export function StatusBadge({ estado }: { estado: EstadoUnidad }) {
  const activa = estado === 'ACTIVA';
  return (
    <span className={activa ? 'badge badge-activa' : 'badge badge-inactiva'}>
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  );
}
