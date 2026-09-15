import type { AvisoAndon, TipoVehiculo, Unidad } from '@/lib/types';

export const FILTROS_UNIDADES_LISTADO = [
  'todas',
  'activas',
  'inactivas',
  'aviso',
] as const;

export type FiltroUnidadesListado = (typeof FILTROS_UNIDADES_LISTADO)[number];

export type ResumenFlotaUnidades = {
  total: number;
  activas: number;
  inactivas: number;
  conAviso: number;
};

export type CondicionUnidad = {
  kind: 'aviso' | 'enterado' | 'sin_aviso';
  label: string;
  variant: 'danger' | 'warning' | null;
};

export type AtencionUnidad = {
  titulo: string;
  detalle: string | null;
};

const ETIQUETA_FILTRO: Record<FiltroUnidadesListado, string> = {
  todas: 'Todas',
  activas: 'Activas',
  inactivas: 'Inactivas',
  aviso: 'Con aviso',
};

export function parseFiltroUnidades(raw: string | null): FiltroUnidadesListado {
  if (
    raw === 'activas' ||
    raw === 'inactivas' ||
    raw === 'aviso'
  ) {
    return raw;
  }
  return 'todas';
}

export function parseTipoUnidades(
  raw: string | null,
  tipos: TipoVehiculo[],
): string {
  if (!raw) return '';
  return tipos.some((tipo) => tipo.id === raw) ? raw : '';
}

export function avisosPorUnidad(avisos: AvisoAndon[]): Map<string, AvisoAndon> {
  const map = new Map<string, AvisoAndon>();
  for (const aviso of avisos) {
    const actual = map.get(aviso.unidadId);
    if (!actual || (actual.estado === 'ENTERADO' && aviso.estado === 'ABIERTO')) {
      map.set(aviso.unidadId, aviso);
    }
  }
  return map;
}

export function resumenFlotaUnidades(
  unidades: Unidad[],
  avisos: Map<string, AvisoAndon>,
): ResumenFlotaUnidades {
  return {
    total: unidades.length,
    activas: unidades.filter((unidad) => unidad.estado === 'ACTIVA').length,
    inactivas: unidades.filter((unidad) => unidad.estado === 'INACTIVA').length,
    conAviso: unidades.filter((unidad) => avisos.has(unidad.id)).length,
  };
}

export function matchFiltroUnidades(
  unidad: Unidad,
  filtro: FiltroUnidadesListado,
  avisos: Map<string, AvisoAndon>,
): boolean {
  if (filtro === 'activas') return unidad.estado === 'ACTIVA';
  if (filtro === 'inactivas') return unidad.estado === 'INACTIVA';
  if (filtro === 'aviso') return avisos.has(unidad.id);
  return true;
}

export function matchBusquedaUnidad(unidad: Unidad, q: string): boolean {
  const needle = q.trim().toLocaleLowerCase('es');
  if (!needle) return true;
  const blob = [unidad.numeroInterno, unidad.placas, unidad.marcaModelo ?? '']
    .join(' ')
    .toLocaleLowerCase('es');
  return blob.includes(needle);
}

export function filtraUnidades(
  unidades: Unidad[],
  avisos: Map<string, AvisoAndon>,
  filtro: FiltroUnidadesListado,
  tipoId: string,
  q: string,
): Unidad[] {
  return unidades.filter((unidad) => {
    if (!matchFiltroUnidades(unidad, filtro, avisos)) return false;
    if (tipoId && unidad.tipo.id !== tipoId) return false;
    return matchBusquedaUnidad(unidad, q);
  });
}

export function cuentaFiltrosUnidades(
  unidades: Unidad[],
  avisos: Map<string, AvisoAndon>,
): Record<FiltroUnidadesListado, number> {
  return {
    todas: unidades.length,
    activas: unidades.filter((unidad) =>
      matchFiltroUnidades(unidad, 'activas', avisos),
    ).length,
    inactivas: unidades.filter((unidad) =>
      matchFiltroUnidades(unidad, 'inactivas', avisos),
    ).length,
    aviso: unidades.filter((unidad) =>
      matchFiltroUnidades(unidad, 'aviso', avisos),
    ).length,
  };
}

export function opcionesFiltroUnidades(
  unidades: Unidad[],
  avisos: Map<string, AvisoAndon>,
) {
  const counts = cuentaFiltrosUnidades(unidades, avisos);
  return FILTROS_UNIDADES_LISTADO.map((id) => ({
    id,
    label: `${ETIQUETA_FILTRO[id]} (${counts[id]})`,
  }));
}

export function opcionesSegmentoTipo(unidades: Unidad[], tipos: TipoVehiculo[]) {
  const ordenados = [...tipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  );
  return [
    { id: '', label: `Todos los tipos (${unidades.length})` },
    ...ordenados.map((tipo) => ({
      id: tipo.id,
      label: `${tipo.nombre} (${unidades.filter((unidad) => unidad.tipo.id === tipo.id).length})`,
    })),
  ];
}

