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

export function etiquetaEstadoChofer(estado: string) {
  return estado === 'INACTIVO' ? 'Inactivo' : 'Activo';
}

export function etiquetaOrigenPieza(origen: string) {
  return origen === 'COMPRA_EXTERNA' ? 'Compra externa' : 'Desde stock';
}

export function etiquetaMovimiento(tipo: string) {
  if (tipo === 'SALIDA_OT') return 'Salida';
  if (tipo === 'AJUSTE') return 'Ajuste';
  return 'Entrada';
}

export function etiquetaEstadoPendiente(estado: string) {
  return estado === 'RECIBIDA' ? 'Recibida' : 'Pendiente';
}

export function etiquetaUom(uom?: string | null) {
  if (!uom || uom === 'pieza' || uom === 'pza') return 'pza';
  return uom;
}

export function etiquetaAlertaStock(alerta: string | null | undefined) {
  if (alerta === 'BAJO') return 'Bajo';
  if (alerta === 'AGOTADO') return 'Agotado';
  if (alerta === 'OK') return 'OK';
  return '—';
}

export function formatDuracion(ms: number | null | undefined) {
  if (ms == null) return '—';
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 24) return rest ? `${h} h ${rest} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function etiquetaMovimientoFlota(tipo: string) {
  return tipo === 'ENTRADA' ? 'Entrada' : 'Salida';
}

export function etiquetaEstadoAviso(estado: string) {
  if (estado === 'ENTERADO') return 'Enterado';
  if (estado === 'RESUELTO') return 'Resuelto';
  return 'Abierto';
}

export function formatHace(value: string | null | undefined) {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return formatFecha(value);
}

export function resumenOrigenPiezas(
  piezas: { origen: string }[],
) {
  const desdeStock = piezas.filter((p) => p.origen === 'DESDE_STOCK').length;
  const compraExterna = piezas.filter((p) => p.origen === 'COMPRA_EXTERNA').length;
  return `${desdeStock} desde stock · ${compraExterna} compra externa`;
}
