'use client';
import { CheckRequests } from './CheckRequests';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Clock3, Truck } from 'lucide-react';
import { UnidadOpsBadge } from '@/components/StatusBadge';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Field, FormAlert } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { etiquetaAlertaRegreso, formatHace } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AmbitoUnidad, LogisticaChoferRow, LogisticaUnidadesResponse, LogisticaUnidadRow } from '@/lib/types';

type ChoferesResponse = { items: LogisticaChoferRow[] };
type MovimientoPatioHoy = {
  id: string;
  tipo: 'SALIDA' | 'ENTRADA';
  unidadId: string;
  numeroInterno: string;
  placas: string | null;
  choferNombre: string | null;
  sitioNombre: string | null;
  occurredAt: string;
  km: number;
};
type MovimientosPatioHoyResponse = {
  fecha: string;
  zonaHoraria: string;
  items: MovimientoPatioHoy[];
};
type SalidaForm = { unidadId: string; choferId: string; destino: string; ambito: AmbitoUnidad };
const VACIO: SalidaForm = { unidadId: '', choferId: '', destino: '', ambito: 'LOCAL' };
const EMPTY_ROWS: LogisticaUnidadRow[] = [];
const ZONA_LOGISTICA = 'America/Mexico_City';

function formatFechaLocal(fecha: string, timeZone: string) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatHoraLocal(fecha: string, timeZone: string) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha));
}

