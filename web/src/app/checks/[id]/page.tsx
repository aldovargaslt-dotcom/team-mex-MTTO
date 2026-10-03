'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormAlert } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import { SignaturePad } from '@/components/SignaturePad';

type Detail = { id: string; folio: string; status: string; version: number; assignedActor: string | null; result?: string | null; reviewedVersion?: number | null; reviewedHash?: string | null; snapshotHash?: string | null; completedAt?: string | null; signatureContentPath?: string | null; validity?: { valid: boolean; expired: boolean; invalidated: boolean } | null };
type Config = { positions: string[]; version: number; normalMin: number; normalMax: number; criticalMin: number; criticalMax: number };
type Evidence = { id: string; tags: string[]; bytes: number; contentPath: string };
type EvidenceList = { items: Evidence[]; count: number; coverage: { complete: boolean }; ready: boolean };
type Finding = { id: string; sourceKey: string; severity: 'OBSERVATION' | 'HARD_BLOCKER'; details: Record<string, unknown>; classification: string | null; preparedContext: Record<string, unknown> | null };
type FindingsList = { items: Finding[]; complete: boolean; version: number };
type Review = { reviewedVersion: number; reviewedHash: string; result: string; exceptions: Array<{ id: string; sourceKey: string; severity: string; classification: string }> };
type Completion = { status: string; version: number; completedAt: string; result: string; snapshotHash: string; correctiveIds: string[]; signatureContentPath: string };
const FLUIDS = ['oil', 'coolant', 'washerFluid', 'leaks'] as const;
const TAGS = ['ODOMETER', 'FUEL', 'WITNESSES'] as const;

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function PrivateEvidencePreview({ item, role, userId }: { item: Evidence; role: string; userId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(`/backend${item.contentPath}`, { headers: { 'X-Role': role, 'X-User-Id': userId } })
      .then((response) => { if (!response.ok) throw new Error('preview'); return response.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setSrc(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.contentPath, role, userId]);
  return src
    ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Evidencia ${item.tags.join(', ')}`} className="aspect-video w-full rounded-md object-cover" />
    </>
    : <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">Vista privada</div>;
}

function PrivateSignaturePreview({ path, role, userId }: { path: string; role: string; userId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(`/backend${path}`, { headers: { 'X-Role': role, 'X-User-Id': userId } })
      .then((response) => { if (!response.ok) throw new Error('signature'); return response.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setSrc(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, role, userId]);
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="signature-img" src={src} alt="Firma atribuida del CHECK" />
    : <p className="text-sm text-muted-foreground">Firma privada no disponible.</p>;
}

export default function CheckPage() {
  const { id } = useParams<{ id: string }>();
  const { role, userId } = useRole();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [evidence, setEvidence] = useState<EvidenceList | null>(null);
  const [findings, setFindings] = useState<FindingsList | null>(null);
  const [classifications, setClassifications] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'condition' | 'evidence' | 'findings' | 'review'>('condition');
  const [review, setReview] = useState<Review | null>(null);
  const [signature, setSignature] = useState<string>('');
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [completionKey] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}`);
  const [fluids, setFluids] = useState<Record<string, string>>({ oil: 'OK', coolant: 'OK', washerFluid: 'OK', leaks: 'OK' });
  const [psi, setPsi] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!role || !id) return;
    try {
      const next = await api<Detail>(`/checks/${id}`, { role, userId });
      const [policy, photos, nextFindings] = await Promise.all([
        role === 'MECANICO' && next.status !== 'COMPLETED'
          ? api<Config>(`/checks/${id}/condition-config`, { role, userId })
          : Promise.resolve(null),
        api<EvidenceList>(`/checks/${id}/evidence`, { role, userId }),
        api<FindingsList>(`/checks/${id}/findings`, { role, userId }),
      ]);
      setDetail(next); setConfig(policy); setEvidence(photos); setFindings(nextFindings);
      setClassifications(Object.fromEntries(nextFindings.items.filter((item) => item.classification).map((item) => [item.id, item.classification as string])));
      if (next.status === 'COMPLETED' && next.result && next.snapshotHash) {
        setStep('review');
      }
      setError(null);
    } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo cargar el CHECK.'); }
  }, [id, role, userId]);
  useEffect(() => { void load(); }, [load]);

  async function saveCondition(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !config) return;
    setSaving(true); setError(null);
    try {
      const result = await api<{ version: number }>(`/checks/${id}/condition`, {
        role: role!, userId, method: 'PATCH', body: JSON.stringify({
          expectedVersion: detail.version,
          payload: { fluids: Object.fromEntries(FLUIDS.map((key) => [key, { status: fluids[key] }])), tires: config.positions.map((position) => ({ position, psi: Number(psi[position]), condition: 'OK' })) },
        }),
      });
      setDetail({ ...detail, version: result.version }); setStep('evidence');
    } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo guardar la condición.'); }
    finally { setSaving(false); }
  }

  async function uploadEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !file || !tags.length) return;
    setSaving(true); setError(null);
    let reservationId: string | null = null;
    try {
      const reservation = await api<{ reservationId: string; version: number }>(`/checks/${id}/evidence/uploads`, { role: role!, userId, method: 'POST', body: JSON.stringify({ tags, expectedVersion: detail.version }) });
      reservationId = reservation.reservationId;
      const registered = await api<{ version: number }>(`/checks/${id}/evidence`, { role: role!, userId, method: 'POST', body: JSON.stringify({ reservationId, tags, dataUrl: await readDataUrl(file), expectedVersion: reservation.version }) });
      setDetail({ ...detail, version: registered.version }); setFile(null); setTags([]); await load(); setStep('evidence');
    } catch (err) {
      if (reservationId) await api(`/checks/${id}/evidence/${reservationId}`, { role: role!, userId, method: 'DELETE' }).catch(() => undefined);
      setError(err instanceof HttpError ? err.message : 'No se pudo subir la evidencia.');
    } finally { setSaving(false); }
  }

  async function classify(finding: Finding) {
    const classification = classifications[finding.id];
    if (!detail || !classification) return;
    setSaving(true); setError(null);
    try {
      const result = await api<{ version: number }>(`/checks/${id}/findings/${finding.id}`, {
        role: role!, userId, method: 'PATCH', body: JSON.stringify({ classification, expectedVersion: detail.version }),
      });
      setDetail({ ...detail, version: result.version }); await load(); setStep('findings');
    } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo clasificar el hallazgo.'); }
    finally { setSaving(false); }
  }

  async function startReview() {
    if (!detail) return;
    setSaving(true); setError(null);
    try {
      const result = await api<Review>(`/checks/${id}/review`, {
        role: role!, userId, method: 'POST', body: JSON.stringify({ expectedVersion: detail.version }),
      });
      setReview(result);
      setDetail({ ...detail, version: result.reviewedVersion, result: result.result, reviewedVersion: result.reviewedVersion, reviewedHash: result.reviewedHash });
      setStep('review');
    } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo preparar la revisión.'); }
    finally { setSaving(false); }
  }

  async function completeCheck() {
    if (!review || !signature) return;
    setSaving(true); setError(null);
    try {
      const result = await api<Completion>(`/checks/${id}/complete`, {
        role: role!, userId, method: 'POST', body: JSON.stringify({
          idempotencyKey: completionKey,
          reviewedVersion: review.reviewedVersion,
          reviewedHash: review.reviewedHash,
          signatureDataUrl: signature,
          signatureWidth: 640,
          signatureHeight: 180,
          signatureMethod: 'TOUCH_CANVAS',
        }),
      });
      setCompletion(result);
      setDetail((current) => current ? { ...current, status: result.status, version: result.version, result: result.result, snapshotHash: result.snapshotHash, completedAt: result.completedAt, signatureContentPath: result.signatureContentPath } : current);
      await load();
    } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo completar el CHECK.'); }
    finally { setSaving(false); }
  }

  return <main className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CHECK · {step === 'condition' ? 'Condición' : step === 'evidence' ? 'Evidencia' : step === 'findings' ? 'Hallazgos' : 'Revisión y firma'}</p><h1 className="text-2xl font-semibold text-navy">{detail?.folio ?? 'Cargando…'}</h1><p className="text-sm text-muted-foreground">Paso {step === 'condition' ? '1' : step === 'evidence' ? '2' : step === 'findings' ? '3' : '4'} de 4</p></header>
    <FormAlert>{error}</FormAlert>
    {step === 'condition' && config ? <form className="space-y-5" onSubmit={saveCondition}>
      <section className="rounded-lg border bg-card p-4"><h2 className="font-semibold text-navy">A · Fluidos y fugas</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{FLUIDS.map((key) => <Field key={key} label={key === 'washerFluid' ? 'Limpiaparabrisas' : key === 'coolant' ? 'Refrigerante' : key === 'leaks' ? 'Fugas visibles' : 'Aceite motor'} htmlFor={`fluid-${key}`}><NativeSelect id={`fluid-${key}`} value={fluids[key]} onChange={(e) => setFluids({ ...fluids, [key]: e.target.value })}><option value="OK">Confirmado normal</option><option value="ANOMALY">Anomalía observada</option></NativeSelect></Field>)}</div></section>
      <section className="rounded-lg border bg-card p-4"><h2 className="font-semibold text-navy">B · Llantas y PSI</h2><p className="mt-1 text-sm text-muted-foreground">Rango normal {config.normalMin}–{config.normalMax}; crítico {config.criticalMin}–{config.criticalMax}. Política v{config.version}.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{config.positions.map((position) => <Field key={position} label={`PSI · ${position}`} htmlFor={`psi-${position}`}><Input id={`psi-${position}`} required type="number" step="0.1" min="0" value={psi[position] ?? ''} onChange={(e) => setPsi({ ...psi, [position]: e.target.value })} /></Field>)}</div></section>
      <Button type="submit" className="min-h-12 w-full" disabled={saving}>{saving ? 'Guardando…' : 'Continuar a evidencia'}</Button>
    </form> : null}
    {step === 'evidence' ? <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4"><h2 className="font-semibold text-navy">Evidencia fotográfica</h2><p className="mt-1 text-sm text-muted-foreground">Agrega entre 2 y 5 fotos READY. En conjunto deben cubrir odómetro, combustible y testigos.</p><p className="mt-3 text-sm">{evidence?.count ?? 0}/5 fotos · Cobertura {evidence?.coverage.complete ? 'completa' : 'pendiente'}</p></div>
      {evidence?.items.length && role ? <ul className="grid gap-3 sm:grid-cols-2">{evidence.items.map((item) => <li key={item.id} className="rounded-lg border bg-card p-3"><PrivateEvidencePreview item={item} role={role} userId={userId} /><p className="mt-2 text-xs text-muted-foreground">{item.tags.join(' · ')} · {Math.ceil(item.bytes / 1024)} KB</p></li>)}</ul> : null}
      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={uploadEvidence}><Field label="Foto" htmlFor="evidence-file"><Input id="evidence-file" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field><fieldset><legend className="text-sm font-medium">Esta foto cubre</legend><div className="mt-2 flex flex-wrap gap-3">{TAGS.map((tag) => <label key={tag} className="flex min-h-11 items-center gap-2 rounded-md border px-3"><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags(tags.includes(tag) ? tags.filter((value) => value !== tag) : [...tags, tag])} />{tag === 'ODOMETER' ? 'Odómetro' : tag === 'FUEL' ? 'Combustible' : 'Testigos'}</label>)}</div></fieldset><Button type="submit" className="min-h-12 w-full" disabled={saving || !file || !tags.length || (evidence?.count ?? 0) >= 5}>{saving ? 'Subiendo…' : 'Agregar evidencia'}</Button></form>
      <Button type="button" variant="secondary" className="min-h-12 w-full" disabled={!evidence?.ready} onClick={() => setStep('findings')}>Continuar a hallazgos</Button>
    </section> : null}
    {step === 'findings' ? <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4"><h2 className="font-semibold text-navy">Hallazgos derivados</h2><p className="mt-1 text-sm text-muted-foreground">Clasifica cada anomalía sin volver a capturarla. Elegir “Requiere trabajo” prepara la correctiva; no crea una OT todavía.</p></div>
      {findings?.items.length ? <ul className="space-y-3">{findings.items.map((finding) => <li key={finding.id} className="rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-navy">{finding.sourceKey.startsWith('fluid:') ? `Fluido/fuga · ${finding.sourceKey.slice(6)}` : `Llanta · ${finding.sourceKey.slice(5)}`}</p><p className="text-sm text-muted-foreground">Origen derivado de Condición · {finding.severity === 'HARD_BLOCKER' ? 'Bloqueo de seguridad' : 'Observación'}</p></div>{finding.preparedContext ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">Correctiva preparada</span> : null}</div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><NativeSelect aria-label={`Clasificación ${finding.sourceKey}`} value={classifications[finding.id] ?? ''} onChange={(event) => setClassifications({ ...classifications, [finding.id]: event.target.value })}><option value="">Selecciona clasificación</option><option value="OBSERVATION">Observación</option><option value="FIXED_DURING_CHECK">Corregido durante CHECK</option><option value="REQUIRES_WORK">Requiere trabajo</option></NativeSelect><Button type="button" className="min-h-11" disabled={saving || !classifications[finding.id]} onClick={() => void classify(finding)}>Guardar clasificación</Button></div>{finding.severity === 'HARD_BLOCKER' && classifications[finding.id] === 'FIXED_DURING_CHECK' ? <p className="mt-2 text-sm text-rose-800">La clasificación no elimina el bloqueo: la condición debe recapturarse con hechos verificados.</p> : null}</li>)}</ul> : <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No se derivaron hallazgos. Puedes continuar a revisión.</div>}
      <Button type="button" variant="secondary" className="min-h-12 w-full" disabled={!findings?.complete || saving} onClick={() => void startReview()}>{saving ? 'Preparando…' : 'Continuar a revisión'}</Button>
    </section> : null}
    {step === 'review' ? <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold text-navy">Dictamen del servidor</h2>
        <p className={`mt-2 text-xl font-semibold ${((completion?.result ?? review?.result ?? detail?.result) === 'UNFIT') ? 'text-rose-800' : 'text-emerald-800'}`}>{completion?.result ?? review?.result ?? detail?.result ?? 'Pendiente'}</p>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Hash: {completion?.snapshotHash ?? review?.reviewedHash ?? detail?.snapshotHash ?? detail?.reviewedHash}</p>
        <p className="mt-1 text-xs text-muted-foreground">Versión revisada: {review?.reviewedVersion ?? detail?.reviewedVersion ?? '—'}</p>
      </div>
      {review?.exceptions.length ? <div className="rounded-lg border bg-card p-4"><h3 className="font-semibold text-navy">Excepciones</h3><ul className="mt-2 space-y-2 text-sm">{review.exceptions.map((item) => <li key={item.id}>{item.sourceKey} · {item.severity} · {item.classification}</li>)}</ul></div> : null}
      {detail?.status === 'COMPLETED' || completion ? <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-navy">CHECK firmado · sólo lectura</h3>
        <p className="text-sm text-muted-foreground">Completado {completion?.completedAt || detail?.completedAt ? new Date(completion?.completedAt ?? detail?.completedAt ?? '').toLocaleString('es-MX') : ''}. El snapshot y sus evidencias ya no pueden editarse.</p>
        {role && (completion?.signatureContentPath ?? detail?.signatureContentPath) ? <PrivateSignaturePreview path={(completion?.signatureContentPath ?? detail?.signatureContentPath)!} role={role} userId={userId} /> : null}
        {detail?.validity ? <p className="text-sm">Vigencia: {detail.validity.invalidated ? 'Invalidado' : detail.validity.expired ? 'Expirado' : detail.validity.valid ? 'Vigente' : 'No vigente'}</p> : null}
        {completion?.correctiveIds.length ? <p className="text-sm">Correctivas creadas: {completion.correctiveIds.length}</p> : null}
      </div> : <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-navy">Firma atribuible</h3>
        <p className="text-sm text-muted-foreground">Firma dentro del recuadro. Al completar se sella exactamente el hash mostrado.</p>
        <SignaturePad value={signature} onChange={setSignature} label="Firma del mecánico" />
        <Button type="button" className="min-h-12 w-full" disabled={saving || !signature} onClick={() => void completeCheck()}>{saving ? 'Cerrando…' : 'Firmar y completar CHECK'}</Button>
      </div>}
    </section> : null}
  </main>;
}