function rangoAtencion(unidad: Unidad, avisos: Map<string, AvisoAndon>): number {
  const aviso = avisos.get(unidad.id);
  if (aviso?.estado === 'ABIERTO') return 0;
  if (aviso?.estado === 'ENTERADO') return 1;
  if (unidad.estado === 'INACTIVA') return 2;
  return 3;
}

export function ordenaUnidades(
  unidades: Unidad[],
  avisos: Map<string, AvisoAndon>,
): Unidad[] {
  return [...unidades].sort((a, b) => {
    const delta = rangoAtencion(a, avisos) - rangoAtencion(b, avisos);
    if (delta !== 0) return delta;
    return a.numeroInterno.localeCompare(b.numeroInterno, 'es');
  });
}

export function identidadSecundaria(
  unidad: Unidad,
  incluirTipo: boolean,
): string {
  const partes: string[] = [];
  if (unidad.marcaModelo) {
    partes.push(
      unidad.anio ? `${unidad.marcaModelo} · ${unidad.anio}` : unidad.marcaModelo,
    );
  } else if (unidad.anio) {
    partes.push(String(unidad.anio));
  }
  partes.push(unidad.placas);
  if (incluirTipo) partes.push(unidad.tipo.nombre);
  return partes.join(' · ');
}

export function condicionDeUnidad(
  aviso: AvisoAndon | undefined,
): CondicionUnidad {
  if (!aviso) {
    return { kind: 'sin_aviso', label: 'Sin aviso', variant: null };
  }
  if (aviso.estado === 'ENTERADO') {
    return { kind: 'enterado', label: 'Enterado', variant: 'warning' };
  }
  return { kind: 'aviso', label: 'Requiere atención', variant: 'danger' };
}

export function atencionDeUnidad(
  aviso: AvisoAndon | undefined,
): AtencionUnidad {
  if (!aviso) {
    return { titulo: '—', detalle: null };
  }
  const partes: string[] = [];
  if (aviso.kmAlAbrir >= aviso.umbralKm) {
    partes.push(
      `${aviso.kmAlAbrir.toLocaleString('es-MX')} km desde el último cierre`,
    );
  }
  if (aviso.diasAlAbrir >= aviso.umbralDias) {
    partes.push(
      `${aviso.diasAlAbrir.toLocaleString('es-MX')} días desde el último cierre`,
    );
  }
  if (partes.length === 0) {
    partes.push(
      `${aviso.kmAlAbrir.toLocaleString('es-MX')} km desde el último cierre`,
    );
  }
  return {
    titulo:
      aviso.estado === 'ENTERADO'
        ? 'Aviso enterado'
        : 'Mantenimiento vencido',
    detalle: partes[0] ?? null,
  };
}

export function etiquetaMotivoEstado(unidad: Unidad): string | null {
  if (unidad.estado !== 'INACTIVA') return null;
  return unidad.motivoInactivacion === 'ENVIO_ESPECIAL'
    ? 'Envío especial'
    : null;
}

export function textoResultadosUnidades(
  visibles: number,
  total: number,
): string {
  if (visibles === total) {
    return `${visibles} ${visibles === 1 ? 'unidad' : 'unidades'}`;
  }
  return `${visibles} de ${total} ${total === 1 ? 'unidad' : 'unidades'}`;
}

export function emptyUnidadesListado({
  buscando,
  filtro,
  tipoNombre,
  hayTipos,
  isAdmin,
  hayUnidades,
}: {
  buscando: boolean;
  filtro: FiltroUnidadesListado;
  tipoNombre: string | null;
  hayTipos: boolean;
  isAdmin: boolean;
  hayUnidades: boolean;
}): { title: string; body: string } {
  if (buscando) {
    return {
      title: 'No hay unidades que coincidan',
      body: 'Ajuste la búsqueda o los filtros.',
    };
  }
  if (filtro === 'aviso') {
    return {
      title: 'Ninguna unidad con aviso',
      body: tipoNombre
        ? `No hay avisos Andon abiertos en ${tipoNombre}.`
        : 'Los avisos de mantenimiento vencido aparecerán aquí.',
    };
  }
  if (filtro === 'inactivas') {
    return {
      title: 'No hay unidades inactivas',
      body: tipoNombre
        ? `Ninguna unidad de ${tipoNombre} está inactiva.`
        : 'Las unidades inactivas aparecerán aquí.',
    };
  }
  if (filtro === 'activas') {
    return {
      title: 'No hay unidades activas',
      body: tipoNombre
        ? `Ninguna unidad de ${tipoNombre} está activa.`
        : 'Las unidades activas aparecerán aquí.',
    };
  }
  if (tipoNombre) {
    return {
      title: `No hay unidades en ${tipoNombre}`,
      body: isAdmin
        ? 'Cree una unidad de este tipo o elija otro segmento.'
        : 'No hay unidades registradas en este tipo.',
    };
  }
  if (!hayTipos && isAdmin) {
    return {
      title: 'No hay tipos',
      body: 'Agregue el primer tipo para clasificar la flota.',
    };
  }
  if (!hayUnidades) {
    return {
      title: 'No hay unidades',
      body: 'No hay unidades registradas.',
    };
  }
  return {
    title: 'No hay unidades que coincidan',
    body: 'Ajuste la búsqueda o los filtros.',
  };
}