export function LogisticaDashboard() {
  const { role, userId } = useRole();
  const [data, setData] = useState<LogisticaUnidadesResponse | null>(null);
  const [choferes, setChoferes] = useState<LogisticaChoferRow[]>([]);
  const [movimientosHoy, setMovimientosHoy] = useState<MovimientosPatioHoyResponse | null>(null);
  const [movimientosLoading, setMovimientosLoading] = useState(true);
  const [movimientosError, setMovimientosError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salidaOpen, setSalidaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SalidaForm>(VACIO);
  const [regresoOpen, setRegresoOpen] = useState(false);
  const [regresoUnidadId, setRegresoUnidadId] = useState('');
  const [regresoSaving, setRegresoSaving] = useState(false);
  const [regresoError, setRegresoError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setMovimientosLoading(true);
    setError(null);
    setMovimientosError(null);
    try {
      const [unitsResult, driversResult, movementsResult] = await Promise.allSettled([
        api<LogisticaUnidadesResponse>('/logistica/unidades', { role, userId }),
        api<ChoferesResponse>('/logistica/choferes?chip=DISPONIBLE', { role, userId }),
        api<MovimientosPatioHoyResponse>('/flota/movimientos/hoy', { role, userId }),
      ]);
      if (movementsResult.status === 'fulfilled') {
        setMovimientosHoy(movementsResult.value);
      } else {
        setMovimientosHoy(null);
        setMovimientosError(
          movementsResult.reason instanceof HttpError
            ? movementsResult.reason.message
            : 'No pudimos cargar los movimientos de hoy.',
        );
      }
      if (unitsResult.status === 'rejected') throw unitsResult.reason;
      if (driversResult.status === 'rejected') throw driversResult.reason;

      setData(unitsResult.value);
      setChoferes(driversResult.value.items);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No pudimos cargar la flota.');
    } finally {
      setLoading(false);
      setMovimientosLoading(false);
    }
  }, [role, userId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const rows = data?.items ?? EMPTY_ROWS;
  const unidadesActivas = useMemo(() => rows.filter((row) => row.estado === 'ACTIVA'), [rows]);
  const disponiblesParaSalida = useMemo(() => unidadesActivas.filter((row) => row.opsEstado === 'DISPONIBLE'), [unidadesActivas]);
  const pendientes = useMemo(() => unidadesActivas.filter((row) => row.alerta === 'SIN_REGRESO'), [unidadesActivas]);
  const enRuta = useMemo(() => unidadesActivas.filter((row) => row.opsEstado === 'EN_RUTA'), [unidadesActivas]);
  const unidadElegida = disponiblesParaSalida.find((row) => row.unidadId === form.unidadId);
  const choferElegido = choferes.find((row) => row.choferId === form.choferId);
  const unidadRegreso = enRuta.find((row) => row.unidadId === regresoUnidadId);
  const movimientosDelDia = movimientosHoy?.items ?? [];

  function abrirSalida(unidadId = '') {
    setNotice(null);
    setError(null);
    setForm({ ...VACIO, unidadId });
    setSalidaOpen(true);
  }

  function abrirRegreso(unidadId = '') {
    setNotice(null);
    setError(null);
    setRegresoError(null);
    setRegresoUnidadId(unidadId);
    setRegresoOpen(true);
  }

  async function registrarSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.unidadId || !form.choferId || !form.destino.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api<void>(`/logistica/salidas/${form.unidadId}`, {
        role: role!, userId, method: 'POST',
        body: JSON.stringify({ ambito: form.ambito, destino: form.destino.trim(), choferId: form.choferId }),
      });
      setSalidaOpen(false);
      setForm(VACIO);
      setNotice(`Salida registrada para ${unidadElegida?.numeroInterno} con ${choferElegido?.nombre}.`);
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo registrar la salida.');
    } finally {
      setSaving(false);
    }
  }

  async function registrarRegreso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!regresoUnidadId) return;
    setRegresoSaving(true);
    setRegresoError(null);
    try {
      await api<void>(`/logistica/regresos/${regresoUnidadId}`, {
        role: role!, userId, method: 'POST',
      });
      setRegresoOpen(false);
      setRegresoUnidadId('');
      setNotice(`Entrada del viaje registrada para ${unidadRegreso?.numeroInterno}.`);
      await cargar();
    } catch (err) {
      setRegresoError(err instanceof HttpError ? err.message : 'No se pudo registrar la entrada del viaje.');
    } finally {
      setRegresoSaving(false);
    }
  }

  const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="space-y-3 pb-20 md:pb-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Logística</p>
        <h1 className="text-[20px] font-semibold text-navy">Movimientos de flota</h1>
        <p className="text-sm text-muted-foreground">Registra salidas, consulta regresos pendientes y da seguimiento a las unidades en ruta.</p>
        <p className="text-sm capitalize text-muted-foreground">{fecha}</p>
      </header>

      <nav aria-label="Acciones de flota" className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-12 text-base" onClick={() => abrirSalida()}><Truck className="mr-2 size-5" aria-hidden />Registrar salida</Button>
        <Button type="button" variant="secondary" className="min-h-12 text-base" disabled={!enRuta.length} onClick={() => abrirRegreso()}><ArrowRight className="mr-2 size-5" aria-hidden />Registrar entrada</Button>
      </nav>
      {notice ? <p role="status" aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{notice}</p> : null}
      <FormAlert>{error && !salidaOpen ? error : null}</FormAlert>

      <section aria-labelledby="atencion-title" className="space-y-3">
        <div><h2 id="atencion-title" className="text-[13px] leading-5 font-semibold text-navy">Alertas abiertas</h2><p className="text-sm text-muted-foreground">Unidades que superaron el tiempo de regreso.</p></div>
        {pendientes.length ? <div role="region" aria-label="Lista desplazable de alertas abiertas" tabIndex={0} className="max-h-[min(24rem,45dvh)] overflow-y-auto overscroll-contain pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><ul className="grid list-none gap-3 p-0.5">{pendientes.map((row) => <li key={row.unidadId}><AttentionCard row={row} onRegistrarEntrada={() => abrirRegreso(row.unidadId)} /></li>)}</ul></div> : <div className="rounded-lg border bg-card p-4"><h3 className="font-medium text-navy">{loading ? 'Cargando alertas…' : 'No hay alertas abiertas.'}</h3>{!loading ? <p className="mt-1 text-sm text-muted-foreground">Las unidades en ruta están dentro del tiempo esperado.</p> : null}</div>}
      </section>

      <section aria-labelledby="disponibles-title" className="space-y-4">
        <div><h2 id="disponibles-title" className="text-[13px] leading-5 font-semibold text-navy">Unidades disponibles</h2><p className="text-sm text-muted-foreground">Unidades activas del catálogo; no incluye unidades en mantenimiento o desactivadas.</p></div>
        {unidadesActivas.length ? <div role="region" aria-label="Lista desplazable de unidades disponibles" tabIndex={0} className="max-h-[min(32rem,55dvh)] overflow-y-auto overscroll-contain pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><ul className="grid list-none gap-3 p-0.5 md:grid-cols-2">{unidadesActivas.map((row) => <li key={row.unidadId}><UnidadCard row={row} onRegistrarSalida={() => abrirSalida(row.unidadId)} onRegistrarEntrada={() => abrirRegreso(row.unidadId)} /></li>)}</ul></div> : <div className="rounded-lg border bg-card p-4"><h3 className="font-medium text-navy">{loading ? 'Cargando unidades disponibles…' : 'No hay unidades activas disponibles.'}</h3>{!loading ? <p className="mt-1 text-sm text-muted-foreground">Las unidades en mantenimiento o desactivadas no aparecen en esta vista.</p> : null}</div>}
        {error && !data ? <div role="alert" className="rounded-lg border bg-card p-4"><h3 className="font-semibold text-navy">No pudimos cargar las unidades.</h3><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button variant="secondary" className="mt-3 min-h-11" onClick={() => void cargar()}>Reintentar</Button></div> : null}
      </section>

      <section aria-labelledby="actividad-title" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="actividad-title" className="text-[13px] leading-5 font-semibold text-navy">Últimos movimientos</h2>
            <p className="text-sm text-muted-foreground">Entradas y salidas de patio de hoy, {movimientosHoy ? formatFechaLocal(movimientosHoy.fecha, movimientosHoy.zonaHoraria) : 'hora Ciudad de México'}.</p>
          </div>
          <Button variant="quiet" className="ml-auto min-h-11" asChild><Link href="/flota">Ver movimientos</Link></Button>
        </div>
        {movimientosLoading ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Cargando movimientos de hoy…</p> : null}
        <FormAlert>{movimientosError}</FormAlert>
        {!movimientosLoading && !movimientosError && movimientosDelDia.length ? <div role="region" aria-label="Últimos movimientos de patio de hoy" tabIndex={0} className="max-h-[min(24rem,45dvh)] overflow-y-auto overscroll-contain rounded-lg border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><ul className="divide-y">{movimientosDelDia.map((movimiento) => {
          const entrada = movimiento.tipo === 'ENTRADA';
          const DirectionIcon = entrada ? ArrowDownLeft : ArrowUpRight;
          return <li key={movimiento.id} className="flex items-center gap-3 p-3 sm:gap-4">
            <span className={entrada ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700' : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700'} aria-hidden><DirectionIcon className="size-5" strokeWidth={2.25} /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{movimiento.numeroInterno}{movimiento.placas ? ` · ${movimiento.placas}` : ''}</p><p className="text-xs leading-5 text-muted-foreground">{entrada ? 'Entrada registrada' : 'Salida registrada'} · Chofer: {movimiento.choferNombre || 'No disponible'} · Sitio: {movimiento.sitioNombre || 'No disponible'}</p></div>
            <time dateTime={movimiento.occurredAt} aria-label={`${formatHace(movimiento.occurredAt)}, ${formatHoraLocal(movimiento.occurredAt, movimientosHoy?.zonaHoraria ?? ZONA_LOGISTICA)}`} className="shrink-0 self-start text-xs tabular-nums text-muted-foreground sm:self-center">{formatHace(movimiento.occurredAt)}</time>
          </li>;
        })}</ul></div> : null}
        {!movimientosLoading && !movimientosError && !movimientosDelDia.length ? <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No hay entradas ni salidas de patio registradas hoy.</div> : null}
      </section>

      <CheckRequests />

      <Sheet open={salidaOpen} onOpenChange={setSalidaOpen}>
        <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto sm:mx-auto sm:max-w-xl sm:rounded-t-xl">
          <form className="flex min-h-full flex-col" onSubmit={registrarSalida}>
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">Registrar salida</SheetTitle>
              <SheetDescription>Completa los datos que se guardarán para la salida. La fecha y hora se registran al confirmar.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Movimientos de flota</p><p className="mt-1">Selecciona una unidad y un chofer disponibles.</p></div>
              <Field label="Unidad" htmlFor="salida-unidad"><NativeSelect id="salida-unidad" required value={form.unidadId} onChange={(e) => setForm({ ...form, unidadId: e.target.value })}><option value="">Selecciona una unidad</option>{disponiblesParaSalida.map((row) => <option key={row.unidadId} value={row.unidadId}>{row.numeroInterno} · {row.placas} · Disponible</option>)}</NativeSelect></Field>
              <Field label="Chofer" htmlFor="salida-chofer"><NativeSelect id="salida-chofer" required value={form.choferId} onChange={(e) => setForm({ ...form, choferId: e.target.value })}><option value="">Selecciona un chofer</option>{choferes.map((row) => <option key={row.choferId} value={row.choferId}>{row.nombre}</option>)}</NativeSelect></Field>
              <Field label="Destino" htmlFor="salida-destino"><Input id="salida-destino" required maxLength={160} autoComplete="off" value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} /></Field>
              <Field label="Tipo de salida" htmlFor="salida-ambito"><NativeSelect id="salida-ambito" required value={form.ambito} onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoUnidad })}><option value="LOCAL">Local</option><option value="FORANEO">Foráneo</option></NativeSelect></Field>
              <p className="rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">Fecha y hora: ahora · {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</p>
              <FormAlert>{error}</FormAlert>
            </div>
            <SheetFooter className="sticky bottom-0 mt-auto flex-col border-t bg-background p-4 sm:flex-row">
              <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={() => setSalidaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="min-h-12 flex-1" disabled={saving || !disponiblesParaSalida.length || !choferes.length}>{saving ? 'Registrando…' : 'Registrar salida'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={regresoOpen} onOpenChange={setRegresoOpen}>
        <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto sm:mx-auto sm:max-w-xl sm:rounded-t-xl">
          <form className="flex min-h-full flex-col" onSubmit={registrarRegreso}>
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">Registrar entrada del viaje</SheetTitle>
              <SheetDescription>Finaliza el viaje y devuelve la unidad a disponible. No registra una entrada en la bitácora de patio.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <Field label="Unidad en ruta" htmlFor="regreso-unidad"><NativeSelect id="regreso-unidad" required value={regresoUnidadId} onChange={(event) => setRegresoUnidadId(event.target.value)}><option value="">Selecciona una unidad</option>{enRuta.map((row) => <option key={row.unidadId} value={row.unidadId}>{row.numeroInterno} · {row.placas}{row.alerta ? ' · Pendiente de regreso' : ''}</option>)}</NativeSelect></Field>
              <FormAlert>{regresoError}</FormAlert>
            </div>
            <SheetFooter className="sticky bottom-0 mt-auto flex-col border-t bg-background p-4 sm:flex-row">
              <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={() => setRegresoOpen(false)}>Cancelar</Button>
              <Button type="submit" className="min-h-12 flex-1" disabled={regresoSaving || !regresoUnidadId}>{regresoSaving ? 'Registrando…' : 'Registrar entrada'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AttentionCard({ row, onRegistrarEntrada }: { row: LogisticaUnidadRow; onRegistrarEntrada: () => void }) {
  return <article className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3"><UnidadMarca foto={row.fotoDataUrl} nombre={row.tipoNombre} icono={row.tipoIcono} />
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-navy">{row.numeroInterno} · {row.placas}</h3><Badge variant="warning" className="normal-case tracking-normal">{etiquetaAlertaRegreso(row.alerta)}</Badge></div>
      <p className="text-sm">Regreso fuera del umbral esperado.</p>
      <p className="text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}{row.salidaAt ? ` · Salió ${formatHace(row.salidaAt)}` : ''}</p>
      <p className="flex items-center gap-2 text-sm text-rose-900"><Clock3 className="size-4" aria-hidden /> Requiere seguimiento</p>
    </div></div>
    <Button variant="outline" className="min-h-12 w-full shrink-0 sm:w-auto" onClick={onRegistrarEntrada}>Registrar entrada de {row.numeroInterno}</Button>
  </article>;
}

function UnidadCard({ row, onRegistrarSalida, onRegistrarEntrada }: { row: LogisticaUnidadRow; onRegistrarSalida: () => void; onRegistrarEntrada: () => void }) {
  const estaEnRuta = row.opsEstado === 'EN_RUTA';
  const nombreUnidad = row.marcaModelo || row.tipoNombre;
  return <article className="flex h-full flex-col rounded-lg border bg-card p-3">
    <div className="flex min-w-0 items-start gap-3">
      <UnidadMarca foto={row.fotoDataUrl} nombre={row.tipoNombre} icono={row.tipoIcono} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-navy">{nombreUnidad}{row.anio ? ` ${row.anio}` : ''}</h3><p className="text-sm text-muted-foreground">{row.numeroInterno} · {row.placas}</p></div><UnidadOpsBadge ops={row.opsEstado} /></div>
        {estaEnRuta ? <p className="mt-2 text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}{row.salidaAt ? ` · Salió ${formatHace(row.salidaAt)}` : ''}</p> : <p className="mt-2 text-sm text-muted-foreground">Lista para registrar una salida.</p>}
      </div>
    </div>
    <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={estaEnRuta ? onRegistrarEntrada : onRegistrarSalida}>{estaEnRuta ? `Registrar entrada de ${row.numeroInterno}` : `Registrar salida de ${row.numeroInterno}`}</Button>
  </article>;
}
