export function formatKm(km: number | null | undefined) {
  if (km == null) return 'Sin km';
  return `${km.toLocaleString('es-MX')} km`;
}

export function formatFecha(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function etiquetaTipoVisita(tipo: string | null) {
  if (tipo === 'PREDICTIVO') return 'Predictivo';
  if (tipo === 'CORRECTIVO') return 'Correctivo';
  return 'Sin tipo';
}

export function etiquetaEstadoVisita(estado: string) {
  return estado === 'CERRADO' ? 'Cerrada' : 'Borrador';
}
