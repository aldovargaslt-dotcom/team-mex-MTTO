import { diasEntre } from './format';
import type {
  AvisoAndon,
  CategoriaTrabajo,
  OrigenPieza,
  TipoVisita,
  VisitaResumen,
} from './types';

const CATEGORIAS: CategoriaTrabajo[] = ['A', 'B', 'C', 'D', 'E'];

export type IntervaloCadencia = {
  key: string;
  visitaId: string;
  cerradoAt: string | null;
  tipo: TipoVisita | null;
  deltaKm: number | null;
  deltaDias: number | null;
  tKm: number | null;
  tDias: number | null;
};

export type MixTipo = {
  predictivo: number;
  correctivo: number;
  sinTipo: number;
  total: number;
};

export type RecurrenciaTrabajo = {
  key: string;
  categoria: CategoriaTrabajo;
  item: string;
  veces: number;
};

export type TopRefaccion = {
  itemId: string;
  qty: number;
  origenes: OrigenPieza[];
};

export type ResumenAndonUnidad = {
  total: number;
  abiertos: number;
  enterados: number;
  resueltos: number;
  vigente: AvisoAndon | null;
  resueltosConDemora: AvisoAndon[];
};

export function ordenarCierres(historial: VisitaResumen[]): VisitaResumen[] {
  return [...historial].sort((a, b) => {
    const ta = a.cerradoAt ? new Date(a.cerradoAt).getTime() : 0;
    const tb = b.cerradoAt ? new Date(b.cerradoAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

export function intervalosCadencia(
  historial: VisitaResumen[],
  umbral: { tKm: number; tDias: number } | null,
): IntervaloCadencia[] {
  const ordered = ordenarCierres(historial);
  const rows: IntervaloCadencia[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
    const deltaKm =
      prev.km != null && curr.km != null ? curr.km - prev.km : null;
    rows.push({
      key: `${prev.id}:${curr.id}`,
      visitaId: curr.id,
      cerradoAt: curr.cerradoAt,
      tipo: curr.tipo,
      deltaKm,
      deltaDias: diasEntre(prev.cerradoAt, curr.cerradoAt),
      tKm: umbral?.tKm ?? null,
      tDias: umbral?.tDias ?? null,
    });
  }
  return rows.reverse();
}

export function mixTipoVisitas(historial: VisitaResumen[]): MixTipo {
  let predictivo = 0;
  let correctivo = 0;
  let sinTipo = 0;
  for (const visita of historial) {
    if (visita.tipo === 'PREDICTIVO') predictivo += 1;
    else if (visita.tipo === 'CORRECTIVO') correctivo += 1;
    else sinTipo += 1;
  }
  return {
    predictivo,
    correctivo,
    sinTipo,
    total: historial.length,
  };
}

export function recurrenciaTrabajos(
  historial: VisitaResumen[],
): RecurrenciaTrabajo[] {
  const counts = new Map<string, RecurrenciaTrabajo>();
  for (const visita of historial) {
    for (const trabajo of visita.trabajos ?? []) {
      const key = `${trabajo.categoria}::${trabajo.item}`;
      const actual = counts.get(key);
      if (actual) {
        actual.veces += 1;
      } else {
        counts.set(key, {
          key,
          categoria: trabajo.categoria,
          item: trabajo.item,
          veces: 1,
        });
      }
    }
  }
  return [...counts.values()].sort((a, b) => {
    if (b.veces !== a.veces) return b.veces - a.veces;
    if (a.categoria !== b.categoria) {
      return a.categoria.localeCompare(b.categoria);
    }
    return a.item.localeCompare(b.item, 'es');
  });
}

export function conteoCategorias(
  trabajos: RecurrenciaTrabajo[],
): { categoria: CategoriaTrabajo; veces: number }[] {
  const byCat = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<
    CategoriaTrabajo,
    number
  >;
  for (const trabajo of trabajos) {
    byCat[trabajo.categoria] += trabajo.veces;
  }
  return CATEGORIAS.filter((categoria) => byCat[categoria] > 0).map(
    (categoria) => ({ categoria, veces: byCat[categoria] }),
  );
}

export function topRefacciones(
  historial: VisitaResumen[],
  limit = 5,
): TopRefaccion[] {
  const byItem = new Map<string, TopRefaccion>();
  for (const visita of historial) {
    for (const pieza of visita.piezas ?? []) {
      const actual = byItem.get(pieza.itemId);
      if (actual) {
        actual.qty += pieza.qty;
        if (!actual.origenes.includes(pieza.origen)) {
          actual.origenes.push(pieza.origen);
        }
      } else {
        byItem.set(pieza.itemId, {
          itemId: pieza.itemId,
          qty: pieza.qty,
          origenes: [pieza.origen],
        });
      }
    }
  }
  return [...byItem.values()]
    .sort((a, b) => b.qty - a.qty || a.itemId.localeCompare(b.itemId))
    .slice(0, limit);
}

export function resumenAndonUnidad(avisos: AvisoAndon[]): ResumenAndonUnidad {
  const abiertos = avisos.filter((a) => a.estado === 'ABIERTO');
  const enterados = avisos.filter((a) => a.estado === 'ENTERADO');
  const resueltos = avisos.filter((a) => a.estado === 'RESUELTO');
  const vigente =
    avisos.find((a) => a.estado === 'ABIERTO') ??
    avisos.find((a) => a.estado === 'ENTERADO') ??
    null;
  const resueltosConDemora = [...resueltos].sort((a, b) => {
    const ta = a.resueltoAt ? new Date(a.resueltoAt).getTime() : 0;
    const tb = b.resueltoAt ? new Date(b.resueltoAt).getTime() : 0;
    return tb - ta;
  });
  return {
    total: avisos.length,
    abiertos: abiertos.length,
    enterados: enterados.length,
    resueltos: resueltos.length,
    vigente,
    resueltosConDemora,
  };
}

export function fraseDeltaVsCada(
  delta: number | null,
  cada: number | null,
  unidad: 'km' | 'días',
): { texto: string; rebaso: boolean | null } {
  if (delta == null) {
    return {
      texto: unidad === 'km' ? 'Sin km' : 'Sin fecha',
      rebaso: null,
    };
  }
  const deltaTxt = delta.toLocaleString('es-MX');
  const cantidad =
    unidad === 'km' ? `${deltaTxt} km entre cierres` : `${deltaTxt} días entre cierres`;
  if (cada == null) {
    return { texto: cantidad, rebaso: null };
  }
  const cadaTxt = cada.toLocaleString('es-MX');
  return {
    texto: `${cantidad} (cada ${cadaTxt} ${unidad})`,
    rebaso: delta >= cada,
  };
}

export function combinarAvisosUnidad(
  pendientes: AvisoAndon[],
  resueltos: AvisoAndon[],
): AvisoAndon[] {
  const byId = new Map<string, AvisoAndon>();
  for (const aviso of [...pendientes, ...resueltos]) {
    byId.set(aviso.id, aviso);
  }
  return [...byId.values()].sort((a, b) => {
    const ta = new Date(a.abiertaAt).getTime();
    const tb = new Date(b.abiertaAt).getTime();
    return tb - ta;
  });
}
