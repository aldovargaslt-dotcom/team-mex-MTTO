'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
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
import { Field, FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
      <UnidadesList />
    </RoleGate>
  );
}

function UnidadesList() {
  const { role, userId, isAdmin } = useRole();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [atencionFiltro, setAtencionFiltro] = useState(false);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
  const [flota, setFlota] = useState<Unidad[]>([]);
  const [avisos, setAvisos] = useState<AvisoAndon[]>([]);
  const [umbrales, setUmbrales] = useState<Record<string, UmbralAndon>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoVehiculo | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [icono, setIcono] = useState<TipoGlyph>('truck');
  const [iconoManual, setIconoManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [alertDraft, setAlertDraft] = useState<
    Record<string, { tKm: string; tDias: string }>
  >({});
  const [savingAlertas, setSavingAlertas] = useState(false);

  async function cargar() {
    if (!role) return;
    if (unidades == null) setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (tipoFiltro) params.set('tipo', tipoFiltro);
    if (estadoFiltro) params.set('estado', estadoFiltro);
    const qs = params.toString();
    const opts = { role, userId };
    const filteredPath = `/unidades${qs ? `?${qs}` : ''}`;
    try {
      const [lista, catalogo, umb, avisosList, flotaList] = await Promise.all([
        api<Unidad[]>(filteredPath, opts),
        api<TipoVehiculo[]>('/unidades/tipos', opts),
        api<UmbralAndon[]>('/andon/umbrales', opts),
        api<AvisoAndon[]>('/andon/avisos', opts).catch(() => [] as AvisoAndon[]),
        qs ? api<Unidad[]>('/unidades', opts) : Promise.resolve(null),
      ]);
      setUnidades(lista);
      setFlota(flotaList ?? lista);
      setAvisos(avisosList);
      setTipos(catalogo);
      setUmbrales(Object.fromEntries(umb.map((u) => [u.tipoVehiculoId, u])));
      setLoadFailed(false);
    } catch (err) {
      setUnidades([]);
      setFlota([]);
      setAvisos([]);
      setLoadFailed(true);
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar las unidades.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!role) return;
    const handle = window.setTimeout(() => void cargar(), 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, q, tipoFiltro, estadoFiltro]);

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

  function abrirAlertas() {
    setAlertDraft(
      Object.fromEntries(
        tipos.map((tipo) => [
          tipo.id,
          {
            tKm: String(umbrales[tipo.id]?.tKm ?? DEFAULT_T_KM),
            tDias: String(umbrales[tipo.id]?.tDias ?? DEFAULT_T_DIAS),
          },
        ]),
      ),
    );
    setError(null);
    setAlertasOpen(true);
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
  const adminActions = isAdmin ? (
    tipos.length > 0 ? (
      <>
        <UnidadesAdminMenu
          onNuevoTipo={abrirAltaFamilia}
          onAlertas={abrirAlertas}
        />
        <Button asChild size="compact" className="unidades-cta-nueva">
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
  const sinTipos = !buscando && tipos.length === 0;

  return (
    <>
      {loadFailed && !dialogOpen && !alertasOpen ? (
        <div className="error-state">
          <h2>No se pudo consultar la flota</h2>
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      {error && !dialogOpen && !alertasOpen && !loadFailed ? (
        <FormAlert>{error}</FormAlert>
      ) : null}

      {loadFailed ? null : loading ? (
        <p className="muted">Cargando unidades…</p>
      ) : (
        <>
          <UnidadesCatalogo
            unidades={unidades ?? []}
            flota={flota}
            tipos={tipos}
            avisos={avisos}
            q={q}
            tipoFiltro={tipoFiltro}
            estadoFiltro={estadoFiltro}
            atencionFiltro={atencionFiltro}
            buscando={buscando}
            isAdmin={isAdmin}
            actions={adminActions}
            onQ={setQ}
            onTipoFiltro={setTipoFiltro}
            onEstadoFiltro={setEstadoFiltro}
            onAtencionFiltro={setAtencionFiltro}
            onSearch={onSearch}
            onOpenUnidad={(unidad) => router.push(`/unidades/${unidad.id}`)}
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
    </>
  );
}
