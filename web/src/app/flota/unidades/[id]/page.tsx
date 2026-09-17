'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RoleGate } from '@/components/RoleGate';
import { SignaturePad } from '@/components/SignaturePad';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, Note, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import { IndicadoresStrip } from '@/components/IndicadoresStrip';
import { api, HttpError } from '@/lib/api';
import {
  ciclosDeHistorial,
  detalleCicloFlota,
  etiquetaAdminFlota,
  fraseCicloFlota,
} from '@/lib/flota-viaje';
import { indicadoresDePatio } from '@/lib/hub-indicadores';
import { useRole } from '@/lib/role';
import type {
  Chofer,
  FlotaUnidadDetalle,
  SitioFlota,
  TipoMovimientoFlota,
} from '@/lib/types';

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FlotaUnidadPage() {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <FlotaUnidad />
    </RoleGate>
  );
}

function FlotaUnidad() {
  const params = useParams<{ id: string }>();
  const { role, userId } = useRole();
  const [detalle, setDetalle] = useState<FlotaUnidadDetalle | null>(null);
  const [sitios, setSitios] = useState<SitioFlota[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyEstado, setBusyEstado] = useState(false);

  const enRuta = Boolean(detalle?.tablero?.salidaAbiertaId);
  const tipo: TipoMovimientoFlota = enRuta ? 'ENTRADA' : 'SALIDA';

  const [choferId, setChoferId] = useState('');
  const [sitioId, setSitioId] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocalInput());
  const [km, setKm] = useState('');
  const [notas, setNotas] = useState('');
  const [firmaChofer, setFirmaChofer] = useState<string | null>(null);
  const [firmaAval, setFirmaAval] = useState<string | null>(null);
  const [padsNonce, setPadsNonce] = useState(0);

  async function cargar() {
    const [d, s, c] = await Promise.all([
      api<FlotaUnidadDetalle>(`/flota/unidades/${params.id}`, {
        role: role!,
        userId,
      }),
      api<SitioFlota[]>('/flota/sitios', { role: role!, userId }),
      api<Chofer[]>('/choferes?estado=ACTIVO', { role: role!, userId }),
    ]);
    setDetalle(d);
    setSitios(s.filter((x) => x.estado === 'ACTIVO'));
    setChoferes(c);
    const patio = s.find((x) => x.nombre === 'Patio' && x.estado === 'ACTIVO');
    const abierta = Boolean(d.tablero?.salidaAbiertaId);
    if (abierta) {
      setSitioId(patio?.id || s.find((x) => x.estado === 'ACTIVO')?.id || '');
      setChoferId(d.tablero?.choferActualId || c[0]?.id || '');
      if (d.tablero?.kmSalida != null) {
        setKm(String(d.tablero.kmSalida));
      }
    } else {
      setSitioId('');
      setChoferId((current) => current || c[0]?.id || '');
    }
  }

  useEffect(() => {
    if (!role || !params.id) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo cargar la unidad.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, params.id]);

  const ciclos = useMemo(
    () => ciclosDeHistorial(detalle?.historial ?? []),
    [detalle?.historial],
  );

  async function registrar(event: FormEvent) {
    event.preventDefault();
    if (!firmaChofer || !firmaAval) {
      setError('Se requieren las firmas del chofer y del aval.');
      return;
    }
    setSaving(true);
    setError(null);
    setAvisos([]);
    try {
      const res = await api<{ avisos: string[] }>('/flota/movimientos', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          tipo,
          unidadId: params.id,
          choferId,
          sitioId,
          occurredAt: new Date(occurredAt).toISOString(),
          km: Number(km),
          notas: notas.trim() || undefined,
          firmas: [
            { tipo: 'CHOFER', dataUrl: firmaChofer },
            { tipo: 'AVAL', dataUrl: firmaAval },
          ],
        }),
      });
      setAvisos(res.avisos ?? []);
      setFirmaChofer(null);
      setFirmaAval(null);
      setPadsNonce((n) => n + 1);
      setNotas('');
      setOccurredAt(toLocalInput());
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo registrar el movimiento.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function envioEspecial() {
    setBusyEstado(true);
    setError(null);
    try {
      await api(`/flota/unidades/${params.id}/envio-especial`, {
        role: role!,
        userId,
        method: 'POST',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo marcar el envío especial.',
      );
    } finally {
      setBusyEstado(false);
    }
  }

  async function reactivar() {
    setBusyEstado(true);
    setError(null);
    try {
      await api(`/flota/unidades/${params.id}/reactivar`, {
        role: role!,
        userId,
        method: 'POST',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo reactivar la unidad.',
      );
    } finally {
      setBusyEstado(false);
    }
  }

  if (!detalle) {
    return (
      <div className="space-y-3">
        <FormAlert>{error}</FormAlert>
        <p className="muted">Cargando unidad…</p>
      </div>
    );
  }

  const { unidad, tablero } = detalle;
  const sitiosActivos = sitios;
  const admin = etiquetaAdminFlota(unidad);

  return (
    <div className="space-y-3">
      <PageHeader
        kicker={<Link href="/flota">Flota</Link>}
        title={unidad.numeroInterno}
        lede={`${unidad.placas} · ${unidad.tipoNombre}`}
        actions={
          unidad.estado === 'INACTIVA' ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busyEstado}
              onClick={() => void reactivar()}
            >
              Reactivar
            </Button>
          ) : (
            <Button
              type="button"
              variant="dangerSoft"
              disabled={busyEstado}
              onClick={() => void envioEspecial()}
            >
              Inactivar por envío especial
            </Button>
          )
        }
      />
      <FormAlert>{error}</FormAlert>
      {avisos.map((a) => (
        <Note key={a} variant="warn">
          {a}
        </Note>
      ))}

      <section className="card panel">
        <h2>Situación</h2>
        <IndicadoresStrip
          label="Indicadores de patio"
          items={indicadoresDePatio(detalle)}
        />
        {admin ? <p className="muted mt-2">{admin}</p> : null}
        {tablero?.andonAbierto ? (
          <Note variant="warn">
            Hay una alerta de mantenimiento abierta. La salida no se bloquea.
          </Note>
        ) : null}
      </section>

      <section className="card panel">
        <h2>Registrar {tipo === 'SALIDA' ? 'salida' : 'entrada'}</h2>
        <form className="grid gap-3" onSubmit={(e) => void registrar(e)}>
          <Field label="Chofer" htmlFor="flota-chofer">
            <NativeSelect
              id="flota-chofer"
              value={choferId}
              onChange={(e) => setChoferId(e.target.value)}
              required
            >
              {choferes.length === 0 ? (
                <option value="">No hay choferes activos</option>
              ) : null}
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Sitio" htmlFor="flota-sitio">
            <NativeSelect
              id="flota-sitio"
              value={sitioId}
              onChange={(e) => setSitioId(e.target.value)}
              required
            >
              <option value="" disabled>
                Seleccione sitio
              </option>
              {sitiosActivos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Fecha y hora" htmlFor="flota-hora">
            <Input
              id="flota-hora"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Kilometraje" htmlFor="flota-km">
            <Input
              id="flota-km"
              type="number"
              min={0}
              value={km}
              onChange={(e) => setKm(e.target.value)}
              required
            />
          </Field>
          <Field label="Nota de viaje" htmlFor="flota-notas">
            <Textarea
              id="flota-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={240}
            />
          </Field>
          {choferes.length === 0 ? (
            <Note variant="warn">
              No hay choferes activos. Pide alta o reactivación a administración.
            </Note>
          ) : null}
          <SignaturePad
            key={`chofer-${padsNonce}`}
            label="Firma del chofer"
            value={firmaChofer}
            onChange={setFirmaChofer}
          />
          <SignaturePad
            key={`aval-${padsNonce}`}
            label="Firma del aval"
            value={firmaAval}
            onChange={setFirmaAval}
          />
          <Button type="submit" disabled={saving || !choferId || !sitioId}>
            {saving
              ? 'Registrando…'
              : tipo === 'SALIDA'
                ? 'Registrar salida'
                : 'Registrar entrada'}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium">Historial</h2>
        {ciclos.length === 0 ? (
          <p className="muted">Aún no hay movimientos de patio.</p>
        ) : (
          <ul className="card divide-y divide-border overflow-hidden">
            {ciclos.map((ciclo) => {
              const detalle = detalleCicloFlota(ciclo);
              return (
                <li key={ciclo.id} className="px-3 py-2">
                  <div className="text-sm">{fraseCicloFlota(ciclo)}</div>
                  {detalle ? <div className="muted">{detalle}</div> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
