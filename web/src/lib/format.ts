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

export function etiquetaOrigenPieza(origen: string) {
  return origen === 'COMPRA_EXTERNA' ? 'Compra externa' : 'Desde stock';
}

export function etiquetaMovimiento(tipo: string) {
  if (tipo === 'SALIDA_OT') return 'Salida OT';
  if (tipo === 'AJUSTE') return 'Ajuste';
  return 'Entrada';
}

export function etiquetaUom(uom?: string | null) {
  if (!uom || uom === 'pieza' || uom === 'pza') return 'pza';
  return uom;
}

export function resumenOrigenPiezas(
  piezas: { origen: string }[],
) {
  const desdeStock = piezas.filter((p) => p.origen === 'DESDE_STOCK').length;
  const compraExterna = piezas.filter((p) => p.origen === 'COMPRA_EXTERNA').length;
  return `${desdeStock} desde stock · ${compraExterna} compra externa`;
}
