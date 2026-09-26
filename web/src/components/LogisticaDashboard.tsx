'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, Truck } from 'lucide-react';
import { UnidadOpsBadge } from '@/components/StatusBadge';
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
type SalidaForm = { unidadId: string; choferId: string; destino: string; ambito: AmbitoUnidad };
const VACIO: SalidaForm = { unidadId: '', choferId: '', destino: '', ambito: 'LOCAL' };

export function LogisticaDashboard() {
  const { role, userId } = useRole();
  const [data, setData] = useState<LogisticaUnidadesResponse | null>(null);
  const [choferes, setChoferes] = useState<LogisticaChoferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salidaOpen, setSalidaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SalidaForm>(VACIO);

  const cargar = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const [units, drivers] = await Promise.all([
        api<LogisticaUnidadesResponse>('/logistica/unidades', { role, userId }),
        api<ChoferesResponse>('/logistica/choferes?chip=DISPONIBLE', { role, userId }),
      ]);
      setData(units);
      setChoferes(drivers.items);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No pudimos cargar la flota.');
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const rows = data?.items ?? [];
  const disponibles = useMemo(() => rows.filter((row) => row.opsEstado === 'DISPONIBLE'), [rows]);
  const pendientes = useMemo(() => rows.filter((row) => row.alerta === 'SIN_REGRESO'), [rows]);
  const activos = useMemo(() => rows.filter((row) => row.opsEstado === 'EN_RUTA' && row.alerta !== 'SIN_REGRESO'), [rows]);
  const unidadElegida = disponibles.find((row) => row.unidadId === form.unidadId);
  const choferElegido = choferes.find((row) => row.choferId === form.choferId);

  function abrirSalida(unidadId = '') {
    setNotice(null);
    setError(null);
    setForm({ ...VACIO, unidadId });
    setSalidaOpen(true);
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

  const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Logística</p>
        <h1 className="text-2xl font-semibold text-navy">Movimientos de flota</h1>
        <p className="text-sm text-muted-foreground">Registra salidas, consulta regresos pendientes y da seguimiento a las unidades en ruta.</p>
        <p className="text-sm capitalize text-muted-foreground">{fecha}</p>
      </header>

      <nav aria-label="Acciones de flota" className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-12 text-base" onClick={() => abrirSalida()}><Truck className="mr-2 size-5" aria-hidden />Registrar salida</Button>
        <Button variant="secondary" className="min-h-12 text-base" asChild><Link href="/flota?alerta=SIN_REGRESO">Registrar regreso<ArrowRight className="ml-2 size-5" aria-hidden /></Link></Button>
      </nav>
      {notice ? <p role="status" aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{notice}</p> : null}
      <FormAlert>{error && !salidaOpen ? error : null}</FormAlert>

      <section aria-labelledby="resumen-title" className="space-y-3">
        <h2 id="resumen-title" className="text-lg font-semibold text-navy">Resumen de unidades</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi href="/flota?chip=EN_RUTA" label="En ruta" value={data?.kpis.enRuta ?? (loading ? '…' : '—')} description="Ver unidades en ruta" tone="blue" />
          <Kpi href="/flota?chip=DISPONIBLE" label="Disponibles" value={data?.kpis.disponibles ?? (loading ? '…' : '—')} description="Ver unidades disponibles" tone="green" />
          <Kpi href="/flota?alerta=SIN_REGRESO" label="Pendientes de regreso" value={data?.kpis.sinRegreso ?? (loading ? '…' : '—')} description="Ver regresos pendientes" tone="red" />
        </div>
        {loading && !data ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Cargando estado de flota…</p> : null}
        {error && !data ? <div role="alert" className="rounded-lg border bg-card p-4"><h3 className="font-semibold text-navy">No pudimos cargar las unidades.</h3><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button variant="secondary" className="mt-3 min-h-11" onClick={() => void cargar()}>Reintentar</Button></div> : null}
      </section>

      <section aria-labelledby="atencion-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="atencion-title" className="text-lg font-semibold text-navy">Pendientes de regreso</h2><p className="text-sm text-muted-foreground">Unidades que superaron el umbral configurado.</p></div>
          <Button variant="quiet" className="min-h-11" asChild><Link href="/flota?alerta=SIN_REGRESO">Ver todos</Link></Button>
        </div>
        {pendientes.length ? <ul className="grid list-none gap-3 p-0">{pendientes.slice(0, 4).map((row) => <li key={row.unidadId}><AttentionCard row={row} /></li>)}</ul> : <div className="rounded-lg border bg-card p-4"><h3 className="font-medium text-navy">{loading ? 'Cargando pendientes…' : 'No hay regresos pendientes.'}</h3>{!loading ? <p className="mt-1 text-sm text-muted-foreground">Las unidades en ruta están dentro del tiempo esperado.</p> : null}</div>}
      </section>

      <section aria-labelledby="disponibles-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="disponibles-title" className="text-lg font-semibold text-navy">Unidades disponibles</h2><p className="text-sm text-muted-foreground">Listas para registrar una salida.</p></div>
          <Button variant="quiet" className="min-h-11" asChild><Link href="/flota?chip=DISPONIBLE">Ver todas</Link></Button>
        </div>
        {disponibles.length ? <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">{disponibles.slice(0, 4).map((row) => <li key={row.unidadId}><article className="h-full rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-navy">{row.numeroInterno}</h3><p className="text-sm text-muted-foreground">{row.placas}</p></div><UnidadOpsBadge ops="DISPONIBLE" /></div>
          <Button className="mt-4 min-h-11 w-full" onClick={() => abrirSalida(row.unidadId)}>Registrar salida de {row.numeroInterno}</Button>
        </article></li>)}</ul> : <div className="rounded-lg border bg-card p-4"><h3 className="font-medium text-navy">{loading ? 'Cargando unidades disponibles…' : 'No hay unidades disponibles.'}</h3></div>}
      </section>

      <section aria-labelledby="enruta-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="enruta-title" className="text-lg font-semibold text-navy">En ruta</h2><p className="text-sm text-muted-foreground">Viajes activos que no tienen alerta de regreso.</p></div><Button variant="quiet" className="min-h-11" asChild><Link href="/flota?chip=EN_RUTA">Ver movimientos</Link></Button></div>
        {activos.length ? <ul className="divide-y rounded-lg border bg-card">{activos.slice(0, 4).map((row) => <li key={row.unidadId} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0"><p className="font-medium text-navy">{row.numeroInterno} · {row.placas}</p><p className="text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}</p></div>
          <div className="flex items-center gap-2">{row.salidaAt ? <span className="text-sm text-muted-foreground">Salió {formatHace(row.salidaAt)}</span> : null}<UnidadOpsBadge ops="EN_RUTA" /></div>
        </li>)}</ul> : <div className="rounded-lg border bg-card p-4"><h3 className="font-medium text-navy">{loading ? 'Cargando unidades en ruta…' : 'No hay unidades en ruta.'}</h3></div>}
      </section>

      <section aria-labelledby="actividad-title" className="space-y-2">
        <h2 id="actividad-title" className="text-lg font-semibold text-navy">Últimos movimientos</h2>
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">La API actual no ofrece un historial agregado reciente de viajes. La bitácora de patio se consulta por separado. <Link className="font-medium text-navy underline underline-offset-2" href="/flota">Abrir flota</Link></p>
      </section>

      <Sheet open={salidaOpen} onOpenChange={setSalidaOpen}>
        <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto sm:mx-auto sm:max-w-xl sm:rounded-t-xl">
          <form className="flex min-h-full flex-col" onSubmit={registrarSalida}>
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">Registrar salida</SheetTitle>
              <SheetDescription>Completa los datos que se guardarán para la salida. La fecha y hora se registran al confirmar.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Movimientos de flota</p><p className="mt-1">Selecciona una unidad y un chofer disponibles.</p></div>
              <Field label="Unidad" htmlFor="salida-unidad"><NativeSelect id="salida-unidad" required value={form.unidadId} onChange={(e) => setForm({ ...form, unidadId: e.target.value })}><option value="">Selecciona una unidad</option>{disponibles.map((row) => <option key={row.unidadId} value={row.unidadId}>{row.numeroInterno} · {row.placas} · Disponible</option>)}</NativeSelect></Field>
              <Field label="Chofer" htmlFor="salida-chofer"><NativeSelect id="salida-chofer" required value={form.choferId} onChange={(e) => setForm({ ...form, choferId: e.target.value })}><option value="">Selecciona un chofer</option>{choferes.map((row) => <option key={row.choferId} value={row.choferId}>{row.nombre}</option>)}</NativeSelect></Field>
              <Field label="Destino" htmlFor="salida-destino"><Input id="salida-destino" required maxLength={160} autoComplete="off" value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} /></Field>
              <Field label="Tipo de salida" htmlFor="salida-ambito"><NativeSelect id="salida-ambito" required value={form.ambito} onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoUnidad })}><option value="LOCAL">Local</option><option value="FORANEO">Foráneo</option></NativeSelect></Field>
              <p className="rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">Fecha y hora: ahora · {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</p>
              <FormAlert>{error}</FormAlert>
            </div>
            <SheetFooter className="sticky bottom-0 mt-auto flex-col border-t bg-background p-4 sm:flex-row">
              <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={() => setSalidaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="min-h-12 flex-1" disabled={saving || !disponibles.length || !choferes.length}>{saving ? 'Registrando…' : 'Registrar salida'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({ href, label, value, description, tone }: { href: string; label: string; value: string | number; description: string; tone: 'blue' | 'green' | 'red' }) {
  const toneClass = tone === 'green' ? 'border-emerald-200 bg-emerald-50' : tone === 'red' ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50';
  return <Link href={href} aria-label={`${label}: ${value}. ${description}`} className={`flex min-h-24 flex-col justify-center rounded-lg border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${toneClass}`}><span className="text-sm font-medium text-muted-foreground">{label}</span><span className="mt-1 text-2xl font-semibold text-navy" aria-hidden="true">{value}</span></Link>;
}

function AttentionCard({ row }: { row: LogisticaUnidadRow }) {
  return <article className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-navy">{row.numeroInterno} · {row.placas}</h3><Badge variant="warning" className="normal-case tracking-normal">{etiquetaAlertaRegreso(row.alerta)}</Badge></div>
      <p className="text-sm">Regreso fuera del umbral esperado.</p>
      <p className="text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}{row.salidaAt ? ` · Salió ${formatHace(row.salidaAt)}` : ''}</p>
      <p className="flex items-center gap-2 text-sm text-rose-900"><Clock3 className="size-4" aria-hidden /> Requiere seguimiento</p>
    </div>
    <Button className="min-h-12 w-full shrink-0 sm:w-auto" asChild><Link href={`/flota?alerta=SIN_REGRESO&unidadId=${encodeURIComponent(row.unidadId)}`}>Registrar regreso de {row.numeroInterno}</Link></Button>
  </article>;
}
