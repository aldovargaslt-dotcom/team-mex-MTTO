'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { RoleGate } from '@/components/RoleGate';
import { CondicionUnidadBadge, StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
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
import { api, HttpError } from '@/lib/api';
import { resumenAvisoMantenimiento } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';
import {
  atencionDeUnidad,
  avisosPorUnidad,
  condicionDeUnidad,
  emptyUnidadesListado,
  etiquetaMotivoEstado,
  filtraUnidades,
  identidadSecundaria,
  opcionesFiltroUnidades,
  opcionesSegmentoTipo,
  ordenaUnidades,
  parseFiltroUnidades,
  parseTipoUnidades,
  resumenFlotaUnidades,
  textoResultadosUnidades,
  type FiltroUnidadesListado,
} from '@/lib/unidades-listado';

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
  const [q, setQ] = useState('');
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
  const [avisos, setAvisos] = useState<AvisoAndon[]>([]);
  const [umbrales, setUmbrales] = useState<Record<string, UmbralAndon>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoVehiculo | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [alertDraft, setAlertDraft] = useState<
    Record<string, { tKm: string; tDias: string }>
  >({});
  const [savingAlertas, setSavingAlertas] = useState(false);

  const filtro = parseFiltroUnidades(searchParams.get('filtro'));
  const tipoId = parseTipoUnidades(searchParams.get('tipo'), tipos);

  async function cargar() {
    if (!role) return;
    if (unidades == null) setLoading(true);
    setError(null);
    const opts = { role, userId };
    try {
      const [lista, catalogo, extra] = await Promise.all([
        api<Unidad[]>('/unidades', opts),
        api<TipoVehiculo[]>('/unidades/tipos', opts),
        Promise.allSettled([
          api<UmbralAndon[]>('/andon/umbrales', opts),
          api<AvisoAndon[]>('/andon/avisos', opts),
        ]),
      ]);
      setUnidades(lista);
      setTipos(catalogo);
      const umb = extra[0];
      const avisosRes = extra[1];
      setUmbrales(
        umb.status === 'fulfilled'
          ? Object.fromEntries(umb.value.map((u) => [u.tipoVehiculoId, u]))
          : {},
      );
      setAvisos(avisosRes.status === 'fulfilled' ? avisosRes.value : []);
      setLoadFailed(false);
    } catch (err) {
      setUnidades([]);
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
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

  function replaceParams(next: { filtro?: FiltroUnidadesListado; tipo?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFiltro = next.filtro ?? filtro;
    const nextTipo = next.tipo !== undefined ? next.tipo : tipoId;
    if (nextFiltro === 'todas') params.delete('filtro');
    else params.set('filtro', nextFiltro);
    if (!nextTipo) params.delete('tipo');
    else params.set('tipo', nextTipo);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function abrirAltaFamilia() {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setError(null);
    setDialogOpen(true);
  }

  function abrirEdicionFamilia(tipo: TipoVehiculo) {
    setEditing(tipo);
    setNombre(tipo.nombre);
    setDescripcion(tipo.descripcion ?? '');
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
      if (tipoId === tipo.id) replaceParams({ tipo: '' });
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

  const avisosMap = useMemo(() => avisosPorUnidad(avisos), [avisos]);
  const catalogo = useMemo(() => unidades ?? [], [unidades]);
  const resumen = useMemo(
    () => resumenFlotaUnidades(catalogo, avisosMap),
    [catalogo, avisosMap],
  );
  const visibles = useMemo(
    () =>
      ordenaUnidades(
        filtraUnidades(catalogo, avisosMap, filtro, tipoId, q),
        avisosMap,
      ),
    [catalogo, avisosMap, filtro, tipoId, q],
  );
  const tipoSeleccionado = tipos.find((tipo) => tipo.id === tipoId) ?? null;
  const empty = emptyUnidadesListado({
    buscando: Boolean(q.trim()),
    filtro,
    tipoNombre: tipoSeleccionado?.nombre ?? null,
    hayTipos: tipos.length > 0,
    isAdmin,
    hayUnidades: catalogo.length > 0,
  });
  const nuevaUnidadHref = tipoId
    ? `/unidades/nueva?tipoId=${tipoId}`
    : '/unidades/nueva';

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-semibold text-navy">
              {row.original.numeroInterno}
            </div>
            <div className="truncate text-[12px] text-muted-foreground">
              {identidadSecundaria(row.original, !tipoId)}
            </div>
          </div>
        ),
      },
      {
        id: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
          const motivo = etiquetaMotivoEstado(row.original);
          return (
            <div>
              <StatusBadge estado={row.original.estado} />
              {motivo ? (
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {motivo}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'condicion',
        header: 'Condición',
        cell: ({ row }) => {
          const condicion = condicionDeUnidad(avisosMap.get(row.original.id));
          return (
            <CondicionUnidadBadge
              label={condicion.label}
              variant={condicion.variant}
            />
          );
        },
      },
      {
        id: 'atencion',
        header: 'Atención',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => {
          const atencion = atencionDeUnidad(avisosMap.get(row.original.id));
          return (
            <div className="max-w-[220px]">
              <div
                className={
                  atencion.detalle ? 'text-[13px] text-navy' : 'muted'
                }
              >
                {atencion.titulo}
              </div>
              {atencion.detalle ? (
                <div className="truncate text-[12px] text-muted-foreground">
                  {atencion.detalle}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'accion',
        header: '',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="compact">
              <Link
                href={`/unidades/${row.original.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                Ver ficha
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [avisosMap, tipoId],
  );

  return (
    <>
      <PageHeader
        title="Unidades"
        lede="Seleccione una unidad. El aviso Andon y el estado se ven aquí; el detalle sigue en la ficha."
        actions={
          isAdmin ? (
            tipos.length > 0 ? (
              <>
                <Button type="button" variant="secondary" onClick={abrirAlertas}>
                  Configurar alertas
                </Button>
                <Button type="button" variant="secondary" onClick={abrirAltaFamilia}>
                  Nuevo tipo
                </Button>
                <Button asChild>
                  <Link href={nuevaUnidadHref}>Nueva unidad</Link>
                </Button>
              </>
            ) : (
              <Button type="button" onClick={abrirAltaFamilia}>
                Nuevo tipo
              </Button>
            )
          ) : null
        }
      />

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
      ) : tipos.length === 0 && catalogo.length === 0 ? (
        <div className="empty-state">
          <h2>{empty.title}</h2>
          <p className="muted">{empty.body}</p>
        </div>
      ) : (
        <>
          <section aria-label="Resumen de flota">
            <dl className="fleet-summary">
              <div className="fleet-summary-card">
                <dt>Unidades</dt>
                <dd>{resumen.total}</dd>
              </div>
              <div className="fleet-summary-card">
                <dt>Activas</dt>
                <dd>{resumen.activas}</dd>
              </div>
              <div className="fleet-summary-card">
                <dt>Inactivas</dt>
                <dd>{resumen.inactivas}</dd>
              </div>
              <div
                className={
                  resumen.conAviso > 0
                    ? 'fleet-summary-card tone-danger'
                    : 'fleet-summary-card'
                }
              >
                <dt>Con aviso</dt>
                <dd>{resumen.conAviso}</dd>
              </div>
            </dl>
          </section>

          <div className="mb-3 space-y-2 [&_.list-filter]:mb-0">
            <Input
              id="unidadQ"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por interno, placas o marca…"
              aria-label="Buscar por interno, placas o marca"
              className="max-w-md"
            />
            <ListFilter
              label="Filtro de unidades"
              value={filtro}
              options={opcionesFiltroUnidades(catalogo, avisosMap)}
              onChange={(id) => replaceParams({ filtro: id })}
            />
            {tipos.length > 0 ? (
              <ListFilter
                label="Tipo de unidad"
                value={tipoId}
                options={opcionesSegmentoTipo(catalogo, tipos)}
                onChange={(id) => replaceParams({ tipo: id })}
              />
            ) : null}
          </div>

          {tipoSeleccionado ? (
            <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {tipoSeleccionado.descripcion
                  ? `${tipoSeleccionado.descripcion} · `
                  : ''}
                {resumenAvisoMantenimiento(
                  umbrales[tipoSeleccionado.id]?.tKm ?? DEFAULT_T_KM,
                  umbrales[tipoSeleccionado.id]?.tDias ?? DEFAULT_T_DIAS,
                )}
              </p>
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => abrirEdicionFamilia(tipoSeleccionado)}
                  >
                    Editar tipo
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="compact"
                    onClick={() => void eliminarFamilia(tipoSeleccionado)}
                  >
                    Eliminar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <DataTable
            className="unidades-table"
            columns={columns}
            data={visibles}
            empty={
              <>
                <span className="block font-medium text-navy">{empty.title}</span>
                <span>{empty.body}</span>
              </>
            }
            getRowClassName={(unidad) => {
              const aviso = avisosMap.get(unidad.id);
              if (aviso?.estado === 'ABIERTO') {
                return 'shadow-[inset_3px_0_0_#b42318]';
              }
              if (aviso?.estado === 'ENTERADO') {
                return 'shadow-[inset_3px_0_0_#8a4b12]';
              }
              return undefined;
            }}
            onRowClick={(unidad) => router.push(`/unidades/${unidad.id}`)}
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            {textoResultadosUnidades(visibles.length, catalogo.length)}
          </p>
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
                Nombre y descripción del tipo de unidad.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <Field label="Nombre" htmlFor="familiaNombre">
                <Input
                  id="familiaNombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Camión"
                  autoFocus
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
