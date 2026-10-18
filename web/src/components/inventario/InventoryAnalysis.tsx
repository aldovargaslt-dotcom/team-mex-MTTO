'use client';

import { OperationalToolbar } from '@/components/OperationalToolbar';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReadStatus } from '@/components/ReadStatus';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { api } from '@/lib/api';
import { agregarConsumo, type ConsumoSku } from '@/lib/consumo-totales';
import {
  ANALYSIS_PERIODS, MOVEMENT_TYPES, analysisRange, analysisReturn, analysisUrl,
  matchesAnalysis, movementType, periodRange, rememberAnalysisPosition, validItemId,
  type AnalysisPeriod,
} from '@/lib/inventory-analysis';
import { useRole } from '@/lib/role';
import type { ItemInventario, Movimiento, PendienteComprobante } from '@/lib/types';
import { useReadResource } from '@/lib/use-read-resource';
import { ConsumptionView } from './ConsumptionView';
import { MovementsView } from './MovementsView';
import { ConsumptionCharts } from './ConsumptionCharts';
import type { ConsumptionBucket } from '@/lib/inventory-charts';

export function InventoryAnalysis() {
  const { role, userId } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const view = params.get('vista') === 'movimientos' ? 'movimientos' : 'consumo';
  const range = useMemo(() => analysisRange(params), [params]);
  const q = params.get('q') ?? '';
  const category = params.get('categoria') ?? '';
  const item = params.get('item');
  const type = view === 'movimientos' ? movementType(params.get('tipo')) : null;
  const error = range.error || (item && !validItemId(item) ? 'La referencia de refacción no es válida. Quita el filtro para continuar.' : null);
  const enabled = role && !error;
  const currentHref = analysisUrl(params, { periodo: range.period, from: range.from, to: range.to });
  const summaryReturn = analysisReturn(params.get('resumen'));
  const catalogRead = useReadResource(role ? JSON.stringify([role, userId, 'analysis-catalog']) : null,
    () => api<ItemInventario[]>('/inventario/items', { role: role!, userId }));
  const moveRead = useReadResource(enabled ? JSON.stringify([role, userId, 'analysis-moves', range.from, range.to, item, type]) : null, () => {
    const request = new URLSearchParams();
    if (range.from) request.set('from', range.from);
    if (range.to) request.set('to', range.to);
    if (item) request.set('itemId', item);
    if (type) request.set('tipo', type);
    return api<Movimiento[]>(`/inventario/movimientos?${request}`, { role: role!, userId });
  });
  const purchaseRead = useReadResource(enabled && view === 'consumo' ? JSON.stringify([role, userId, 'analysis-purchases']) : null,
    () => api<PendienteComprobante[]>('/inventario/pendientes-comprobante', { role: role!, userId }));
  const catalog = useMemo(() => new Map((catalogRead.data ?? []).map((entry) => [entry.id, entry])), [catalogRead.data]);
  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const entry of catalogRead.data ?? []) {
      if (entry.familiaId) names.set(entry.familiaId, entry.familiaNombre ?? 'Sin nombre');
    }
    return [...names].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [catalogRead.data]);
  const filtersReady = !category && (!q.trim() || !catalogRead.loading) || catalogRead.data !== null;
  const movements = useMemo(() => (moveRead.data ?? []).filter((row) => matchesAnalysis(row, catalog, q, category, item, true)), [moveRead.data, catalog, q, category, item]);
  const consumption = useMemo(() => agregarConsumo(moveRead.data ?? [], purchaseRead.data ?? [], range.from ?? '0001-01-01', range.to ?? '9999-12-31')
    .filter((row) => (row.salidaOt > 0 || row.compraExterna > 0) && matchesAnalysis(row, catalog, q, category, item)),
  [moveRead.data, purchaseRead.data, range.from, range.to, catalog, q, category, item]);
  const loading = moveRead.loading || (view === 'consumo' && purchaseRead.loading) || catalogRead.loading;

  useEffect(() => {
    if (loading) return;
    try {
      const key = `inventory-analysis:${currentHref}`;
      const stored = sessionStorage.getItem(key);
      if (stored === null) return;
      const position = Number(stored);
      sessionStorage.removeItem(key);
      if (!Number.isFinite(position) || position < 0) return;
      const frame = requestAnimationFrame(() => window.scrollTo(0, position));
      return () => cancelAnimationFrame(frame);
    } catch { /* browser history remains available without storage */ }
  }, [currentHref, loading]);

  function update(patch: Record<string, string | null>) {
    router.replace(analysisUrl(params, patch), { scroll: false });
  }
  function sourceHref(row: ConsumoSku, source: 'stock' | 'external') {
    // Freeze the actual range so a return on another day still explains the same data.
    const origin = analysisUrl(params, { periodo: range.period, from: range.from, to: range.to });
    if (source === 'stock') return analysisUrl(params, {
      vista: 'movimientos', item: row.itemId, tipo: 'SALIDA_OT', periodo: range.period,
      from: range.from, to: range.to, resumen: origin,
    });
    const target = new URLSearchParams({ item: row.itemId, analisis: origin });
    if (range.from) target.set('from', range.from);
    if (range.to) target.set('to', range.to);
    return `/inventario/pendientes?${target}`;
  }
  function clearFilters() {
    router.replace(analysisUrl(new URLSearchParams(), { vista: view === 'movimientos' ? 'movimientos' : null }), { scroll: false });
  }
  function intervalHref(bucket: ConsumptionBucket) {
    return analysisUrl(params, {
      vista: null, periodo: 'CUSTOM', from: bucket.from, to: bucket.to,
      resumen: currentHref,
    });
  }

  return (
    <>
      <PageHeader title="Análisis" lede={view === 'consumo'
        ? 'Compara el consumo por refacción y consulta los registros que lo explican.'
        : 'Revisa entradas, salidas y ajustes del periodo seleccionado.'} />
      <nav className="subnav inventory-analysis-views" aria-label="Vistas de análisis">
        {(['consumo', 'movimientos'] as const).map((next) => (
          <Link
            key={next}
            href={analysisUrl(params, { vista: next === 'consumo' ? null : next, resumen: null })}
            className={view === next ? 'active' : ''}
            aria-current={view === next ? 'page' : undefined}
            onClick={() => rememberAnalysisPosition(currentHref)}
          >{next === 'consumo' ? 'Consumo' : 'Movimientos'}</Link>
        ))}
      </nav>
      <OperationalToolbar className="inventory-toolbar inventory-analysis-toolbar" label="Filtros de análisis">
        <Field label="Buscar refacción" htmlFor="analysis-search" className="inventory-search">
          <Input id="analysis-search" type="search" value={q} placeholder="Nombre, SKU u OEM" onChange={(event) => update({ q: event.target.value })} />
        </Field>
        <Field label="Categoría" htmlFor="analysis-category">
          <NativeSelect id="analysis-category" value={category} disabled={catalogRead.data === null} onChange={(event) => update({ categoria: event.target.value })}>
            <option value="">Todas las categorías</option>
            {category && !categories.some(([id]) => id === category) ? <option value={category}>Categoría seleccionada</option> : null}
            {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Periodo" htmlFor="analysis-period">
          <NativeSelect id="analysis-period" value={range.period} onChange={(event) => {
            const next = event.target.value as AnalysisPeriod;
            const dates = next === 'CUSTOM' ? { from: range.from, to: range.to } : periodRange(next);
            update({ periodo: next, from: dates.from, to: dates.to });
          }}>
            {ANALYSIS_PERIODS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </NativeSelect>
        </Field>
        {view === 'movimientos' ? (
          <Field label="Tipo de movimiento" htmlFor="analysis-type">
            <NativeSelect id="analysis-type" value={type ?? 'TODOS'} onChange={(event) => update({ tipo: event.target.value === 'TODOS' ? null : event.target.value })}>
              {MOVEMENT_TYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </NativeSelect>
          </Field>
        ) : null}
      </OperationalToolbar>
      {range.period === 'CUSTOM' ? (
        <div className="inventory-analysis-dates">
          <Field label="Desde" htmlFor="analysis-from"><Input id="analysis-from" type="date" value={range.from ?? ''} aria-invalid={Boolean(range.error)} onChange={(event) => update({ from: event.target.value })} /></Field>
          <Field label="Hasta" htmlFor="analysis-to"><Input id="analysis-to" type="date" value={range.to ?? ''} aria-invalid={Boolean(range.error)} onChange={(event) => update({ to: event.target.value })} /></Field>
        </div>
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div className="inventory-analysis-context">
        <p className="text-xs text-muted-foreground">{range.period === 'TODO' ? 'Todo el historial' : range.from && range.to ? `${range.from} al ${range.to}` : range.from ? `Desde ${range.from}` : range.to ? `Hasta ${range.to}` : 'Selecciona un periodo'}</p>
        {item ? <Button variant="secondary" onClick={() => update({ item: null })}>Quitar refacción: {catalog.get(item)?.nombre ?? 'seleccionada'}</Button> : null}
        {summaryReturn ? <Button asChild variant="outline"><Link href={summaryReturn}>Volver al resumen</Link></Button> : null}
        {q || category || item || type || range.period !== '30D' ? <Button variant="secondary" onClick={clearFilters}>Restablecer filtros</Button> : null}
      </div>
      <ReadStatus loading={catalogRead.loading} error={catalogRead.error} loadingText="Cargando categorías y códigos OEM…" errorText="No se pudo cargar el catálogo. La búsqueda por OEM y el filtro de categoría no están disponibles." retry={catalogRead.retry} />
      {!filtersReady && !catalogRead.loading ? <FormAlert>Reintenta el catálogo o quita la categoría para consultar los registros.</FormAlert> : null}
      {!error ? <>
        <ReadStatus loading={moveRead.loading} error={moveRead.error} loadingText="Cargando movimientos…" errorText={view === 'consumo' ? 'Consumo incompleto: falta consultar movimientos.' : 'No se pudieron cargar los movimientos.'} retry={moveRead.retry} />
        {view === 'consumo' ? <ReadStatus loading={purchaseRead.loading} error={purchaseRead.error} loadingText="Cargando compras externas…" errorText="Consumo incompleto: falta consultar compras externas." retry={purchaseRead.retry} /> : null}
        {filtersReady && view === 'consumo' && !loading && moveRead.data !== null && purchaseRead.data !== null && catalogRead.data !== null
          ? <ConsumptionCharts rows={consumption} catalog={catalog} movements={moveRead.data} purchases={purchaseRead.data} from={range.from} to={range.to} currentHref={currentHref} sourceHref={sourceHref} intervalHref={intervalHref} chosenUnit={params.get('unidad')} onUnitChange={unit => update({ unidad: unit })} />
          : filtersReady && view === 'consumo' ? <p className="mb-3 text-xs text-muted-foreground">{loading ? 'Las gráficas se mostrarán al completar la consulta.' : 'Gráficas no disponibles: se requieren catálogo, movimientos y compras externas completos.'}</p> : null}
        {filtersReady && view === 'consumo' && (moveRead.data !== null || purchaseRead.data !== null) ? <ConsumptionView rows={consumption} catalog={catalog} movementsAvailable={moveRead.data !== null} purchasesAvailable={purchaseRead.data !== null} currentHref={currentHref} sourceHref={sourceHref} /> : null}
        {filtersReady && view === 'movimientos' && moveRead.data !== null ? <MovementsView rows={movements} role={role} userId={userId} /> : null}
      </> : null}
    </>
  );
}
