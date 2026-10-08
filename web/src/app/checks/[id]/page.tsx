'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FormAlert } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { api, authenticatedFetch, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import { SignaturePad } from '@/components/SignaturePad';
import { ImageDropzone } from '@/components/ImageDropzone';

type SignedSummary = { unit: UnitIdentity; condition: { payload: NonNullable<SavedCondition['condition']>['payload']; policy: Config }; findings: Finding[]; evidence: Array<Omit<Evidence, 'contentPath'>>; disposition: { result: string } };
type CorrectiveReference = { id: string; folio: string; sourceCheckId: string; findingId: string };
type Detail = { id: string; folio: string; unidadId: string; unit: Pick<UnitIdentity, 'numeroInterno' | 'placas'>; signedSummary: SignedSummary | null; correctives: CorrectiveReference[]; status: string; version: number; assignedActor: string | null; startedAt?: string | null; result?: string | null; reviewedVersion?: number | null; reviewedHash?: string | null; snapshotHash?: string | null; completedAt?: string | null; signatureContentPath?: string | null; validity?: { valid: boolean; expired: boolean; invalidated: boolean } | null };
type SavedCondition = { condition: { payload: { fluids?: Record<string, { status?: string }>; tires?: Array<{ position: string; psi: number }> }; progress: 'INCOMPLETE' | 'COMPLETE'; derivedResult: string | null } | null; version: number };
type Config = { positions: string[]; version: number; normalMin: number; normalMax: number; criticalMin: number; criticalMax: number };
type Evidence = { id: string; tags: string[]; bytes: number; contentPath: string };
type EvidenceList = { items: Evidence[]; count: number; coverage: { odometer: boolean; fuel: boolean; witnesses: boolean; complete: boolean }; ready: boolean };
type Finding = { id: string; sourceKey: string; severity: 'OBSERVATION' | 'HARD_BLOCKER'; details: Record<string, unknown>; classification: string | null; preparedContext: Record<string, unknown> | null };
type FindingsList = { items: Finding[]; complete: boolean; version: number };
type Review = { reviewedVersion: number; reviewedHash: string; result: string; exceptions: Array<{ id: string; sourceKey: string; severity: string; classification: string }> };
type Completion = { status: string; version: number; completedAt: string; result: string; snapshotHash: string; correctiveIds: string[]; signatureContentPath: string };
type UnitIdentity = { numeroInterno: string; placas: string; tipo?: { nombre: string } | null; marcaModelo?: string | null };
const STEPS = [
  { id: 'condition', label: 'Condición' },
  { id: 'evidence', label: 'Evidencia' },
  { id: 'findings', label: 'Hallazgos' },
  { id: 'review', label: 'Firma' },
] as const;
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
    authenticatedFetch(`/backend${item.contentPath}`, { headers: { 'X-Role': role, 'X-User-Id': userId } })
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
    authenticatedFetch(`/backend${path}`, { headers: { 'X-Role': role, 'X-User-Id': userId } })
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
  const [unit, setUnit] = useState<UnitIdentity | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [evidence, setEvidence] = useState<EvidenceList | null>(null);
  const [findings, setFindings] = useState<FindingsList | null>(null);
  const [classifications, setClassifications] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'condition' | 'evidence' | 'findings' | 'review'>('condition');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => new Set());
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
      if (next.status === 'COMPLETED') {
        if (!next.signedSummary) throw new Error('El resumen firmado no está disponible.');
        const signed = next.signedSummary;
        setDetail(next); setUnit(signed.unit); setConfig(signed.condition.policy);
        setFluids(Object.fromEntries(FLUIDS.map((key) => [key, signed.condition.payload.fluids?.[key]?.status ?? ''])));
        setPsi(Object.fromEntries((signed.condition.payload.tires ?? []).map((tire) => [tire.position, String(tire.psi)])));
        const signedPhotos = signed.evidence.map((item) => ({ ...item, contentPath: `/checks/${id}/evidence/${item.id}/content` }));
        const covers = (tag: string) => signedPhotos.some((item) => item.tags.includes(tag));
        const coverage = { odometer: covers('ODOMETER'), fuel: covers('FUEL'), witnesses: covers('WITNESSES'), complete: TAGS.every(covers) };
        setEvidence({ items: signedPhotos, count: signedPhotos.length, coverage, ready: signedPhotos.length >= 2 && signedPhotos.length <= 5 && coverage.complete });
        setFindings({ items: signed.findings, complete: true, version: next.version });
        setReview({ reviewedVersion: next.reviewedVersion!, reviewedHash: next.snapshotHash!, result: signed.disposition.result, exceptions: signed.findings.filter((item) => item.classification).map((item) => ({ id: item.id, sourceKey: item.sourceKey, severity: item.severity, classification: item.classification! })) });
        setCompletion(null); setSignature(''); setCompletedSteps(new Set(STEPS.map((item) => item.id))); setStep('review'); setError(null);
        return;
      }
      const [policy, photos, nextFindings, savedCondition] = await Promise.all([
        role === 'MECANICO' && next.status !== 'COMPLETED'
          ? api<Config>(`/checks/${id}/condition-config`, { role, userId })
          : Promise.resolve(null),
        api<EvidenceList>(`/checks/${id}/evidence`, { role, userId }),
        api<FindingsList>(`/checks/${id}/findings`, { role, userId }),
        role === 'MECANICO' && next.status !== 'COMPLETED'
          ? api<SavedCondition>(`/checks/${id}/condition`, { role, userId })
          : Promise.resolve(null),
      ]);
      setDetail(next); setConfig(policy); setEvidence(photos); setFindings(nextFindings);
      setUnit(next.unit);
      if (savedCondition?.condition) {
        setFluids((current) => Object.fromEntries(FLUIDS.map((key) => [key, savedCondition.condition?.payload.fluids?.[key]?.status ?? current[key]])));
        setPsi(Object.fromEntries((savedCondition.condition.payload.tires ?? []).map((tire) => [tire.position, String(tire.psi)])));
      }
      setClassifications(Object.fromEntries(nextFindings.items.filter((item) => item.classification).map((item) => [item.id, item.classification as string])));
      setCompletedSteps(() => {
        const done = new Set<string>();
        if (savedCondition?.condition?.progress === 'COMPLETE') done.add('condition');
        if (photos.ready) done.add('evidence');
        if (next.status === 'COMPLETED' || (next.reviewedVersion === next.version && next.reviewedHash)) {
          done.add('condition');
          done.add('evidence');
          done.add('findings');
        }
        return done;
      });
      if (next.reviewedVersion === next.version && next.reviewedHash && savedCondition?.condition?.derivedResult) {
        setReview({
          reviewedVersion: next.reviewedVersion,
          reviewedHash: next.reviewedHash,
          result: savedCondition.condition.derivedResult,
          exceptions: nextFindings.items.filter((item) => item.classification).map((item) => ({
            id: item.id,
            sourceKey: item.sourceKey,
            severity: item.severity,
            classification: item.classification!,
          })),
        });
        setStep('review');
      } else if (photos.ready) {
        setStep('findings');
      } else if (photos.count > 0) {
        setStep('evidence');
      } else if (savedCondition?.condition?.progress === 'COMPLETE') {
        setStep('evidence');
      } else {
        setStep('condition');
      }
      setError(null);
    } catch (err) {
      setDetail(null); setUnit(null); setConfig(null); setEvidence(null); setFindings(null); setReview(null); setCompletion(null); setSignature('');
      setError(err instanceof HttpError ? err.message : 'No se pudo cargar el CHECK.');
    }
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
      setDetail({ ...detail, version: result.version }); setCompletedSteps((current) => new Set(current).add('condition')); setReview(null); setSignature(''); setStep('evidence');
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
      setDetail({ ...detail, version: registered.version }); setReview(null); setSignature(''); setFile(null); setTags([]); await load(); setStep('evidence');
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
      setDetail({ ...detail, version: result.version }); setReview(null); setSignature(''); await load(); setStep('findings');
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
      setCompletedSteps((current) => new Set(current).add('findings'));
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

  function goToStep(next: typeof step) {
    if (STEPS.findIndex((item) => item.id === next) > STEPS.findIndex((item) => item.id === step)) return;
    setStep(next);
    if (next !== 'review') setSignature('');
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const compactFolio = detail?.folio.replace(/^(CHK-[0-9a-f]{8})-[0-9a-f-]+$/i, '$1…') ?? '—';
  const preparedFinding = detail?.status !== 'COMPLETED' && !completion ? findings?.items.find((finding) => finding.classification === 'REQUIRES_WORK' && finding.preparedContext) : undefined;
  const isCompleted = detail?.status === 'COMPLETED' || Boolean(completion);

  return <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1040px] space-y-3 px-3 pb-32 pt-3 sm:px-4">
    <header className="sticky top-0 z-20 -mx-3 border-b bg-background px-3 pb-3 pt-2 sm:-mx-4 sm:px-4">
      <div className="mx-auto max-w-[560px]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/mi-trabajo" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-navy hover:underline"><span aria-hidden>←</span> Volver a Mi trabajo</Link>
          <span className="text-xs text-muted-foreground">{detail?.startedAt ? `Iniciado ${new Date(detail.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Inspección de flota'}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3 border-t pt-2">
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold leading-6 text-navy">{unit?.numeroInterno ?? 'Chequeo operativo'}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{unit ? `${unit.tipo?.nombre ?? unit.marcaModelo ?? 'Unidad'} · ${unit.placas}` : 'Inspección de flota'} · <span title={detail?.folio}>Folio {compactFolio}</span></p>
          </div>
          {detail ? <Badge variant={isCompleted ? 'success' : 'warning'}>{isCompleted ? 'Completado' : detail.status === 'IN_PROGRESS' ? 'En progreso' : detail.status === 'ASSIGNED' ? 'Asignado' : detail.status === 'PENDING' ? 'Pendiente' : detail.status === 'CANCELLED' ? 'Cancelado' : detail.status}</Badge> : null}
        </div>
        {detail ? <nav className="mt-3 flex items-start gap-2" aria-label={`Paso ${stepIndex + 1} de 4: ${STEPS[stepIndex]?.label ?? ''}`}>
          {STEPS.map((item, index) => {
            const done = completedSteps.has(item.id) || (isCompleted && index < STEPS.length - 1);
            const active = index === stepIndex;
            const canGoBack = index < stepIndex;
            return <button key={item.id} type="button" onClick={() => canGoBack && goToStep(item.id)} disabled={!canGoBack || isCompleted} aria-current={active ? 'step' : undefined} className="min-h-11 min-w-0 flex-1 text-left disabled:cursor-default">
              <span className={`mb-1 block h-1 rounded-full ${active ? 'bg-primary' : done ? 'bg-emerald-700' : 'bg-border'}`} />
              <span className={`block truncate text-xs ${active ? 'font-semibold text-primary' : done ? 'text-emerald-800' : 'text-muted-foreground'}`}>{index + 1}. {item.label}</span>
            </button>;
          })}
        </nav> : null}
      </div>
    </header>
    <FormAlert>{error}</FormAlert>
    {error ? <Button type="button" variant="secondary" onClick={() => void load()}>Reintentar carga</Button> : null}
    {!detail ? <p className="text-sm text-muted-foreground" aria-live="polite">{error ? 'CHECK no disponible.' : 'Cargando CHECK…'}</p> : <>
    <div className="mx-auto w-full max-w-[560px]">
    {!detail && !error ? <p aria-live="polite" className="py-4 text-sm text-muted-foreground">Cargando datos del chequeo…</p> : null}
    {step === 'condition' && config ? <form id="check-condition-form" className="space-y-3" onSubmit={saveCondition}>
      <section className="rounded-md border bg-card p-3"><div className="mb-3 flex items-center justify-between border-b pb-2"><h2 className="text-[13px] font-semibold text-navy">A. Fluidos y fugas</h2></div><div className="grid gap-2 sm:grid-cols-2">{FLUIDS.map((key) => <Field key={key} label={key === 'washerFluid' ? 'Limpiaparabrisas' : key === 'coolant' ? 'Refrigerante' : key === 'leaks' ? 'Fugas visibles' : 'Aceite motor'} htmlFor={`fluid-${key}`}><NativeSelect id={`fluid-${key}`} value={fluids[key]} onChange={(e) => setFluids({ ...fluids, [key]: e.target.value })}><option value="OK">Confirmado normal</option><option value="ANOMALY">Anomalía observada</option></NativeSelect></Field>)}</div></section>
      <section className="rounded-md border bg-card p-3"><div className="mb-3 flex items-center justify-between border-b pb-2"><h2 className="text-[13px] font-semibold text-navy">B. Llantas y presión</h2><span className="text-xs text-muted-foreground">{config.positions.length} posiciones</span></div><p className="text-sm text-muted-foreground">Rango normal {config.normalMin}–{config.normalMax} PSI · crítico {config.criticalMin}–{config.criticalMax} · política v{config.version}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{config.positions.map((position) => <Field key={position} label={`PSI · ${position}`} htmlFor={`psi-${position}`}><Input id={`psi-${position}`} required type="number" step="0.1" min="0" value={psi[position] ?? ''} onChange={(e) => setPsi({ ...psi, [position]: e.target.value })} /></Field>)}</div></section>
    </form> : null}
    {step === 'evidence' ? <section className="space-y-4">
      <div className="rounded-md border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[13px] font-semibold text-navy">Cobertura de clúster</h2><p className="mt-1 text-sm text-muted-foreground">Fotos capturadas: {evidence?.count ?? 0} de 5 · Mínimo 2</p></div><Badge variant={evidence?.ready ? 'success' : 'warning'}>{evidence?.ready ? 'Válido' : 'Pendiente'}</Badge></div><div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-3"><span>Odómetro {evidence?.coverage.odometer ? '✓' : '·'}</span><span>Combustible {evidence?.coverage.fuel ? '✓' : '·'}</span><span>Testigos {evidence?.coverage.witnesses ? '✓' : '·'}</span></div></div>
      {evidence?.items.length && role ? <ul className="grid gap-3 sm:grid-cols-2">{evidence.items.map((item) => <li key={item.id} className="rounded-lg border bg-card p-3"><PrivateEvidencePreview item={item} role={role} userId={userId} /><p className="mt-2 text-xs text-muted-foreground">{item.tags.join(' · ')} · {Math.ceil(item.bytes / 1024)} KB</p></li>)}</ul> : null}
      <form className="space-y-3 rounded-md border bg-card p-3" onSubmit={uploadEvidence}><h3 className="text-[13px] font-semibold text-navy">Agregar fotografía</h3><ImageDropzone label="Tomar o subir una foto" hint="Cámara o galería · PNG, JPG o WEBP" disabled={saving || (evidence?.count ?? 0) >= 5} onFile={setFile} />{file ? <p className="truncate text-xs text-muted-foreground" title={file.name}>{file.name}</p> : null}<fieldset><legend className="text-sm font-medium">Esta foto cubre</legend><div className="mt-2 flex flex-wrap gap-2">{TAGS.map((tag) => <label key={tag} className="flex min-h-11 items-center gap-2 rounded-md border px-3"><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags(tags.includes(tag) ? tags.filter((value) => value !== tag) : [...tags, tag])} />{tag === 'ODOMETER' ? 'Odómetro' : tag === 'FUEL' ? 'Combustible' : 'Testigos'}</label>)}</div></fieldset><Button type="submit" variant="secondary" className="min-h-11 w-full" disabled={saving || !file || !tags.length || (evidence?.count ?? 0) >= 5}>{saving ? 'Subiendo…' : 'Agregar fotografía'}</Button></form>
    </section> : null}
    {step === 'findings' ? <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4"><h2 className="font-semibold text-navy">Hallazgos derivados</h2><p className="mt-1 text-sm text-muted-foreground">Clasifica cada anomalía sin volver a capturarla. Elegir “Requiere trabajo” prepara la correctiva; no crea una OT todavía.</p></div>
      {findings?.items.length ? <ul className="space-y-3">{findings.items.map((finding) => <li key={finding.id} className="rounded-md border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-navy">{finding.sourceKey.startsWith('fluid:') ? `Fluido/fuga · ${finding.sourceKey.slice(6)}` : `Llanta · ${finding.sourceKey.slice(5)}`}</p><p className="text-sm text-muted-foreground">Origen derivado de Condición · {finding.severity === 'HARD_BLOCKER' ? 'Bloqueo de seguridad' : 'Observación'}</p></div>{finding.preparedContext ? <span className="rounded-sm border border-orange-300 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-800">Correctiva preparada</span> : null}</div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><NativeSelect aria-label={`Clasificación ${finding.sourceKey}`} value={classifications[finding.id] ?? ''} onChange={(event) => setClassifications({ ...classifications, [finding.id]: event.target.value })}><option value="">Selecciona clasificación</option><option value="OBSERVATION">Observación</option><option value="FIXED_DURING_CHECK">Corregido durante CHECK</option><option value="REQUIRES_WORK">Requiere trabajo</option></NativeSelect><Button type="button" className="min-h-11" disabled={saving || !classifications[finding.id]} onClick={() => void classify(finding)}>Guardar clasificación</Button></div>{finding.preparedContext ? <div className="mt-3 rounded-sm border border-orange-300 bg-orange-50 p-3 text-sm"><p className="font-semibold text-orange-800">Se generará y vinculará la orden correctiva al firmar.</p><ul className="mt-2 space-y-1 text-muted-foreground"><li>Unidad: {unit?.numeroInterno ?? 'Unidad'}{unit?.placas ? ` (${unit.placas})` : ''}</li><li>Hallazgo: {finding.sourceKey.startsWith('fluid:') ? `Fuga o fluido · ${finding.sourceKey.slice(6)}` : `Llanta · ${finding.sourceKey.slice(5)}`}</li><li>Evidencia asociada: {Array.isArray(finding.preparedContext.evidenceRefs) ? finding.preparedContext.evidenceRefs.length : 0} fotos</li></ul><p className="mt-2 border-t border-orange-200 pt-2 text-xs text-muted-foreground">El diagnóstico y el método de reparación se definirán dentro de la Orden Correctiva.</p></div> : null}{finding.severity === 'HARD_BLOCKER' && classifications[finding.id] === 'FIXED_DURING_CHECK' ? <p className="mt-2 text-sm text-rose-800">La clasificación no elimina el bloqueo: la condición debe recapturarse con hechos verificados.</p> : null}</li>)}</ul> : <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No se derivaron hallazgos. Puedes continuar a revisión.</div>}
    </section> : null}
    {step === 'review' ? <section className="space-y-4">
      {review?.exceptions.length ? <section className="rounded-md border border-amber-300 bg-amber-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Hallazgo requiere atención</p><h2 className="mt-1 font-semibold text-navy">{review.exceptions.length} {review.exceptions.length === 1 ? 'hallazgo' : 'hallazgos'} · {review.exceptions.some((item) => item.classification === 'REQUIRES_WORK') ? (isCompleted ? 'trabajo requerido' : 'correctiva preparada') : 'clasificación registrada'}</h2><ul className="mt-2 space-y-2 text-sm text-foreground">{review.exceptions.map((item) => <li key={item.id}>{item.sourceKey.startsWith('fluid:') ? `Fluido o fuga · ${item.sourceKey.slice(6)}` : item.sourceKey} · {item.classification === 'REQUIRES_WORK' ? 'Requiere trabajo' : item.classification === 'FIXED_DURING_CHECK' ? 'Corregido durante CHECK' : 'Observación'}</li>)}</ul>{preparedFinding ? <div className="mt-3 border-t border-amber-200 pt-3 text-sm"><p className="font-semibold text-amber-900">La orden correctiva se generará al firmar y concluir este CHECK.</p><ul className="mt-2 space-y-1 text-muted-foreground"><li>Unidad: {unit?.numeroInterno ?? 'Unidad'}{unit?.placas ? ` (${unit.placas})` : ''}</li><li>Hallazgo: {preparedFinding.sourceKey.startsWith('fluid:') ? `Fuga o fluido · ${preparedFinding.sourceKey.slice(6)}` : `Llanta · ${preparedFinding.sourceKey.slice(5)}`}</li><li>Evidencia asociada: {Array.isArray(preparedFinding.preparedContext?.evidenceRefs) ? preparedFinding.preparedContext.evidenceRefs.length : evidence?.count ?? 0} fotos</li></ul></div> : null}</section> : null}
      <section className="rounded-md border bg-card p-3"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen congelado · solo lectura</h2><span className="text-xs text-muted-foreground">v{review?.reviewedVersion ?? detail?.reviewedVersion ?? '—'}</span></div><div className="mt-3 grid grid-cols-3 gap-2 border-y py-3 text-center text-xs"><span className="font-medium text-emerald-800">✓ Condición</span><span className="font-medium text-emerald-800">✓ Llantas</span><span className="font-medium text-emerald-800">✓ Evidencia</span></div><details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-navy">Ver detalles de inspección</summary><div className="space-y-3 border-t pt-3"><div><h3 className="text-xs font-semibold uppercase text-muted-foreground">Fluidos y fugas</h3><dl className="mt-2 space-y-2 text-sm">{FLUIDS.map((key) => <div key={key} className="flex justify-between gap-3"><dt>{key === 'washerFluid' ? 'Limpiaparabrisas' : key === 'coolant' ? 'Refrigerante' : key === 'leaks' ? 'Fugas visibles' : 'Aceite motor'}</dt><dd className={fluids[key] === 'OK' ? 'text-emerald-800' : 'text-amber-800'}>{fluids[key] === 'OK' ? 'Conforme' : fluids[key] ? 'Reportada' : 'Sin dato'}</dd></div>)}</dl></div><div><h3 className="text-xs font-semibold uppercase text-muted-foreground">Llantas y presión</h3><dl className="mt-2 grid grid-cols-2 gap-2 text-sm">{(config?.positions ?? Object.keys(psi)).map((position) => <div key={position} className="flex justify-between gap-2"><dt>{position}</dt><dd>{psi[position] ?? '—'} PSI</dd></div>)}</dl></div><div><h3 className="text-xs font-semibold uppercase text-muted-foreground">Evidencia del clúster</h3><p className="mt-1 text-sm">{evidence?.count ?? 0} fotos · {evidence?.ready ? 'Cobertura completa' : 'Cobertura pendiente'}</p><p className="mt-1 text-xs text-muted-foreground">Odómetro · Combustible · Testigos</p>{isCompleted && role ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{evidence?.items.map((item) => <li key={item.id}><PrivateEvidencePreview item={item} role={role} userId={userId} /></li>)}</ul> : null}</div></div></details></section>
      <div className="rounded-md border bg-card p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isCompleted ? 'Dictamen firmado' : 'Dictamen propuesto'}</p><h2 className={`mt-1 text-xl font-semibold ${((completion?.result ?? review?.result ?? detail?.result) === 'UNFIT') ? 'text-rose-800' : 'text-emerald-800'}`}>{(completion?.result ?? review?.result ?? detail?.result) === 'FIT' ? 'Apta' : (completion?.result ?? review?.result ?? detail?.result) === 'FIT_WITH_OBSERVATION' ? 'Apta con observación' : (completion?.result ?? review?.result ?? detail?.result) === 'UNFIT' ? 'No apta' : 'Pendiente'}</h2><p className="mt-1 text-xs text-muted-foreground">Resultado calculado por el servidor · {(completion?.result ?? review?.result ?? detail?.result ?? 'Pendiente')}</p><details className="mt-2 border-t pt-2"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-navy">Ver sello de revisión</summary><p className="break-all font-mono text-[11px] text-muted-foreground">Hash: {completion?.snapshotHash ?? review?.reviewedHash ?? detail?.snapshotHash ?? detail?.reviewedHash}</p></details></div>
      {detail?.status === 'COMPLETED' || completion ? <div className="space-y-3 rounded-md border bg-card p-3">
        <h3 className="font-semibold text-navy">CHECK firmado · sólo lectura</h3>
        <p className="text-sm text-muted-foreground">Completado {completion?.completedAt || detail?.completedAt ? new Date(completion?.completedAt ?? detail?.completedAt ?? '').toLocaleString('es-MX') : ''}. El snapshot y sus evidencias ya no pueden editarse.</p>
        {role && (completion?.signatureContentPath ?? detail?.signatureContentPath) ? <PrivateSignaturePreview path={(completion?.signatureContentPath ?? detail?.signatureContentPath)!} role={role} userId={userId} /> : null}
        {detail?.validity ? <p className="text-sm">Vigencia: {detail.validity.invalidated ? 'Invalidado' : detail.validity.expired ? 'Expirado' : detail.validity.valid ? 'Vigente' : 'No vigente'}</p> : null}
        {(detail?.correctives?.length || completion?.correctiveIds.length || 0) > 0 ? <div className="text-sm"><p>Correctivas creadas: {detail?.correctives?.length || completion?.correctiveIds.length}</p><ul className="mt-2 space-y-1">{(detail?.correctives?.length ? detail.correctives : (completion?.correctiveIds ?? []).map((correctiveId) => ({ id: correctiveId, folio: `MTT-${correctiveId}` }))).map((item) => <li key={item.id}><details><summary className="min-h-11 cursor-pointer py-2" aria-label={`Ver folio completo ${item.folio}`}>{item.folio.replace(/^(MTT-[0-9a-f]{8})-[0-9a-f-]+$/i, '$1…')}</summary><p className="break-all text-xs text-muted-foreground">{item.folio}</p></details></li>)}</ul></div> : null}
      </div> : <div className="space-y-3 rounded-md border bg-card p-3">
        <h3 className="font-semibold text-navy">Firma atribuible</h3>
        <p className="text-sm text-muted-foreground">Firma dentro del recuadro. Al completar se sella exactamente el hash mostrado.</p>
        <SignaturePad value={signature} onChange={setSignature} label="Firma del mecánico" />
      </div>}
    </section> : null}
    </div>
    {!isCompleted ? <footer className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-4"><div className="mx-auto flex w-full max-w-[560px] items-center gap-2">{stepIndex > 0 ? <Button type="button" variant="secondary" className="min-h-12 shrink-0" onClick={() => goToStep(STEPS[stepIndex - 1].id)} disabled={saving}>Atrás</Button> : null}{step === 'condition' ? <Button type="submit" form="check-condition-form" className="min-h-12 flex-1" disabled={saving || !config}>{saving ? 'Guardando…' : 'Continuar a Evidencia'}</Button> : null}{step === 'evidence' ? <Button type="button" className="min-h-12 flex-1" disabled={!evidence?.ready || saving} onClick={() => { setCompletedSteps((current) => new Set(current).add('evidence')); setStep('findings'); }}>Continuar a Hallazgos</Button> : null}{step === 'findings' ? <Button type="button" className="min-h-12 flex-1" disabled={!findings?.complete || saving} onClick={() => void startReview()}>{saving ? 'Preparando…' : 'Continuar a Revisión y firma'}</Button> : null}{step === 'review' ? <Button type="button" className="min-h-12 flex-1" disabled={saving || !review || !signature} onClick={() => void completeCheck()}>{saving ? 'Cerrando…' : 'Firmar y concluir chequeo'}</Button> : null}</div></footer> : null}
    </>}
  </main>;
}
