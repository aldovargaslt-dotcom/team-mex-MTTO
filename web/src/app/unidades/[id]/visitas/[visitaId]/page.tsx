'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { SignaturePad } from '@/components/SignaturePad';
import {
  PiezasReadonly,
  PiezasStep,
  hydratePiezasFromInventario,
  piezasInsuficientes,
  type PiezaLinea,
} from '@/components/PiezasStep';
import { api, HttpError } from '@/lib/api';
import { ImageDropzone } from '@/components/ImageDropzone';
import { VisitStepper } from '@/components/VisitStepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FormAlert, Note, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect, Textarea } from '@/components/ui/input';
import {
  etiquetaEstadoVisita,
  etiquetaTipoVisita,
  formatFecha,
  formatKm,
  resumenOrigenPiezas,
} from '@/lib/format';
import { useRole } from '@/lib/role';
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
  const { role, userId, isAdmin } = useRole();
  const [visita, setVisita] = useState<VisitaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!role || !params.visitaId) return;
    void (async () => {
      try {
        setVisita(
          await api<VisitaDetalle>(`/visitas/${params.visitaId}`, {
            role,
            userId,
          }),
        );
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof HttpError
              ? err.message
              : 'No se pudo cargar la visita.',
          );
        }
      }
    })();
  }, [params.visitaId, role, userId]);

  if (notFound) {
    return (
      <div className="empty-state">
        <h2>No se encontró la visita.</h2>
        <Link className="btn btn-outline" href={`/unidades/${params.id}`}>
          Volver al hub
        </Link>
      </div>
    );
  }

  if (error && !visita) {
    return (
      <div className="error-state">
        <h2>No se pudo abrir la visita</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!visita) {
    return <p className="muted">Cargando visita…</p>;
  }

  if (visita.estado === 'CERRADO' || isAdmin) {
    return <VisitaReadonly visita={visita} unidadId={params.id} />;
  }

  return (
    <VisitWizard
      unidadId={params.id}
      visita={visita}
      onChange={setVisita}
    />
  );
}

