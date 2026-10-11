'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { HealthConfigDialog } from '@/components/HealthConfigDialog';
import { UnidadesAdminMenu } from '@/components/UnidadesAdminMenu';
import { UnidadesCatalogo } from '@/components/UnidadesCatalogo';
import { TipoIconoPicker } from '@/components/TipoIconoPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { api, HttpError } from '@/lib/api';
import { resumenAvisoMantenimiento } from '@/lib/format';
import { glyphTipo, inferGlyphTipo, type TipoGlyph } from '@/lib/unidades-catalogo';
import { useRole } from '@/lib/role';
import type { AvisoAndon, TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';

const DEFAULT_T_KM = 10000;
const DEFAULT_T_DIAS = 90;

export default function UnidadesPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando unidades…</p>}>
        <UnidadesList />
      </Suspense>
    </RoleGate>
  );
}

function UnidadesList() {
  const { role, userId, isAdmin } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const tipoFiltro = searchParams.get('tipo') ?? '';
  const estadoFiltro = searchParams.get('estado') ?? '';
  const atencionFiltro = searchParams.get('atencion') === '1';
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (tipoFiltro) params.set('tipo', tipoFiltro);
  if (estadoFiltro) params.set('estado', estadoFiltro);
  const opts = { role: role!, userId };
  const list = useReadResource(role ? JSON.stringify([role, userId, params.toString()]) : null,
    () => api<Unidad[]>(`/unidades?${params}`, opts));
  const all = useReadResource(role ? JSON.stringify([role, userId, 'all-unidades']) : null,
    () => api<Unidad[]>('/unidades', opts));
  const types = useReadResource(role ? JSON.stringify([role, userId, 'tipos']) : null,
    () => api<TipoVehiculo[]>('/unidades/tipos', opts));
  const thresholds = useReadResource(role ? JSON.stringify([role, userId, 'umbrales']) : null,
    () => api<UmbralAndon[]>('/andon/umbrales', opts));
  const notices = useReadResource(role ? JSON.stringify([role, userId, 'avisos']) : null,
    () => api<AvisoAndon[]>('/andon/avisos', opts));
  const unidades = list.data;
  const flota = all.data ?? [];
  const tipos = types.data ?? [...new Map((unidades ?? []).map((unit) => [unit.tipo.id, unit.tipo])).values()];
  const avisos = notices.data ?? [];
  const umbrales = Object.fromEntries((thresholds.data ?? []).map((u) => [u.tipoVehiculoId, u]));
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoVehiculo | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [icono, setIcono] = useState<TipoGlyph>('truck');
  const [iconoManual, setIconoManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [saludOpen, setSaludOpen] = useState(false);
  const [alertDraft, setAlertDraft] = useState<
    Record<string, { tKm: string; tDias: string }>
  >({});
  const [savingAlertas, setSavingAlertas] = useState(false);

  function setCatalogParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function cargar() { list.retry(); all.retry(); types.retry(); thresholds.retry(); notices.retry(); }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    void cargar();
  }

  function abrirAltaFamilia() {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setIcono('truck');
    setIconoManual(false);
    setError(null);
    setDialogOpen(true);
  }

  function abrirEdicionFamilia(tipo: TipoVehiculo) {
    setEditing(tipo);
    setNombre(tipo.nombre);
    setDescripcion(tipo.descripcion ?? '');
    setIcono(glyphTipo(tipo.nombre, tipo.icono));
    setIconoManual(true);
    setError(null);
    setDialogOpen(true);
  }

  async function guardarFamilia(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        icono,
      };
      const saved = editing
        ? await api<TipoVehiculo>(`/unidades/tipos/${editing.id}`, {
            role: role!,
            userId,
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await api<TipoVehiculo>('/unidades/tipos', {
            role: role!,
            userId,
            method: 'POST',
            body: JSON.stringify(payload),
          });
      if (!editing) {
        await api(`/andon/umbrales/${saved.id}`, {
          role: role!,
          userId,
          method: 'PATCH',
          body: JSON.stringify({
            tKm: DEFAULT_T_KM,
            tDias: DEFAULT_T_DIAS,
          }),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : editing
            ? 'No se pudo actualizar el tipo.'
            : 'No se pudo crear el tipo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function eliminarFamilia(tipo: TipoVehiculo) {
    const ok = window.confirm(
      `¿Eliminar el tipo ${tipo.nombre}? Solo se puede si no tiene unidades.`,
    );
    if (!ok) return;
    setError(null);
    try {
      await api(`/unidades/tipos/${tipo.id}`, {
        role: role!,
        userId,
        method: 'DELETE',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo eliminar el tipo.',
      );
    }
  }

  async function guardarAlertas(event: FormEvent) {
    event.preventDefault();
    setError(null);
    for (const tipo of tipos) {
      const draft = alertDraft[tipo.id];
      const km = Number(draft?.tKm);
      const dias = Number(draft?.tDias);
      if (!Number.isInteger(km) || km < 1 || !Number.isInteger(dias) || dias < 1) {
        setError('Indique kilómetros y días enteros mayores a cero.');
        return;
      }
    }
    setSavingAlertas(true);
    try {
      for (const tipo of tipos) {
        const draft = alertDraft[tipo.id];
        const km = Number(draft.tKm);
        const dias = Number(draft.tDias);
        const actual = umbrales[tipo.id];
        if (actual?.tKm === km && actual?.tDias === dias) continue;
        await api(`/andon/umbrales/${tipo.id}`, {
          role: role!,
          userId,
          method: 'PATCH',
          body: JSON.stringify({ tKm: km, tDias: dias }),
        });
      }
      setAlertasOpen(false);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron guardar las alertas.',
      );
    } finally {
      setSavingAlertas(false);
    }
  }

  const buscando = Boolean(
    q.trim() || tipoFiltro || estadoFiltro || atencionFiltro,
  );
  const adminActions = isAdmin && types.data !== null ? (
    tipos.length > 0 ? (
      <>
        <UnidadesAdminMenu
          onNuevoTipo={abrirAltaFamilia}
          onAlertas={() =>
            router.push('/configuracion/alertas?code=MTTO_VENCIDO')
          }
          onSalud={() => setSaludOpen(true)}
        />
        <Button asChild>
          <Link
            href={
              tipoFiltro
                ? `/unidades/nueva?tipoId=${tipoFiltro}`
                : '/unidades/nueva'
            }
          >
            Nueva unidad
          </Link>
        </Button>
      </>
    ) : (
      <Button type="button" onClick={abrirAltaFamilia}>
        Nuevo tipo
      </Button>
    )
  ) : null;
  const sinTipos = !buscando && types.data !== null && tipos.length === 0 && unidades?.length === 0;

  return (
    <>
      {unidades === null || (atencionFiltro && notices.data === null) ? <PageHeader title="Unidades" lede="Busque y abra la ficha de la unidad." /> : null}
      <ReadStatus loading={list.loading} error={list.error} loadingText="Cargando unidades…" errorText="No se pudieron cargar las unidades." retry={list.retry} />
      <ReadStatus loading={all.loading} error={all.error} loadingText="Cargando totales de unidades…" errorText="No se pudieron cargar los totales de unidades." retry={all.retry} />
      <ReadStatus loading={types.loading} error={types.error} loadingText="Cargando tipos…" errorText="Catálogo de tipos no disponible; se muestran los tipos de las unidades cargadas." retry={types.retry} />
      <ReadStatus loading={notices.loading} error={notices.error} loadingText="Cargando avisos…" errorText="Avisos de mantenimiento no disponibles." retry={notices.retry} />
      <ReadStatus loading={thresholds.loading} error={thresholds.error} loadingText="Cargando umbrales…" errorText="Umbrales no disponibles." retry={thresholds.retry} />
      {error && !dialogOpen && !alertasOpen && !saludOpen ? <FormAlert>{error}</FormAlert> : null}
      {unidades === null || (atencionFiltro && notices.data === null) ? null : (
        <>
          <UnidadesCatalogo
            unidades={unidades ?? []}
            flota={flota}
            tipos={tipos}
            avisos={avisos}
            avisosDisponibles={notices.data !== null}
            flotaDisponible={all.data !== null}
            q={q}
            tipoFiltro={tipoFiltro}
            estadoFiltro={estadoFiltro}
            atencionFiltro={atencionFiltro}
            buscando={buscando}
            isAdmin={isAdmin}
            actions={adminActions}
            onQ={(value) => setCatalogParams({ q: value.trim() ? value : null })}
            onTipoFiltro={(value) => setCatalogParams({ tipo: value || null })}
            onEstadoFiltro={(value) => setCatalogParams({ estado: value || null })}
            onAtencionFiltro={(value) =>
              setCatalogParams({ atencion: value ? '1' : null })
            }
            onSearch={onSearch}
            onOpenUnidad={(unidad) => {
              const qs = searchParams.toString();
              const returnTo = qs ? `${pathname}?${qs}` : pathname;
              router.push(
                `/unidades/${unidad.id}?${new URLSearchParams({ returnTo }).toString()}`,
              );
            }}
            onEditarTipo={abrirEdicionFamilia}
            onEliminarTipo={(tipo) => void eliminarFamilia(tipo)}
          />
          {sinTipos ? (
            <div className="empty-state">
              <h2>{isAdmin ? 'No hay tipos' : 'No hay unidades'}</h2>
              <p className="muted">
                {isAdmin
                  ? 'Agregue el primer tipo para clasificar la flota.'
                  : 'No hay unidades registradas.'}
              </p>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) {
            setEditing(null);
            setNombre('');
            setDescripcion('');
            setIcono('truck');
            setIconoManual(false);
          }
        }}
      >
        <DialogContent>
          <form onSubmit={guardarFamilia}>
            <DialogHeader>
              <DialogTitle className="text-[16px]">
                {editing ? 'Editar tipo' : 'Nuevo tipo'}
              </DialogTitle>
              <DialogDescription>
                Nombre, icono y descripción del tipo de unidad.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <Field label="Nombre" htmlFor="familiaNombre">
                <Input
                  id="familiaNombre"
                  required
                  value={nombre}
                  onChange={(e) => {
                    const next = e.target.value;
                    setNombre(next);
                    if (!iconoManual) setIcono(inferGlyphTipo(next));
                  }}
                  placeholder="Camión"
                  autoFocus
                />
              </Field>
              <Field
                label="Icono"
                htmlFor="familiaIcono"
                help="Se muestra en el listado de unidades."
              >
                <TipoIconoPicker
                  id="familiaIcono"
                  value={icono}
                  onChange={(id) => {
                    setIconoManual(true);
                    setIcono(id);
                  }}
                />
              </Field>
              <Field label="Descripción" htmlFor="familiaDescripcion">
                <Input
                  id="familiaDescripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Opcional"
                />
              </Field>
              <FormAlert>{dialogOpen ? error : null}</FormAlert>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !nombre.trim()}>
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Agregar tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={alertasOpen}
        onOpenChange={(next) => {
          setAlertasOpen(next);
          if (!next) setAlertDraft({});
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <form
            className="grid max-h-[calc(90vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
            onSubmit={guardarAlertas}
          >
            <DialogHeader>
              <DialogTitle className="text-[16px]">Alertas de mantenimiento</DialogTitle>
              <DialogDescription>
                Te avisamos en la campanita cuando una unidad recorra demasiados
                kilómetros o pase demasiado tiempo sin visita. Basta con que se
                cumpla una de las dos.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 space-y-4 overflow-y-auto py-3">
              {tipos.map((tipo) => {
                const draft = alertDraft[tipo.id] ?? {
                  tKm: String(DEFAULT_T_KM),
                  tDias: String(DEFAULT_T_DIAS),
                };
                const km = Number(draft.tKm);
                const dias = Number(draft.tDias);
                return (
                  <section
                    key={tipo.id}
                    className="rounded-md border border-border p-3"
                  >
                    <h2 className="text-sm font-semibold text-navy">{tipo.nombre}</h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {Number.isInteger(km) && Number.isInteger(dias)
                        ? resumenAvisoMantenimiento(km, dias)
                        : 'Indique kilómetros y días.'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Cada … km"
                        htmlFor={`alertaKm-${tipo.id}`}
                        hint={
                          <p className="text-[12px] text-muted-foreground">
                            Desde la última visita.
                          </p>
                        }
                      >
                        <Input
                          id={`alertaKm-${tipo.id}`}
                          type="number"
                          min={1}
                          required
                          inputMode="numeric"
                          value={draft.tKm}
                          onChange={(e) =>
                            setAlertDraft((current) => ({
                              ...current,
                              [tipo.id]: { ...draft, tKm: e.target.value },
                            }))
                          }
                        />
                      </Field>
                      <Field
                        label="Cada … días"
                        htmlFor={`alertaDias-${tipo.id}`}
                        hint={
                          <p className="text-[12px] text-muted-foreground">
                            Aunque no haya recorrido tantos kilómetros.
                          </p>
                        }
                      >
                        <Input
                          id={`alertaDias-${tipo.id}`}
                          type="number"
                          min={1}
                          required
                          inputMode="numeric"
                          value={draft.tDias}
                          onChange={(e) =>
                            setAlertDraft((current) => ({
                              ...current,
                              [tipo.id]: { ...draft, tDias: e.target.value },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </section>
                );
              })}
              <FormAlert>{alertasOpen ? error : null}</FormAlert>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAlertasOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingAlertas || tipos.length === 0}>
                {savingAlertas ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {role ? (
        <HealthConfigDialog
          open={saludOpen}
          onOpenChange={setSaludOpen}
          role={role}
          userId={userId}
        />
      ) : null}
    </>
  );
}
