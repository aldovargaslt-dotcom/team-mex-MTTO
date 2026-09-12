'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import {
  etiquetaMantenimientoUnidad,
  fraseCuenta,
  resumenAvisoMantenimiento,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'activas', label: 'Activas' },
  { id: 'inactivas', label: 'Inactivas' },
  { id: 'vencidas', label: 'Vencidas' },
] as const;

type FiltroUnidad = (typeof FILTROS)[number]['id'];

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
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
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
  const [filtro, setFiltro] = useState<FiltroUnidad>('todas');
  const [avisosByUnidad, setAvisosByUnidad] = useState<
    Record<string, AvisoAndon>
  >({});

  async function cargar() {
    if (!role) return;
    if (unidades == null) setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (tipoFiltro) params.set('tipo', tipoFiltro);
    if (estadoFiltro) params.set('estado', estadoFiltro);
    const qs = params.toString();
    try {
      const [lista, catalogo, umb, avisos] = await Promise.all([
        api<Unidad[]>(`/unidades${qs ? `?${qs}` : ''}`, { role, userId }),
        api<TipoVehiculo[]>('/unidades/tipos', { role, userId }),
        api<UmbralAndon[]>('/andon/umbrales', { role, userId }),
        api<AvisoAndon[]>('/andon/avisos', { role, userId }).catch(
          () => [] as AvisoAndon[],
        ),
      ]);
      setUnidades(lista);
      setTipos(catalogo);
      setUmbrales(Object.fromEntries(umb.map((u) => [u.tipoVehiculoId, u])));
      setAvisosByUnidad(
        Object.fromEntries(avisos.map((aviso) => [aviso.unidadId, aviso])),
      );
      setLoadFailed(false);
    } catch (err) {
      setUnidades([]);
      setAvisosByUnidad({});
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

  const buscando = Boolean(q.trim() || tipoFiltro || estadoFiltro);
  const grupos = useMemo(() => {
    const byTipo = new Map<string, Unidad[]>();
    for (const unidad of unidades ?? []) {
      if (filtro === 'activas' && unidad.estado !== 'ACTIVA') continue;
      if (filtro === 'inactivas' && unidad.estado !== 'INACTIVA') continue;
      if (filtro === 'vencidas' && !avisosByUnidad[unidad.id]) continue;
      const id = unidad.tipo.id;
      const list = byTipo.get(id) ?? [];
      list.push(unidad);
      byTipo.set(id, list);
    }
    const ocultarVacios = buscando || filtro !== 'todas';
    return tipos
      .map((tipo) => ({
        tipo,
        unidades: byTipo.get(tipo.id) ?? [],
        umbral: umbrales[tipo.id],
      }))
      .filter((grupo) => {
        if (ocultarVacios) return grupo.unidades.length > 0;
        if (isAdmin) return true;
        return grupo.unidades.length > 0;
      });
  }, [tipos, unidades, umbrales, buscando, isAdmin, filtro, avisosByUnidad]);

  const resumenFlota = useMemo(() => {
    const lista = unidades ?? [];
    if (lista.length === 0) return null;
    const vencidas = lista.filter((unidad) => avisosByUnidad[unidad.id]).length;
    const inactivas = lista.filter((unidad) => unidad.estado === 'INACTIVA').length;
    const parts = [fraseCuenta(lista.length, 'unidad', 'unidades')];
    if (vencidas > 0) {
      parts.push(fraseCuenta(vencidas, 'vencida', 'vencidas'));
    }
    if (inactivas > 0) {
      parts.push(fraseCuenta(inactivas, 'inactiva', 'inactivas'));
    }
    return parts.join(' · ');
  }, [unidades, avisosByUnidad]);

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => {
          const unidad = row.original;
          const detalle = [
            unidad.marcaModelo,
            unidad.anio ? String(unidad.anio) : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <span>
              <span className="mono font-medium text-navy">
                {unidad.numeroInterno}
              </span>
              {detalle ? (
                <span className="text-muted-foreground"> · {detalle}</span>
              ) : null}
              <span className="text-muted-foreground md:hidden">
                {' · '}
                {unidad.placas}
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: 'placas',
        header: 'Placas',
        meta: { className: 'hidden md:table-cell' },
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
            <StatusBadge estado={row.original.estado} />
            {row.original.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
              <span className="text-[11px] text-muted-foreground">
                Envío especial
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'mantenimiento',
        header: 'Mantenimiento',
        cell: ({ row }) => {
          const aviso = avisosByUnidad[row.original.id];
          if (!aviso) {
            return (
              <span className="text-[12px] text-muted-foreground">Al día</span>
            );
          }
          return (
            <Badge variant={aviso.estado === 'ABIERTO' ? 'warning' : 'muted'}>
              {etiquetaMantenimientoUnidad(aviso.estado)}
            </Badge>
          );
        },
      },
    ],
    [avisosByUnidad],
  );

  return (
    <>
      <PageHeader
        title="Unidades"
        lede={
          resumenFlota
            ? `Flota de mantenimiento por tipo. ${resumenFlota}.`
            : 'Flota agrupada por tipo. Busque por interno, placas o marca.'
        }
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
                  <Link href="/unidades/nueva">Nueva unidad</Link>
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

      <form className="mb-3" onSubmit={onSearch}>
        <Card className="filters">
          <Field label="Buscar" htmlFor="unidadQ">
            <Input
              id="unidadQ"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar unidad…"
            />
          </Field>
          <Field label="Tipo" htmlFor="unidadTipo">
            <NativeSelect
              id="unidadTipo"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Estado" htmlFor="unidadEstado">
            <NativeSelect
              id="unidadEstado"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="INACTIVA">Inactiva</option>
            </NativeSelect>
          </Field>
        </Card>
      </form>

      {loadFailed ? null : (
        <ListFilter
          label="Filtro unidades"
          value={filtro}
          options={FILTROS}
          onChange={setFiltro}
        />
      )}

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
      ) : grupos.length === 0 ? (
        <div className="empty-state">
          <h2>
            {buscando || filtro !== 'todas'
              ? 'No hay unidades que coincidan'
              : isAdmin
                ? 'No hay tipos'
                : 'No hay unidades'}
          </h2>
          <p className="muted">
            {buscando || filtro !== 'todas'
              ? 'Ajuste la búsqueda o los filtros.'
              : isAdmin
                ? 'Agregue el primer tipo para clasificar la flota.'
                : 'No hay unidades registradas.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {grupos.map((grupo) => (
            <section key={grupo.tipo.id} aria-labelledby={`tipo-${grupo.tipo.id}`}>
              <div className="mb-1 flex min-h-11 flex-wrap items-center justify-between gap-2">
                <div>
                  <h2
                    id={`tipo-${grupo.tipo.id}`}
                    className="text-sm font-semibold text-navy"
                  >
                    {grupo.tipo.nombre}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {grupo.tipo.descripcion
                      ? `${grupo.tipo.descripcion} · `
                      : ''}
                    {resumenAvisoMantenimiento(
                      grupo.umbral?.tKm ?? DEFAULT_T_KM,
                      grupo.umbral?.tDias ?? DEFAULT_T_DIAS,
                    )}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="compact">
                      <Link href={`/unidades/nueva?tipoId=${grupo.tipo.id}`}>
                        Nueva unidad
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      onClick={() => abrirEdicionFamilia(grupo.tipo)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="compact"
                      onClick={() => void eliminarFamilia(grupo.tipo)}
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : null}
              </div>
              <DataTable
                columns={columns}
                data={grupo.unidades}
                empty="No hay unidades en este tipo."
                onRowClick={(unidad) => router.push(`/unidades/${unidad.id}`)}
              />
            </section>
          ))}
        </div>
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