function VisitaReadonly({
  visita,
  unidadId,
}: {
  visita: VisitaDetalle;
  unidadId: string;
}) {
  const { role, userId } = useRole();
  const [piezas, setPiezas] = useState<PiezaLinea[]>([]);

  useEffect(() => {
    if (!role) return;
    void hydratePiezasFromInventario(visita.piezas ?? [], { role, userId })
      .then(setPiezas)
      .catch(() => setPiezas([]));
  }, [role, userId, visita.piezas]);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {visita.unidadNumeroInterno}
            <Badge variant={visita.estado === 'CERRADO' ? 'success' : 'warning'}>
              {etiquetaEstadoVisita(visita.estado)}
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
            <Link href={`/unidades/${unidadId}`}>Volver al hub</Link>
          </Button>
        }
      />

      <Card className="p-3">
        <h2 className="text-[13px] font-semibold">Datos</h2>
        <dl className="dl mt-2">
          <dt>Chofer</dt>
          <dd>{visita.chofer?.nombre ?? 'Sin chofer'}</dd>
          <dt>Kilometraje</dt>
          <dd>{formatKm(visita.km)}</dd>
          <dt>Tipo</dt>
          <dd>{etiquetaTipoVisita(visita.tipo)}</dd>
        </dl>
      </Card>

      <Card className="mt-3 p-3">
        <h2 className="text-[13px] font-semibold">Trabajos</h2>
        {visita.trabajos.length === 0 ? (
          <p className="muted mt-2">No se registraron trabajos.</p>
        ) : (
          <ul className="plain-list mt-2">
            {visita.trabajos.map((t) => (
              <li key={t.id}>
                <span className="cat">{t.categoria}</span> {t.item}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-3 p-3">
        <h2 className="text-[13px] font-semibold">Observaciones</h2>
        <p className="mt-2">{visita.observaciones || 'Sin observaciones.'}</p>
      </Card>

      <Card className="mt-3 p-3">
        <h2 className="text-[13px] font-semibold">Fotos</h2>
        {visita.fotos.length === 0 ? (
          <p className="muted mt-2">Sin fotos.</p>
        ) : (
          <div className="photo-grid">
            {visita.fotos.map((foto) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={foto.id} src={foto.dataUrl} alt="Foto de la visita" />
            ))}
          </div>
        )}
      </Card>

      <PiezasReadonly piezas={piezas} />

      <Card className="mt-3 p-3">
        <h2 className="text-[13px] font-semibold">Firmas</h2>
        <div className="firmas-grid mt-2">
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
      </Card>
    </>
  );
}

function VisitWizard({
  unidadId,
  visita,
  onChange,
}: {
  unidadId: string;
  visita: VisitaDetalle;
  onChange: (visita: VisitaDetalle) => void;
}) {
  const { role, userId } = useRole();
  const router = useRouter();
  const [step, setStep] = useState<StepId>('datos');
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [choferesListos, setChoferesListos] = useState(false);
  const [catalogo, setCatalogo] = useState<CatalogoCategoria[]>([]);
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
  const [piezas, setPiezas] = useState<PiezaLinea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ultimoKm, setUltimoKm] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [lista, cats, hub] = await Promise.all([
          api<Chofer[]>('/choferes?estado=ACTIVO', { role: role!, userId }),
          api<CatalogoCategoria[]>('/catalogo/trabajos', { role: role!, userId }),
          api<{ fichaCorta: { ultimoKm: number | null } }>(
            `/unidades/${unidadId}/hub`,
            { role: role!, userId },
          ),
        ]);
        setChoferes(lista);
        setChoferesListos(true);
        setCatalogo(cats);
        setUltimoKm(hub.fichaCorta.ultimoKm);
        setPiezas(
          await hydratePiezasFromInventario(visita.piezas ?? [], {
            role: role!,
            userId,
          }),
        );
      } catch (err) {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar los catálogos.',
        );
      }
    })();
  }, [role, userId, unidadId, visita.piezas]);

  useEffect(() => {
    if (!choferesListos) return;
    if (choferId && !choferes.some((c) => c.id === choferId)) {
      setChoferId('');
    }
  }, [choferes, choferesListos, choferId]);

  useEffect(() => {
    if (step !== 'piezas' || !visita.tipoVehiculoId || !role) return;
    void (async () => {
      try {
        const data = await api<SkuCompatible[]>(
          `/inventario/skus?tipoVehiculoId=${visita.tipoVehiculoId}`,
          { role, userId },
        );
        const stockById = new Map(data.map((item) => [item.id, item.stock]));
        setPiezas((current) =>
          current.map((linea) =>
            stockById.has(linea.itemId)
              ? { ...linea, stock: stockById.get(linea.itemId)! }
              : linea,
          ),
        );
      } catch {
        /* el paso Piezas muestra su propio error de búsqueda */
      }
    })();
  }, [step, visita.tipoVehiculoId, role, userId]);

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
        'Hay piezas que superan el stock. Use compra externa o reduzca la cantidad.',
      );
      return;
    }
    const saved = await persist();
    if (!saved) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  async function cerrar() {
    if (
      !window.confirm('¿Cerrar la visita? Ya no se podrá editar.')
    ) {
      return;
    }
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
      router.push(`/unidades/${unidadId}`);
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
    faltantes.push('Piezas con stock insuficiente (compra externa o reduzca qty)');
  }

  const choferNombre =
    choferes.find((c) => c.id === choferId)?.nombre ?? visita.chofer?.nombre;

  return (
    <div className="wo-wizard">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {visita.unidadNumeroInterno}
            <Badge variant="warning">Borrador</Badge>
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
              : 'Sin registro'}
          </>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="compact"
            disabled={saving}
            onClick={() =>
              void persist().then((saved) => {
                if (saved) router.push(`/unidades/${unidadId}`);
              })
            }
          >
            Guardar y salir
          </Button>
        }
      />

      {error ? <FormAlert>{error}</FormAlert> : null}

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
                disabled={sinChoferesActivos}
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
                <option value="PREDICTIVO">Predictivo</option>
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
            <Link href={`/unidades/${unidadId}`}>Cancelar</Link>
          </Button>
        )}
        {step !== 'confirmar' ? (
          <Button
            type="button"
            disabled={
              saving ||
              (step === 'datos' && sinChoferesActivos) ||
              (step === 'piezas' && bloqueoStock.length > 0)
            }
            onClick={() => void continuar()}
          >
            {saving ? 'Guardando…' : 'Continuar'}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving || faltantes.length > 0}
            onClick={() => void cerrar()}
          >
            {saving ? 'Cerrando…' : 'Cerrar visita'}
          </Button>
        )}
      </div>
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
