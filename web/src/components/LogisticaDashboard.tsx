'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, Truck } from 'lucide-react';
import { UnidadOpsBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      setNotice(`Salida registrada · ${unidadElegida?.numeroInterno} · ${choferElegido?.nombre}`);
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
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Logística</p>
        <h1 className="text-2xl font-semibold text-navy">Vista general</h1>
        <p className="lede">Estado actual de las unidades, regresos pendientes y actividad de hoy.</p>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{fecha}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-12" onClick={() => abrirSalida()}><Truck className="mr-2 size-4" aria-hidden />Registrar salida</Button>
        <Button variant="secondary" className="min-h-12" asChild><Link href="/flota?alerta=SIN_REGRESO">Registrar regreso<ArrowRight className="ml-2 size-4" aria-hidden /></Link></Button>
      </div>
      {notice ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
      <FormAlert>{error && !salidaOpen ? error : null}</FormAlert>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Estado operativo">
        <Kpi label="En ruta" value={data?.kpis.enRuta ?? '—'} />
        <Kpi label="Disponibles" value={data?.kpis.disponibles ?? '—'} />
        <Kpi label="Pendientes de regreso" value={data?.kpis.sinRegreso ?? '—'} />
        <Kpi label="Movimientos hoy" value="—" />
      </section>
      {loading && !data ? <p className="muted">Cargando estado de flota…</p> : null}
      {error && !data ? <div className="empty-state"><h2>No pudimos cargar la flota.</h2><Button variant="secondary" onClick={() => void cargar()}>Reintentar</Button></div> : null}

      <section className="space-y-3" aria-labelledby="atencion-title">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="atencion-title" className="text-lg font-semibold text-navy">Requiere atención</h2><p className="text-sm text-muted-foreground">Regresos fuera del umbral configurado.</p></div>
          <Button variant="quiet" asChild><Link href="/flota?alerta=SIN_REGRESO">Ver todos</Link></Button>
        </div>
        {pendientes.length ? <div className="grid gap-3">{pendientes.slice(0, 4).map((row) => <AttentionCard key={row.unidadId} row={row} />)}</div> : <div className="empty-state"><h3>No hay regresos pendientes.</h3><p className="muted">Las unidades en ruta están dentro del tiempo esperado.</p></div>}
      </section>

      <section className="space-y-3" aria-labelledby="disponibles-title">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="disponibles-title" className="text-lg font-semibold text-navy">Unidades disponibles</h2><p className="text-sm text-muted-foreground">Listas para registrar una salida.</p></div>
          <Button variant="quiet" asChild><Link href="/flota?chip=DISPONIBLE">Ver todas</Link></Button>
        </div>
        {disponibles.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{disponibles.slice(0, 4).map((row) =>
          <article key={row.unidadId} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-navy">{row.numeroInterno}</h3><p className="text-sm text-muted-foreground">{row.placas}</p></div><UnidadOpsBadge ops="DISPONIBLE" /></div>
            <Button className="mt-4 min-h-11 w-full" onClick={() => abrirSalida(row.unidadId)}>Registrar salida</Button>
          </article>)}</div> : <div className="empty-state"><h3>No hay unidades disponibles actualmente.</h3></div>}
      </section>

      <section className="space-y-3" aria-labelledby="enruta-title">
        <div className="flex items-center justify-between gap-3"><div><h2 id="enruta-title" className="text-lg font-semibold text-navy">En ruta</h2><p className="text-sm text-muted-foreground">Viajes activos dentro del tiempo esperado.</p></div><Button variant="quiet" asChild><Link href="/flota?chip=EN_RUTA">Ver movimientos</Link></Button></div>
        {activos.length ? <ul className="divide-y rounded-lg border bg-card">{activos.slice(0, 4).map((row) =>
          <li key={row.unidadId} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-medium text-navy">{row.numeroInterno} · {row.placas}</p><p className="text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}</p></div>
            <div className="flex items-center gap-2">{row.salidaAt ? <span className="text-xs text-muted-foreground">{formatHace(row.salidaAt)}</span> : null}<UnidadOpsBadge ops="EN_RUTA" /></div>
          </li>)}</ul> : <div className="empty-state"><h3>No hay unidades en ruta.</h3></div>}
      </section>

      <section className="space-y-2" aria-labelledby="actividad-title">
        <h2 id="actividad-title" className="text-lg font-semibold text-navy">Últimos movimientos</h2>
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          No hay un resumen reciente de viajes en la API actual. La bitácora de patio se mantiene separada del estado de ruta. <Link className="font-medium text-navy underline" href="/flota">Ver flota</Link>
        </p>
      </section>

      {salidaOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSalidaOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="salida-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-background p-5 shadow-xl sm:max-w-lg sm:rounded-xl">
          <h2 id="salida-title" className="text-xl font-semibold text-navy">Registrar salida</h2>
          <p className="mb-4 text-sm text-muted-foreground">La fecha y hora se registran al confirmar.</p>
          <form className="grid gap-4" onSubmit={registrarSalida}>
            <Field label="Unidad" htmlFor="salida-unidad"><NativeSelect id="salida-unidad" required value={form.unidadId} onChange={(e) => setForm({ ...form, unidadId: e.target.value })}><option value="">Selecciona una unidad</option>{disponibles.map((row) => <option key={row.unidadId} value={row.unidadId}>{row.numeroInterno} ({row.placas}) · Disponible</option>)}</NativeSelect></Field>
            <Field label="Chofer" htmlFor="salida-chofer"><NativeSelect id="salida-chofer" required value={form.choferId} onChange={(e) => setForm({ ...form, choferId: e.target.value })}><option value="">Selecciona un chofer</option>{choferes.map((row) => <option key={row.choferId} value={row.choferId}>{row.nombre}</option>)}</NativeSelect></Field>
            <Field label="Destino" htmlFor="salida-destino"><Input id="salida-destino" required maxLength={160} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} /></Field>
            <Field label="Tipo de salida" htmlFor="salida-ambito"><NativeSelect id="salida-ambito" required value={form.ambito} onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoUnidad })}><option value="LOCAL">Local</option><option value="FORANEO">Foráneo</option></NativeSelect></Field>
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">Fecha y hora: ahora · {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</p>
            <FormAlert>{error}</FormAlert>
            <div className="sticky bottom-0 flex gap-2 bg-background py-2"><Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => setSalidaOpen(false)}>Cancelar</Button><Button type="submit" className="min-h-11 flex-1" disabled={saving || !disponibles.length || !choferes.length}>{saving ? 'Registrando…' : 'Registrar salida'}</Button></div>
          </form>
        </section>
      </div> : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border bg-card p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-navy">{value}</p></div>;
}

function AttentionCard({ row }: { row: LogisticaUnidadRow }) {
  return <article className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-navy">{row.numeroInterno} · {row.placas}</h3><Badge variant="warning" className="normal-case tracking-normal">{etiquetaAlertaRegreso(row.alerta)}</Badge></div>
      <p className="text-sm">Regreso fuera del umbral esperado.</p>
      <p className="text-xs text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Destino pendiente'}{row.salidaAt ? ` · ${formatHace(row.salidaAt)}` : ''}</p>
      <p className="flex items-center gap-1 text-xs text-amber-900"><Clock3 className="size-3.5" aria-hidden /> Seguimiento requerido</p>
    </div>
    <Button className="min-h-11 w-full shrink-0 sm:w-auto" asChild><Link href={`/flota?alerta=SIN_REGRESO&unidadId=${encodeURIComponent(row.unidadId)}`}>Registrar regreso</Link></Button>
  </article>;
}
