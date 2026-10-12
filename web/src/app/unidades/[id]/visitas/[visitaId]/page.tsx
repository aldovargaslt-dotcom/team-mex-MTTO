'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { SignaturePad } from '@/components/SignaturePad';
import {
  PiezasReadonly,
  PiezasStep,
  hydratePiezasFromInventario,
  lineasDesdeVisita,
  piezasInsuficientes,
  type PiezaLinea,
} from '@/components/PiezasStep';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { api, HttpError } from '@/lib/api';
import { ImageDropzone } from '@/components/ImageDropzone';
import { VisitStepper } from '@/components/VisitStepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FormAlert, Note, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import {
  etiquetaEstadoVisita,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  formatKm,
  resumenOrigenPiezas,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import {
  safeUnidadesReturnTo,
  withUnidadesReturnTo,
} from '@/lib/unidades-return';
import type {
  CatalogoCategoria,
  Chofer,
  SkuCompatible,
  TipoFirma,
  TipoVisita,
  VisitaDetalle,
} from '@/lib/types';

const STEPS = [
  { id: 'datos', label: 'Datos' },
  { id: 'trabajos', label: 'Trabajos' },
  { id: 'observaciones', label: 'Obs' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'piezas', label: 'Piezas' },
  { id: 'firmas', label: 'Firmas' },
  { id: 'confirmar', label: 'Confirmar' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function VisitaPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <VisitaContent />
    </RoleGate>
  );
}

function VisitaContent() {
  const params = useParams<{ id: string; visitaId: string }>();
  const searchParams = useSearchParams();
  const returnTo = safeUnidadesReturnTo(searchParams.get('returnTo'));
  const hubHref = withUnidadesReturnTo(`/unidades/${params.id}`, returnTo);
  const { role, userId, isAdmin } = useRole();
  const read = useReadResource(role ? JSON.stringify([role, userId, params.visitaId]) : null,
    () => api<VisitaDetalle>(`/visitas/${params.visitaId}`, { role: role!, userId }));
  const visita = read.data;
  const setVisita = read.setData;
  const unavailable = read.error instanceof HttpError && read.error.status === 404;
  if (!visita) return <>
    <ReadStatus loading={read.loading} error={read.error} loadingText="Cargando visita…"
      errorText={unavailable ? 'La visita no está disponible para este acceso.' : 'No se pudo abrir la visita.'} retry={read.retry} />
    {unavailable ? <p className="muted">ID: {params.visitaId}</p> : null}
    <Button asChild variant="outline"><Link href={hubHref}>Volver al hub</Link></Button>
  </>;

  if (visita.estado === 'CERRADO' || isAdmin) {
    return <VisitaReadonly visita={visita} hubHref={hubHref} />;
  }

  return (
    <VisitWizard
      key={JSON.stringify([role, userId, visita.id])}
      unidadId={params.id}
      visita={visita}
      onChange={setVisita}
      hubHref={hubHref}
    />
  );
}

