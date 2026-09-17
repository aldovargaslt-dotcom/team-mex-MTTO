import {
  choferDeFila,
  ciclosDeHistorial,
  viajeDeFila,
} from '@/lib/flota-viaje';
import {
  etiquetaTipoVisita,
  formatDuracion,
  formatFecha,
  formatHace,
  formatKm,
  resumenAvisoMantenimiento,
} from '@/lib/format';
import type {
  AvisoAndon,
  FlotaUnidadDetalle,
  UmbralAndon,
  VisitaResumen,
} from '@/lib/types';

export type HubIndicador = {
  id: string;
  label: string;
  value: string;
  detalle: string | null;
  tono: 'ok' | 'warn' | 'muted';
};

const MS_DIA = 86_400_000;

export function diasDesdeIso(iso: string | null | undefined, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / MS_DIA));
}

export function avisosPendientes(avisos: AvisoAndon[]) {
  return avisos.filter((a) => a.estado !== 'RESUELTO');
}

export function kmEntreUltimasVisitas(historial: VisitaResumen[]) {
  const [ultima, previa] = historial;
  if (
    ultima?.km == null ||
    previa?.km == null ||
    ultima.km < previa.km
  ) {
    return null;
  }
  return ultima.km - previa.km;
}

export function indicadoresDeHub({
  ultimoKm,
  historialCerrado,
  avisos,
  umbral,
  now = new Date(),
}: {
  ultimoKm: number | null;
  historialCerrado: VisitaResumen[];
  avisos: AvisoAndon[];
  umbral: Pick<UmbralAndon, 'tKm' | 'tDias'> | null;
  now?: Date;
}): HubIndicador[] {
  const ultima = historialCerrado[0] ?? null;
  const dias = diasDesdeIso(ultima?.cerradoAt, now);
  const pendientes = avisosPendientes(avisos);
  const aviso = pendientes[0] ?? null;
  const kmIntervalo = kmEntreUltimasVisitas(historialCerrado);
  const piezasUltima = (ultima?.piezas ?? []).reduce((s, p) => s + p.qty, 0);

  const kmDetalle = ultima?.cerradoAt
    ? `Cierre ${formatFecha(ultima.cerradoAt)}`
    : umbral
      ? resumenAvisoMantenimiento(umbral.tKm, umbral.tDias)
      : null;

  const diasValue =
    dias == null ? 'Sin cierre' : dias === 0 ? 'Hoy' : `${dias} d`;
  const diasTono: HubIndicador['tono'] =
    aviso || (umbral && dias != null && dias >= umbral.tDias) ? 'warn' : dias == null ? 'muted' : 'ok';
  const diasDetalle =
    umbral != null
      ? `Aviso a los ${umbral.tDias.toLocaleString('es-MX')} d`
      : ultima?.cerradoAt
        ? formatHace(ultima.cerradoAt)
        : 'Aún no hay visita cerrada.';

  const avisoValue =
    pendientes.length === 0
      ? 'Ninguno'
      : pendientes.length === 1
        ? '1 aviso'
        : `${pendientes.length} avisos`;
  const avisoDetalle = aviso
    ? `${aviso.kmAlAbrir.toLocaleString('es-MX')} km / ${aviso.diasAlAbrir} d desde el cierre`
    : 'Sin mantenimiento vencido.';

  const visitaValue = ultima
    ? etiquetaTipoVisita(ultima.tipo)
    : 'Sin visitas';
  const visitaPartes: string[] = [];
  if (ultima?.cerradoAt) visitaPartes.push(formatFecha(ultima.cerradoAt));
  if (kmIntervalo != null) {
    visitaPartes.push(`${kmIntervalo.toLocaleString('es-MX')} km desde la previa`);
  }
  if (ultima && piezasUltima > 0) {
    visitaPartes.push(`${piezasUltima.toLocaleString('es-MX')} pza`);
  }
  if (ultima && ultima.trabajosCount > 0) {
    visitaPartes.push(
      `${ultima.trabajosCount} ${ultima.trabajosCount === 1 ? 'trabajo' : 'trabajos'}`,
    );
  }

  return [
    {
      id: 'km',
      label: 'Último km',
      value: ultimoKm != null ? formatKm(ultimoKm) : 'Sin registro',
      detalle: kmDetalle,
      tono: ultimoKm == null ? 'muted' : 'ok',
    },
    {
      id: 'dias',
      label: 'Sin visita cerrada',
      value: diasValue,
      detalle: diasDetalle,
      tono: diasTono,
    },
    {
      id: 'avisos',
      label: 'Andon',
      value: avisoValue,
      detalle: avisoDetalle,
      tono: pendientes.length > 0 ? 'warn' : 'ok',
    },
    {
      id: 'visita',
      label: 'Última visita',
      value: visitaValue,
      detalle: visitaPartes.length ? visitaPartes.join(' · ') : 'Cuando cierren una visita, aparece aquí.',
      tono: ultima ? 'ok' : 'muted',
    },
  ];
}

export function indicadoresDePatio(
  detalle: FlotaUnidadDetalle,
): HubIndicador[] {
  const { unidad, tablero, historial } = detalle;
  const viaje = tablero ? viajeDeFila(tablero) : null;
  const chofer = tablero ? choferDeFila(tablero) : null;
  const enRuta = Boolean(tablero?.salidaAbiertaId);
  const cerrado = ciclosDeHistorial(historial).find((c) => c.kind === 'cerrado');
  const kmCiclo =
    cerrado && cerrado.kind === 'cerrado'
      ? Math.max(0, cerrado.entrada.km - cerrado.salida.km)
      : null;

  return [
    {
      id: 'viaje',
      label: 'Viaje',
      value: viaje?.titulo ?? 'Sin registro de patio',
      detalle: viaje?.detalle ?? null,
      tono: enRuta ? 'warn' : viaje?.clase === 'sin_registro' ? 'muted' : 'ok',
    },
    {
      id: 'fuera',
      label: enRuta ? 'Tiempo fuera' : 'Chofer',
      value: enRuta
        ? formatDuracion(tablero?.tiempoFueraMs)
        : chofer?.principal ?? 'Sin asignar',
      detalle: enRuta
        ? chofer?.principal
          ? `Chofer ${chofer.principal}`
          : 'Registrar entrada'
        : chofer?.secundario ?? null,
      tono: enRuta ? 'warn' : chofer?.asignado ? 'ok' : 'muted',
    },
    {
      id: 'ciclo',
      label: 'Km último ciclo',
      value: kmCiclo != null ? formatKm(kmCiclo) : 'Sin ciclo cerrado',
      detalle:
        cerrado && cerrado.kind === 'cerrado'
          ? `${cerrado.salida.sitioNombre ?? 'sin sitio'} → ${cerrado.entrada.sitioNombre ?? 'sin sitio'}`
          : null,
      tono: kmCiclo == null ? 'muted' : 'ok',
    },
    {
      id: 'visita',
      label: 'Último km visita',
      value: formatKm(unidad.ultimoKmVisita),
      detalle: tablero?.andonAbierto
        ? 'Hay aviso Andon abierto.'
        : 'Cruce de taller, no bloquea patio.',
      tono: tablero?.andonAbierto ? 'warn' : unidad.ultimoKmVisita == null ? 'muted' : 'ok',
    },
  ];
}
