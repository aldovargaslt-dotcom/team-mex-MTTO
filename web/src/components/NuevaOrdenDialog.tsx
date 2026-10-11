'use client';

import { useEffect, useMemo, useState, type RefObject } from 'react';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { api, HttpError } from '@/lib/api';
import type { Chofer, TipoVisita, Unidad, VisitaDetalle, VisitaResumen } from '@/lib/types';

export type CreateVisitaResult = VisitaDetalle & {
  outcome: 'CREATED' | 'EXISTING_DRAFT';
};

type OrdenContinuation = (CreateVisitaResult | VisitaResumen) & {
  unidadId: string;
};

export function NuevaOrdenDialog({
  open,
  onOpenChange,
  role,
  userId,
  preselectedUnitId,
  onContinue,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  userId?: string;
  preselectedUnitId?: string;
  onContinue: (visita: OrdenContinuation, existing: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [mobile, setMobile] = useState(false);

  const [unitId, setUnitId] = useState(preselectedUnitId ?? '');
  const [driverId, setDriverId] = useState('');
  const [km, setKm] = useState('');
  const [tipo, setTipo] = useState<TipoVisita>('PREDICTIVO');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opts = useMemo(() => ({ role, userId }), [role, userId]);
  const unitRead = useReadResource(open ? JSON.stringify([role, userId, 'units']) : null,
    () => api<Unidad[]>('/unidades?estado=ACTIVA', opts));
  const driverRead = useReadResource(open ? JSON.stringify([role, userId, 'drivers']) : null,
    () => api<Chofer[]>('/choferes?estado=ACTIVO', opts));
  const checkRead = useReadResource(open && unitId ? JSON.stringify([role, userId, unitId]) : null,
    () => api<VisitaResumen[]>(`/unidades/${unitId}/visitas`, opts));
  const units = unitRead.data ?? [];
  const drivers = driverRead.data ?? [];
  const existing = checkRead.data?.find((v) => v.estado === 'BORRADOR') ?? null;
  const checking = checkRead.loading;
  function restoreFocus(event: Event) {
    if (returnFocusRef.current?.isConnected) {
      event.preventDefault();
      returnFocusRef.current.focus();
    }
  }



  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const selected = units.find((unit) => unit.id === unitId) ?? null;
  const filtered = units.filter((unit) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${unit.numeroInterno} ${unit.placas} ${unit.tipo.nombre}`.toLowerCase().includes(needle);
  });

  async function submit() {
    if (!unitId || !driverId || km === '' || checkRead.data === null || unitRead.data === null || driverRead.data === null || checking) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<CreateVisitaResult>(`/unidades/${unitId}/visitas`, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ choferId: driverId, km: Number(km), tipo }),
      });
      onContinue(result, result.outcome === 'EXISTING_DRAFT');
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No pudimos crear la orden. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <div className="nueva-orden-body">
      <ReadStatus loading={unitRead.loading} error={unitRead.error} loadingText="Cargando unidades activas…" errorText="No se pudieron cargar las unidades." retry={unitRead.retry} />
      <ReadStatus loading={driverRead.loading} error={driverRead.error} loadingText="Cargando choferes activos…" errorText="No se pudieron cargar los choferes." retry={driverRead.retry} />
      {!preselectedUnitId && unitRead.data !== null ? (
        <>
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar número, placas o tipo" aria-label="Buscar unidad activa" />
          <div className="nueva-orden-units" role="listbox" aria-label="Unidades activas">
            {filtered.length === 0 ? <p className="muted">{q.trim() && units.length > 0 ? 'Sin coincidencias con estos filtros.' : 'No hay unidades activas.'}</p> : filtered.map((unit) => (
              <button key={unit.id} type="button" role="option" aria-selected={unit.id === unitId} className={unit.id === unitId ? 'is-selected' : ''} onClick={() => setUnitId(unit.id)}>
                <UnidadMarca foto={unit.fotoDataUrl} nombre={unit.tipo.nombre} icono={unit.tipo.icono} />
                <span><strong>{unit.numeroInterno}</strong><small>{unit.placas} · {unit.tipo.nombre}</small></span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {selected ? (
        <div className="nueva-orden-selected">
          <UnidadMarca foto={selected.fotoDataUrl} nombre={selected.tipo.nombre} icono={selected.tipo.icono} />
          <div><strong>{selected.numeroInterno}</strong><p>{selected.placas} · {selected.tipo.nombre}</p></div>
        </div>
      ) : null}
      {unitId ? <ReadStatus key={unitId} loading={checking} error={checkRead.error} loadingText="Revisando órdenes abiertas…" errorText="No se pudieron revisar las órdenes abiertas." retry={checkRead.retry} /> : null}
      {existing ? (
        <div className="nueva-orden-existing" role="status">
          <strong>Esta unidad ya tiene una orden en borrador.</strong>
          <p>Continúa la captura existente; no se creará otra.</p>
          <Button type="button" onClick={() => onContinue({ ...existing, unidadId: unitId }, true)}>Continuar orden</Button>
        </div>
      ) : selected && checkRead.data !== null && driverRead.data !== null ? (
        <div className="nueva-orden-form">
          <Field label="Chofer" htmlFor="nueva-orden-chofer">
            <select id="nueva-orden-chofer" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              <option value="">Selecciona un chofer activo</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nombre}</option>)}
            </select>
          </Field>
          {drivers.length === 0 ? <p className="muted">No hay choferes activos disponibles. Activa un chofer antes de crear la orden.</p> : null}
          <Field label="Kilometraje" htmlFor="nueva-orden-km">
            <Input id="nueva-orden-km" type="number" min={0} value={km} onChange={(event) => setKm(event.target.value)} />
          </Field>
          <Field label="Tipo" htmlFor="nueva-orden-tipo">
            <select id="nueva-orden-tipo" value={tipo} onChange={(event) => setTipo(event.target.value as TipoVisita)}>
              <option value="PREDICTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
            </select>
          </Field>
        </div>
      ) : null}
      <FormAlert>{error}</FormAlert>
    </div>
  );

  const footer = existing ? null : (
    <>
      <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
      <Button type="button" disabled={!selected || !driverId || km === '' || busy || drivers.length === 0 || checking || checkRead.data === null || unitRead.data === null || driverRead.data === null} onClick={() => void submit()}>
        {busy ? 'Creando…' : 'Crear y continuar'}
      </Button>
    </>
  );

  if (mobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" onCloseAutoFocus={restoreFocus}>
        <SheetHeader><SheetTitle>Nueva orden</SheetTitle><SheetDescription>Selecciona una unidad activa y captura los datos iniciales.</SheetDescription></SheetHeader>
        {content}<SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={restoreFocus}>
        <DialogHeader><DialogTitle>Nueva orden</DialogTitle><DialogDescription>Selecciona una unidad activa y captura los datos iniciales.</DialogDescription></DialogHeader>
        {content}<DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