function VisitaReadonly({
  visita,
  hubHref,
}: {
  visita: VisitaDetalle;
  hubHref: string;
}) {
  const { role, userId } = useRole();
  const piezaRead = useReadResource(role ? JSON.stringify([role, userId, visita.id, visita.piezas]) : null,
    () => hydratePiezasFromInventario(visita.piezas ?? [], { role: role!, userId }));
  const piezas = piezaRead.data ?? lineasDesdeVisita(visita.piezas ?? []);

  return (
    <>
      <PageHeader
        kicker={visita.estado === 'CERRADO' ? 'Orden cerrada' : 'Orden de mantenimiento'}
        title={
          <span className="inline-flex items-center gap-2">
            {visita.unidadNumeroInterno}
            <Badge variant={visita.estado === 'CERRADO' ? 'success' : 'warning'}>
              {visita.estado === 'BORRADOR' && visita.openedAt ? 'Abierta' : etiquetaEstadoVisita(visita.estado)}
            </Badge>
          </span>
        }
        lede={
          <>
            {etiquetaTipoVisita(visita.tipo)}
            {' · '}
            {formatKm(visita.km)}
            {visita.chofer ? ` · ${visita.chofer.nombre}` : ''}
            {visita.cerradoAt ? ` · ${formatFecha(visita.cerradoAt)}` : ''}
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href={hubHref}>Volver al hub</Link>
          </Button>
        }
      />

      <Card className="p-3">
        <section className="doc-section">
          <h2>Datos</h2>
          <dl className="dl">
            <dt>Chofer</dt>
            <dd>{visita.chofer?.nombre ?? 'Sin chofer'}</dd>
            <dt>Kilometraje</dt>
            <dd>{formatKm(visita.km)}</dd>
            <dt>Tipo</dt>
            <dd>{etiquetaTipoVisita(visita.tipo)}</dd>
          </dl>
        </section>

        <section className="doc-section">
          <h2>Trabajos</h2>
          {visita.trabajos.length === 0 ? (
            <p className="muted">No se registraron trabajos.</p>
          ) : (
            <ul className="plain-list">
              {visita.trabajos.map((t) => (
                <li key={t.id}>
                  <span className="cat">{t.categoria}</span> {t.item}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="doc-section">
          <h2>Observaciones</h2>
          <p>{visita.observaciones || 'Sin observaciones.'}</p>
        </section>

        <section className="doc-section">
          <h2>Fotos</h2>
          {visita.fotos.length === 0 ? (
            <p className="muted">Sin fotos.</p>
          ) : (
            <div className="photo-grid">
              {visita.fotos.map((foto) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={foto.id} src={foto.dataUrl} alt="Foto de la visita" />
              ))}
            </div>
          )}
        </section>

        <ReadStatus loading={piezaRead.loading && visita.piezas.length > 0} error={piezaRead.error}
          loadingText="Cargando datos de las piezas…" errorText="No se pudieron consultar las piezas. Se conservan cantidades y origen."
          retry={piezaRead.retry} retryLabel="Reintentar piezas" />
        <PiezasReadonly piezas={piezas} />

        <section className="doc-section">
          <h2>Firmas</h2>
          <div className="firmas-grid">
            {(['CHOFER', 'JEFE'] as TipoFirma[]).map((tipo) => {
              const firma = visita.firmas.find((f) => f.tipo === tipo);
              return (
                <div key={tipo}>
                  <p className="muted">
                    {tipo === 'CHOFER' ? 'Chofer' : 'Jefe de mecánicos / taller'}
                  </p>
                  {firma ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="signature-img" src={firma.dataUrl} alt={tipo} />
                  ) : (
                    <p className="muted">Sin firma</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </Card>
    </>
  );
}

function VisitWizard({
  unidadId,
  visita,
  onChange,
  hubHref,
}: {
  unidadId: string;
  visita: VisitaDetalle;
  onChange: (visita: VisitaDetalle) => void;
  hubHref: string;
}) {
  const { role, userId } = useRole();
  const router = useRouter();
  const [step, setStep] = useState<StepId>('datos');
  const opts = { role: role!, userId };
  const actorKey = role ? JSON.stringify([role, userId, unidadId, visita.id]) : null;
  const driversRead = useReadResource(actorKey, () => api<Chofer[]>('/choferes?estado=ACTIVO', opts));
  const catalogRead = useReadResource(actorKey, () => api<CatalogoCategoria[]>('/catalogo/trabajos', opts));
  const hubRead = useReadResource(actorKey, () => api<{ fichaCorta: { ultimoKm: number | null } }>(`/unidades/${unidadId}/hub`, opts));
  const piecesRead = useReadResource(actorKey ? JSON.stringify([actorKey, visita.piezas]) : null,
    () => hydratePiezasFromInventario(visita.piezas ?? [], opts));
  const stockRead = useReadResource(actorKey && step === 'piezas' && visita.tipoVehiculoId
    ? JSON.stringify([actorKey, 'stock', visita.tipoVehiculoId]) : null,
    () => api<SkuCompatible[]>(`/inventario/skus?tipoVehiculoId=${visita.tipoVehiculoId}`, opts));
  const choferes = driversRead.data ?? [];
  const choferesListos = driversRead.data !== null;
  const catalogo = catalogRead.data ?? [];
  const ultimoKm = hubRead.data?.fichaCorta.ultimoKm ?? null;
  const relacionesListas = [driversRead, catalogRead, hubRead, piecesRead].every((source) => !source.loading && !source.error && source.data !== null);

  const [choferId, setChoferId] = useState(visita.chofer?.id ?? '');
  const [km, setKm] = useState(visita.km != null ? String(visita.km) : '');
  const [tipo, setTipo] = useState<TipoVisita | ''>(visita.tipo ?? '');
  const [observaciones, setObservaciones] = useState(
    visita.observaciones ?? '',
  );
  const [trabajos, setTrabajos] = useState<Set<string>>(
    () => new Set(visita.trabajos.map((t) => `${t.categoria}::${t.item}`)),
  );
  const [fotos, setFotos] = useState<string[]>(visita.fotos.map((f) => f.dataUrl));
  const [firmaChofer, setFirmaChofer] = useState(
    visita.firmas.find((f) => f.tipo === 'CHOFER')?.dataUrl ?? '',
  );
  const [firmaJefe, setFirmaJefe] = useState(
    visita.firmas.find((f) => f.tipo === 'JEFE')?.dataUrl ?? '',
  );
  const [piezas, setPiezas] = useState<PiezaLinea[]>(() => lineasDesdeVisita(visita.piezas ?? []));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (!piecesRead.data) return;
    const metadata = new Map(piecesRead.data.map((line) => [line.itemId, line]));
    setPiezas((current) => current.map((line) => {
      const match = metadata.get(line.itemId);
      return match ? { ...match, qty: line.qty, origen: line.origen } : line;
    }));
  }, [piecesRead.data]);
  useEffect(() => {
    if (!stockRead.data) return;
    const stock = new Map(stockRead.data.map((item) => [item.id, item.stock]));
    setPiezas((current) => current.map((line) => ({ ...line, stock: stock.get(line.itemId) ?? null })));
  }, [stockRead.data]);

  const sinChoferesActivos = choferesListos && choferes.length === 0;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const payloadTrabajos = useMemo(
    () =>
      [...trabajos].map((key) => {
        const [categoria, item] = key.split('::');
        return { categoria, item };
      }),
    [trabajos],
  );

  async function persist(extra?: Record<string, unknown>) {
    if (!relacionesListas || (step === 'piezas' && (stockRead.loading || stockRead.error))) {
      setError('Completa la carga de los datos antes de guardar. Se conservan los cambios de este borrador.');
      return null;
    }
    if (piezasInsuficientes(piezas).length) {
      setError(
        'Verifica el stock no disponible. Para piezas con stock insuficiente, usa compra externa o reduce la cantidad.',
      );
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const kmValue = km.trim() === '' ? null : Number(km);
      const updated = await api<VisitaDetalle>(`/visitas/${visita.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({
          choferId: choferId || null,
          km: Number.isFinite(kmValue as number) ? kmValue : null,
          tipo: tipo || null,
          observaciones: observaciones.trim() || null,
          trabajos: payloadTrabajos,
          fotos: fotos.map((dataUrl) => ({ dataUrl })),
          firmas: [
            ...(firmaChofer ? [{ tipo: 'CHOFER', dataUrl: firmaChofer }] : []),
            ...(firmaJefe ? [{ tipo: 'JEFE', dataUrl: firmaJefe }] : []),
          ],
          piezas: piezas.map((linea) => ({
            itemId: linea.itemId,
            qty: linea.qty,
            origen: linea.origen,
          })),
          ...extra,
        }),
      });
      onChange(updated);
      return updated;
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo guardar el borrador.',
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function continuar() {
    if (step === 'datos') {
      if (sinChoferesActivos) {
        setError(
          'No hay choferes activos. Pide alta o reactivación a administración.',
        );
        return;
      }
    }
    if (step === 'piezas' && piezasInsuficientes(piezas).length) {
      setError(
        'Verifica el stock no disponible. Para piezas con stock insuficiente, usa compra externa o reduce la cantidad.',
      );
      return;
    }
    const saved = await persist();
    if (!saved) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  async function cerrar() {
    setConfirmOpen(false);
    const saved = await persist();
    if (!saved) return;
    setSaving(true);
    try {
      const closed = await api<VisitaDetalle>(`/visitas/${visita.id}/cerrar`, {
        role: role!,
        userId,
        method: 'POST',
      });
      onChange(closed);
      router.push(hubHref);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo cerrar la visita.',
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleTrabajo(categoria: string, item: string) {
    const key = `${categoria}::${item}`;
    setTrabajos((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function addFoto(file: File) {
    const dataUrl = await readFile(file);
    setFotos((current) => [...current, dataUrl].slice(0, 8));
  }

  const faltantes: string[] = [];
  if (!choferId) faltantes.push('Chofer del catálogo');
  if (km.trim() === '') faltantes.push('Kilometraje');
  if (!tipo) faltantes.push('Tipo predictivo o correctivo');
  if (trabajos.size < 1) faltantes.push('Al menos un trabajo');
  if (!firmaChofer || !firmaJefe) faltantes.push('Firmas de chofer y jefe de mecánicos / taller');
  const bloqueoStock = piezasInsuficientes(piezas);
  if (bloqueoStock.length) {
    faltantes.push('Piezas con stock no disponible o insuficiente (verifique stock; para faltantes use compra externa o reduzca la cantidad)');
  }

  const choferNombre =
    choferes.find((c) => c.id === choferId)?.nombre ?? visita.chofer?.nombre;

  return (
    <div className="wo-wizard">
      <PageHeader
        kicker={visita.estado === 'CERRADO' ? 'Orden cerrada' : 'Orden de mantenimiento'}
        title={
          <span className="inline-flex items-center gap-2">
            {visita.unidadNumeroInterno}
            <Badge variant="warning">{visita.openedAt ? 'Abierta' : 'Borrador'}</Badge>
          </span>
        }
        lede={
          <>
            {etiquetaTipoVisita(tipo || visita.tipo)}
            {' · '}
            {km.trim()
              ? `${Number(km).toLocaleString('es-MX')} km`
              : formatKm(visita.km)}
            {choferNombre ? ` · ${choferNombre}` : ''}
            {' · '}
            Último km cerrado:{' '}
            {ultimoKm != null
              ? `${ultimoKm.toLocaleString('es-MX')} km`
              : hubRead.data ? 'Sin registro' : hubRead.loading ? 'Cargando…' : 'No disponible'}
          </>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="compact"
            disabled={saving || !relacionesListas}
            onClick={() =>
              void persist().then((saved) => {
                if (saved) router.push(hubHref);
              })
            }
          >
            Guardar y salir
          </Button>
        }
      />

      {error ? <FormAlert>{error}</FormAlert> : null}
      <ReadStatus loading={driversRead.loading} error={driversRead.error} loadingText="Cargando choferes…" errorText="No se pudieron cargar los choferes." retry={driversRead.retry} retryLabel="Reintentar choferes" />
      <ReadStatus loading={catalogRead.loading} error={catalogRead.error} loadingText="Cargando trabajos…" errorText="No se pudo cargar el catálogo de trabajos." retry={catalogRead.retry} retryLabel="Reintentar trabajos" />
      <ReadStatus loading={hubRead.loading} error={hubRead.error} loadingText="Cargando kilometraje anterior…" errorText="No se pudo consultar el kilometraje anterior." retry={hubRead.retry} retryLabel="Reintentar kilometraje" />
      <ReadStatus loading={piecesRead.loading && visita.piezas.length > 0} error={piecesRead.error} loadingText="Cargando piezas guardadas…" errorText="No se pudieron cargar los datos de las piezas guardadas. Se conservan cantidades y origen." retry={piecesRead.retry} retryLabel="Reintentar piezas guardadas" />
      {step === 'piezas' ? <ReadStatus loading={stockRead.loading} error={stockRead.error} loadingText="Actualizando stock de las piezas…" errorText="No se pudo actualizar el stock de las piezas." retry={stockRead.retry} retryLabel="Reintentar stock" /> : null}

      <VisitStepper
        steps={STEPS}
        currentIndex={stepIndex}
        onSelect={(index) =>
          void persist().then((saved) => {
            if (saved) setStep(STEPS[index].id);
          })
        }
      />

      {step === 'datos' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Datos</h2>
          {sinChoferesActivos ? (
            <Note variant="warn">
              No hay choferes activos. Pide alta o reactivación a administración.
            </Note>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Chofer" htmlFor="choferId">
              <NativeSelect
                id="choferId"
                value={choferId}
                onChange={(e) => setChoferId(e.target.value)}
                disabled={!choferesListos || sinChoferesActivos}
              >
                <option value="">Seleccione un chofer</option>
                {choferes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Kilometraje" htmlFor="km">
              <Input
                id="km"
                type="number"
                min={ultimoKm ?? 0}
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder={ultimoKm != null ? `Mínimo ${ultimoKm}` : '0'}
              />
            </Field>
            <Field label="Tipo de visita" htmlFor="tipo">
              <NativeSelect
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoVisita | '')}
              >
                <option value="">Seleccione</option>
                <option value="PREDICTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
              </NativeSelect>
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 'trabajos' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Trabajos A–E</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Marque al menos un trabajo para poder cerrar.
          </p>
          <div className="checklist mt-3">
            {catalogo.map((cat) => (
              <fieldset key={cat.categoria}>
                <legend>
                  {cat.categoria}. {cat.nombre}
                </legend>
                {cat.items.map((item) => {
                  const key = `${cat.categoria}::${item}`;
                  return (
                    <label key={key} className="check">
                      <input
                        type="checkbox"
                        checked={trabajos.has(key)}
                        onChange={() => toggleTrabajo(cat.categoria, item)}
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 'observaciones' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Observaciones</h2>
          <p className="mt-1 text-xs text-muted-foreground">Opcional.</p>
          <div className="mt-3">
            <Field label="Notas de la visita" htmlFor="observaciones">
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Hallazgos, refacciones o acuerdos con el chofer"
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 'fotos' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Fotos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional. Hasta 8 imágenes.
          </p>
          <div className="mt-3">
            <ImageDropzone
              label="Tomar o subir"
              hint="Cámara o galería · máx. 8"
              disabled={fotos.length >= 8}
              onFile={(file) => void addFoto(file)}
            />
          </div>
          {fotos.length === 0 ? (
            <p className="muted mt-3">Sin fotos todavía.</p>
          ) : (
            <div className="photo-grid">
              {fotos.map((src, index) => (
                <div key={`${index}-${src.slice(0, 24)}`} className="photo-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${index + 1}`} />
                  <Button
                    type="button"
                    variant="destructive"
                    size="compact"
                    onClick={() =>
                      setFotos((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {step === 'piezas' ? (
        <PiezasStep
          role={role!}
          userId={userId}
          tipoVehiculoId={visita.tipoVehiculoId}
          tipoVehiculoNombre={visita.tipoVehiculoNombre}
          lineas={piezas}
          onChange={setPiezas}
        />
      ) : null}

      {step === 'firmas' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Firmas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Se requieren las dos firmas para cerrar.
          </p>
          <div className="firmas-grid mt-3">
            <SignaturePad
              label="Firma del chofer"
              value={firmaChofer || null}
              onChange={setFirmaChofer}
            />
            <SignaturePad
              label="Jefe de mecánicos / taller"
              value={firmaJefe || null}
              onChange={setFirmaJefe}
            />
          </div>
        </Card>
      ) : null}

      {step === 'confirmar' ? (
        <Card className="p-3">
          <h2 className="text-[13px] font-semibold">Confirmar cierre</h2>
          <dl className="dl mt-3">
            <dt>Chofer</dt>
            <dd>{choferes.find((c) => c.id === choferId)?.nombre ?? 'Sin chofer'}</dd>
            <dt>Kilometraje</dt>
            <dd>{km.trim() ? `${Number(km).toLocaleString('es-MX')} km` : 'Sin km'}</dd>
            <dt>Tipo</dt>
            <dd>{etiquetaTipoVisita(tipo || null)}</dd>
            <dt>Trabajos</dt>
            <dd>{trabajos.size}</dd>
            <dt>Fotos</dt>
            <dd>{fotos.length}</dd>
            <dt>Piezas</dt>
            <dd>
              {piezas.length === 0 ? 'Ninguna' : resumenOrigenPiezas(piezas)}
            </dd>
          </dl>
          {faltantes.length ? (
            <Note variant="warn">Falta para cerrar: {faltantes.join('; ')}.</Note>
          ) : (
            <Note>La visita está lista para cerrarse.</Note>
          )}
        </Card>
      ) : null}

      <div className="wizard-actions">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep(STEPS[stepIndex - 1].id)}
          >
            Atrás
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={hubHref}>Cancelar</Link>
          </Button>
        )}
        {step !== 'confirmar' ? (
          <Button
            type="button"
            disabled={
              saving || !relacionesListas ||
              (step === 'datos' && sinChoferesActivos) ||
              (step === 'piezas' && (stockRead.loading || Boolean(stockRead.error) || bloqueoStock.length > 0))
            }
            onClick={() => void continuar()}
          >
            {saving ? 'Guardando…' : 'Continuar'}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving || !relacionesListas || faltantes.length > 0}
            onClick={() => setConfirmOpen(true)}
          >
            {saving ? 'Cerrando…' : 'Cerrar visita'}
          </Button>
        )}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar visita</DialogTitle>
            <DialogDescription>
              Ya no se podrá editar. Los avisos de mantenimiento abiertos de esta unidad pasan a resueltos.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            {piezas.length === 0 ? (
              <li>Sin piezas.</li>
            ) : (
              piezas.map((linea) => (
                <li key={linea.itemId}>
                  {linea.origen === 'DESDE_STOCK'
                    ? `${linea.sku} · ${linea.qty} ${etiquetaUom(linea.uom)} desde stock · quedarán ${linea.stock !== null ? linea.stock - linea.qty : 'no disponible'}`
                    : `${linea.sku} · ${linea.qty} ${etiquetaUom(linea.uom)} compra externa · no mueve existencias; abre por recibir`}
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void cerrar()}>
              {saving ? 'Cerrando…' : 'Cerrar visita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
