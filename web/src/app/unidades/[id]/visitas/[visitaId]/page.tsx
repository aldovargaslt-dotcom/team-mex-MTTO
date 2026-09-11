'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { SignaturePad } from '@/components/SignaturePad';
import { api, HttpError } from '@/lib/api';
import {
  etiquetaTipoVisita,
  formatFecha,
  formatKm,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  CatalogoCategoria,
  Chofer,
  TipoFirma,
  TipoVisita,
  VisitaDetalle,
} from '@/lib/types';

const STEPS = [
  { id: 'datos', label: 'Datos' },
  { id: 'trabajos', label: 'Trabajos' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'firmas', label: 'Firmas' },
  { id: 'confirmar', label: 'Confirmar' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function VisitaPage() {
  return (
    <RoleGate>
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
        <h2>No se encontró la visita</h2>
        <p className="muted">
          El borrador pudo haberse eliminado o no está visible para este rol.
        </p>
        <Link className="btn btn-primary" href={`/unidades/${params.id}`}>
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
  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted">Visita {visita.estado === 'CERRADO' ? 'cerrada' : 'en borrador'}</p>
          <h1>
            {visita.unidadNumeroInterno} · {etiquetaTipoVisita(visita.tipo)}
          </h1>
          <p className="lede">
            {formatKm(visita.km)}
            {visita.chofer ? ` · ${visita.chofer.nombre}` : ''}
            {visita.cerradoAt ? ` · ${formatFecha(visita.cerradoAt)}` : ''}
          </p>
        </div>
        <Link className="btn btn-secondary" href={`/unidades/${unidadId}`}>
          Volver al hub
        </Link>
      </div>

      <section className="card panel">
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

      <section className="card panel" style={{ marginTop: 12 }}>
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

      <section className="card panel" style={{ marginTop: 12 }}>
        <h2>Observaciones</h2>
        <p>{visita.observaciones || 'Sin observaciones.'}</p>
      </section>

      <section className="card panel" style={{ marginTop: 12 }}>
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

      <section className="card panel" style={{ marginTop: 12 }}>
        <h2>Firmas</h2>
        <div className="firmas-grid">
          {(['CHOFER', 'JEFE'] as TipoFirma[]).map((tipo) => {
            const firma = visita.firmas.find((f) => f.tipo === tipo);
            return (
              <div key={tipo}>
                <p className="muted">
                  {tipo === 'CHOFER' ? 'Chofer' : 'Jefe'}
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ultimoKm, setUltimoKm] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [lista, cats, hub] = await Promise.all([
          api<Chofer[]>('/choferes', { role: role!, userId }),
          api<CatalogoCategoria[]>('/catalogo/trabajos', { role: role!, userId }),
          api<{ fichaCorta: { ultimoKm: number | null } }>(
            `/unidades/${unidadId}/hub`,
            { role: role!, userId },
          ),
        ]);
        setChoferes(lista);
        setCatalogo(cats);
        setUltimoKm(hub.fichaCorta.ultimoKm);
      } catch (err) {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar los catálogos.',
        );
      }
    })();
  }, [role, userId, unidadId]);

  const sinChoferes = choferes.length === 0;
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
      if (sinChoferes) {
        setError('No hay choferes. Pide alta a administración.');
        return;
      }
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
  if (!firmaChofer || !firmaJefe) faltantes.push('Firmas de chofer y jefe');

  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted">Nueva visita · {visita.unidadNumeroInterno}</p>
          <h1>Visita en borrador</h1>
          <p className="lede">
            Último km cerrado:{' '}
            {ultimoKm != null ? `${ultimoKm.toLocaleString('es-MX')} km` : 'Sin registro'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving}
          onClick={() =>
            void persist().then((saved) => {
              if (saved) router.push(`/unidades/${unidadId}`);
            })
          }
        >
          Guardar y salir
        </button>
      </div>

      <ol className="steps">
        {STEPS.map((item, index) => (
          <li key={item.id} className={item.id === step ? 'active' : index < stepIndex ? 'done' : ''}>
            <button
              type="button"
              onClick={() =>
                void persist().then((saved) => {
                  if (saved) setStep(item.id);
                })
              }
            >
              {index + 1}. {item.label}
            </button>
          </li>
        ))}
      </ol>

      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}

      {step === 'datos' ? (
        <section className="card panel">
          <h2>Datos</h2>
          {sinChoferes ? (
            <p className="note note-warn">
              No hay choferes. Pide alta a administración.
            </p>
          ) : null}
          <div className="form-grid" style={{ padding: 0 }}>
            <div className="field">
              <label htmlFor="choferId">Chofer</label>
              <select
                id="choferId"
                value={choferId}
                onChange={(e) => setChoferId(e.target.value)}
                disabled={sinChoferes}
              >
                <option value="">Seleccione un chofer</option>
                {choferes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="km">Kilometraje</label>
              <input
                id="km"
                type="number"
                min={ultimoKm ?? 0}
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder={ultimoKm != null ? `Mínimo ${ultimoKm}` : '0'}
              />
            </div>
            <div className="field">
              <label htmlFor="tipo">Tipo de visita</label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoVisita | '')}
              >
                <option value="">Seleccione</option>
                <option value="PREDICTIVO">Predictivo</option>
                <option value="CORRECTIVO">Correctivo</option>
              </select>
            </div>
          </div>
        </section>
      ) : null}

      {step === 'trabajos' ? (
        <section className="card panel">
          <h2>Trabajos A–E</h2>
          <p className="muted">Marque al menos un trabajo para poder cerrar.</p>
          <div className="checklist">
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
                      {item}
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}

      {step === 'observaciones' ? (
        <section className="card panel">
          <h2>Observaciones</h2>
          <p className="muted">Opcional.</p>
          <div className="field">
            <label htmlFor="observaciones">Notas de la visita</label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Hallazgos, refacciones o acuerdos con el chofer"
            />
          </div>
        </section>
      ) : null}

      {step === 'fotos' ? (
        <section className="card panel">
          <h2>Fotos</h2>
          <p className="muted">Opcional. Hasta 8 imágenes.</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addFoto(file);
              e.target.value = '';
            }}
          />
          {fotos.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Sin fotos todavía.
            </p>
          ) : (
            <div className="photo-grid">
              {fotos.map((src, index) => (
                <div key={`${index}-${src.slice(0, 24)}`} className="photo-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${index + 1}`} />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() =>
                      setFotos((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === 'firmas' ? (
        <section className="card panel">
          <h2>Firmas</h2>
          <p className="muted">Se requieren las dos firmas para cerrar.</p>
          <div className="firmas-grid">
            <SignaturePad
              label="Firma del chofer"
              value={firmaChofer || null}
              onChange={setFirmaChofer}
            />
            <SignaturePad
              label="Firma del jefe"
              value={firmaJefe || null}
              onChange={setFirmaJefe}
            />
          </div>
        </section>
      ) : null}

      {step === 'confirmar' ? (
        <section className="card panel">
          <h2>Confirmar cierre</h2>
          <dl className="dl">
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
          </dl>
          {faltantes.length ? (
            <p className="note note-warn">
              Falta para cerrar: {faltantes.join('; ')}.
            </p>
          ) : (
            <p className="note">La visita está lista para cerrarse.</p>
          )}
        </section>
      ) : null}

      <div className="wizard-actions">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep(STEPS[stepIndex - 1].id)}
          >
            Atrás
          </button>
        ) : (
          <Link className="btn btn-secondary" href={`/unidades/${unidadId}`}>
            Cancelar
          </Link>
        )}
        {step !== 'confirmar' ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || (step === 'datos' && sinChoferes)}
            onClick={() => void continuar()}
          >
            {saving ? 'Guardando…' : 'Continuar'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || faltantes.length > 0}
            onClick={() => void cerrar()}
          >
            {saving ? 'Cerrando…' : 'Cerrar visita'}
          </button>
        )}
      </div>
    </>
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
