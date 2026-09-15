export function formatKm(km: number | null | undefined) {
  if (km == null) return 'Sin km';
  return `${km.toLocaleString('es-MX')} km`;
}

/** Copy de taller para avisos de visita (no decir t_km). */
export function resumenAvisoMantenimiento(km: number, dias: number) {
  return `Avisa a los ${km.toLocaleString('es-MX')} km o a los ${dias} días`;
}

/** Exceso km/días al abrir el aviso. Sin “faltan N”. */
export function lineasOvershootAvisoAndon(aviso: {
  kmAlAbrir: number;
  diasAlAbrir: number;
  umbralKm: number;
  umbralDias: number;
}): string[] {
  const lines: string[] = [];
  const extraKm = aviso.kmAlAbrir - aviso.umbralKm;
  const extraDias = aviso.diasAlAbrir - aviso.umbralDias;
  if (extraKm > 0) {
    lines.push(
      `+${extraKm.toLocaleString('es-MX')} km sobre el intervalo (${aviso.kmAlAbrir.toLocaleString('es-MX')} vs ${aviso.umbralKm.toLocaleString('es-MX')} km)`,
    );
  }
  if (extraDias > 0) {
    lines.push(
      `+${extraDias.toLocaleString('es-MX')} días sobre el intervalo (${aviso.diasAlAbrir.toLocaleString('es-MX')} vs ${aviso.umbralDias.toLocaleString('es-MX')} días)`,
    );
  }
  return lines;
}

export function fraseDemoraAviso(aviso: {
  abiertaAt: string;
  resueltoAt?: string | null;
}): string | null {
  if (!aviso.resueltoAt) return null;
  const dias = diasEntre(aviso.abiertaAt, aviso.resueltoAt);
  if (dias == null) return null;
  if (dias < 1) return 'Resuelto el mismo día';
  if (dias === 1) return 'Resuelto en 1 día';
  return `Resuelto en ${dias.toLocaleString('es-MX')} días`;
}

export function diasEntre(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
): number | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** Causa operacional del aviso con campos ya en el DTO. Sin “faltan N”. */
export function lineasCausaAvisoAndon(aviso: {
  kmAlAbrir: number;
  diasAlAbrir: number;
  umbralKm: number;
  umbralDias: number;
}): string[] {
  const lines: string[] = [];
  if (aviso.kmAlAbrir >= aviso.umbralKm) {
    lines.push(
      `${aviso.kmAlAbrir.toLocaleString('es-MX')} km desde el último cierre (umbral ${aviso.umbralKm.toLocaleString('es-MX')} km)`,
    );
  }
  if (aviso.diasAlAbrir >= aviso.umbralDias) {
    lines.push(
      `${aviso.diasAlAbrir.toLocaleString('es-MX')} días desde el último cierre (umbral ${aviso.umbralDias.toLocaleString('es-MX')} días)`,
    );
  }
  if (lines.length === 0) {
    lines.push(
      `${aviso.kmAlAbrir.toLocaleString('es-MX')} km desde el último cierre (umbral ${aviso.umbralKm.toLocaleString('es-MX')} km)`,
    );
    lines.push(
      `${aviso.diasAlAbrir.toLocaleString('es-MX')} días desde el último cierre (umbral ${aviso.umbralDias.toLocaleString('es-MX')} días)`,
    );
  }
  return lines;
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

export function etiquetaMinimo(minQty: number | null | undefined) {
  if (minQty == null) return 'Sin mínimo';
  return String(minQty);
}

/** Magnitud de consulta: solo cuando hay mínimo y ya está en Bajo/Agotado. */
export function magnitudExistencia(row: {
  qty: number;
  minQty: number | null;
  alerta: string | null;
  uom?: string | null;
}) {
  const uom = etiquetaUom(row.uom);
  const base = `${row.qty} ${uom}`;
  if (
    (row.alerta === 'BAJO' || row.alerta === 'AGOTADO') &&
    row.minQty != null &&
    row.qty <= row.minQty
  ) {
    return `${base} · mínimo ${row.minQty} · faltan ${row.minQty - row.qty}`;
  }
  return base;
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

export function saludoAhora(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function fraseCuenta(n: number, uno: string, muchos: string) {
  return `${n} ${n === 1 ? uno : muchos}`;
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
