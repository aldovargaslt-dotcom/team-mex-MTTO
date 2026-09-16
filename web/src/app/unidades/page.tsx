'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, LayoutGrid, List, Truck } from 'lucide-react';
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu';
import { ListFilter } from '@/components/ListFilter';
import { RoleGate } from '@/components/RoleGate';
import { AtencionBadge, StatusBadge } from '@/components/StatusBadge';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, HttpError } from '@/lib/api';
import { resumenAvisoMantenimiento } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';

const DEFAULT_T_KM = 10000;
const DEFAULT_T_DIAS = 90;

type OrdenUnidades = 'interno-asc' | 'interno-desc' | 'atencion';
type VistaUnidades = 'list' | 'grid';

function etiquetaModelo(unidad: Unidad) {
  if (!unidad.marcaModelo) return '—';
  return unidad.anio ? `${unidad.marcaModelo} · ${unidad.anio}` : unidad.marcaModelo;
}

function resumenDeFlota(lista: Unidad[], conAviso: Set<string>) {
  const activas = lista.filter((unidad) => unidad.estado === 'ACTIVA').length;
  return {
    total: lista.length,
    activas,
    inactivas: lista.length - activas,
    avisos: lista.filter((unidad) => conAviso.has(unidad.id)).length,
  };
}

function ordenarUnidades(
  lista: Unidad[],
  orden: OrdenUnidades,
  conAviso: Set<string>,
) {
  const copy = [...lista];
  copy.sort((a, b) => {
    if (orden === 'atencion') {
      const byAviso = Number(conAviso.has(b.id)) - Number(conAviso.has(a.id));
      if (byAviso !== 0) return byAviso;
    }
    const cmp = a.numeroInterno.localeCompare(b.numeroInterno, 'es', {
      numeric: true,
    });
    return orden === 'interno-desc' ? -cmp : cmp;
  });
  return copy;
}

function UnidadIdentity({ unidad }: { unidad: Unidad }) {
  return (
    <Link href={`/unidades/${unidad.id}`} className="unidad-identity">
      <Truck className="unidad-identity__icon" aria-hidden />
      <span className="unidad-identity__text">
        <span className="unidad-identity__id mono">{unidad.numeroInterno}</span>
        <span className="unidad-identity__meta">{etiquetaModelo(unidad)}</span>
      </span>
    </Link>
  );
}

function VerFichaLink({ id }: { id: string }) {
  return (
    <Button asChild variant="outline" size="compact">
      <Link href={`/unidades/${id}`}>
        Ver ficha
        <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </Button>
  );
}

function UnidadCard({
  unidad,
  tieneAviso,
}: {
  unidad: Unidad;
  tieneAviso: boolean;
}) {
  return (
    <Card className="unidad-card">
      <UnidadIdentity unidad={unidad} />
      <div className="unidad-card__facts">
        <span>{unidad.tipo.nombre}</span>
        <span className="unidad-card__facts-dot" aria-hidden />
        <StatusBadge estado={unidad.estado} />
        <span className="unidad-card__facts-dot" aria-hidden />
        <span className="mono">{unidad.placas}</span>
      </div>
      <AtencionBadge tieneAviso={tieneAviso} />
      <div>
        <VerFichaLink id={unidad.id} />
      </div>
    </Card>
  );
}

export default function UnidadesPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <UnidadesList />
    </RoleGate>
  );
}

function UnidadesList() {
  const { role, userId, isAdmin } = useRole();
  const [q, setQ] = useState('');
  const [tipoTab, setTipoTab] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [estadoDraft, setEstadoDraft] = useState('');
  const [orden, setOrden] = useState<OrdenUnidades>('interno-asc');
  const [vista, setVista] = useState<VistaUnidades>('list');
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
  const [resumen, setResumen] = useState({
    total: 0,
    activas: 0,
    inactivas: 0,
    avisos: 0,
  });
  const [avisosUnidadIds, setAvisosUnidadIds] = useState<Set<string>>(new Set());
  const [umbrales, setUmbrales] = useState<Record<string, UmbralAndon>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [editing, setEditing] = useState<TipoVehiculo | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
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
    if (estadoFiltro) params.set('estado', estadoFiltro);
    const qs = params.toString();
    const filtrando = Boolean(q.trim() || estadoFiltro);
    try {
      const [lista, catalogo, umb, avisos, flota] = await Promise.all([
        api<Unidad[]>(`/unidades${qs ? `?${qs}` : ''}`, { role, userId }),
        api<TipoVehiculo[]>('/unidades/tipos', { role, userId }),
        api<UmbralAndon[]>('/andon/umbrales', { role, userId }),
        api<AvisoAndon[]>('/andon/avisos', { role, userId }).catch(
          () => [] as AvisoAndon[],
        ),
        filtrando
          ? api<Unidad[]>('/unidades', { role, userId })
          : Promise.resolve(null),
      ]);
      const avisoIds = new Set(avisos.map((aviso) => aviso.unidadId));
      setUnidades(lista);
      setTipos(catalogo);
      setUmbrales(Object.fromEntries(umb.map((u) => [u.tipoVehiculoId, u])));
      setAvisosUnidadIds(avisoIds);
      setResumen(resumenDeFlota(flota ?? lista, avisoIds));
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
    const handle = window.setTimeout(() => void cargar(), 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, q, estadoFiltro]);

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
    setTiposOpen(false);
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

  function abrirFiltros() {
    setEstadoDraft(estadoFiltro);
    setFiltrosOpen(true);
  }

  function aplicarFiltros() {
    setEstadoFiltro(estadoDraft);
    setFiltrosOpen(false);
  }

  function limpiarFiltrosSecundarios() {
    setEstadoDraft('');
    setEstadoFiltro('');
  }

  function limpiarTodosLosFiltros() {
    setQ('');
    setEstadoFiltro('');
    setEstadoDraft('');
    setTipoTab('');
    setFiltrosOpen(false);
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
      if (tipoTab === tipo.id) setTipoTab('');
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

  const buscando = Boolean(q.trim() || estadoFiltro || tipoTab);
  const filtrosActivos = estadoFiltro ? 1 : 0;
  const conAviso = avisosUnidadIds;

  const conteoPorTipo = useMemo(() => {
    const counts = new Map<string, number>();
    for (const unidad of unidades ?? []) {
      counts.set(unidad.tipo.id, (counts.get(unidad.tipo.id) ?? 0) + 1);
    }
    return counts;
  }, [unidades]);

  const tabsTipo = useMemo(() => {
    const opciones: { id: string; label: string }[] = [
      { id: '', label: `Todas (${unidades?.length ?? 0})` },
    ];
    for (const tipo of tipos) {
      const n = conteoPorTipo.get(tipo.id) ?? 0;
      if (tipoTab === tipo.id || n > 0 || (isAdmin && !q.trim() && !estadoFiltro)) {
        opciones.push({ id: tipo.id, label: `${tipo.nombre} (${n})` });
      }
    }
    return opciones;
  }, [tipos, conteoPorTipo, tipoTab, isAdmin, q, estadoFiltro, unidades]);

  const visibles = useMemo(() => {
    const lista = (unidades ?? []).filter((unidad) =>
      tipoTab ? unidad.tipo.id === tipoTab : true,
    );
    return ordenarUnidades(lista, orden, conAviso);
  }, [unidades, tipoTab, orden, conAviso]);

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => <UnidadIdentity unidad={row.original} />,
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => row.original.tipo.nombre,
      },
      { accessorKey: 'placas', header: 'Placas' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge estado={row.original.estado} />,
      },
      {
        id: 'atencion',
        header: 'Atención',
        cell: ({ row }) => (
          <AtencionBadge tieneAviso={conAviso.has(row.original.id)} />
        ),
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => <VerFichaLink id={row.original.id} />,
      },
    ],
    [conAviso],
  );

  const adminActions =
    isAdmin && tipos.length > 0 ? (
      <>
        <ActionMenu label="Administrar">
          <ActionMenuItem onClick={abrirAltaFamilia}>Nuevo tipo</ActionMenuItem>
          <ActionMenuItem onClick={abrirAlertas}>Configurar alertas</ActionMenuItem>
          <ActionMenuItem onClick={() => setTiposOpen(true)}>
            Editar tipos
          </ActionMenuItem>
        </ActionMenu>
        <Button asChild>
          <Link href="/unidades/nueva">Nueva unidad</Link>
        </Button>
      </>
    ) : isAdmin ? (
      <Button type="button" onClick={abrirAltaFamilia}>
        Nuevo tipo
      </Button>
    ) : null;

  return (
    <>
      <PageHeader
        title="Unidades"
        lede="Busque y abra la unidad que necesita atención."
        actions={adminActions}
      />

      {!loadFailed && unidades != null ? (
        <div className="unidades-kpis" aria-label="Resumen de unidades">
          <div className="unidades-kpi">
            <span className="unidades-kpi__value">{resumen.total}</span>
            <span className="unidades-kpi__label">Total</span>
          </div>
          <div className="unidades-kpi">
            <span className="unidades-kpi__value">{resumen.activas}</span>
            <span className="unidades-kpi__label">Activas</span>
          </div>
          <div className="unidades-kpi">
            <span className="unidades-kpi__value">{resumen.inactivas}</span>
            <span className="unidades-kpi__label">Inactivas</span>
          </div>
          <div
            className={
              resumen.avisos > 0 ? 'unidades-kpi unidades-kpi--aviso' : 'unidades-kpi'
            }
          >
            <span className="unidades-kpi__value">{resumen.avisos}</span>
            <span className="unidades-kpi__label">Avisos</span>
          </div>
        </div>
      ) : null}

      <form className="unidades-search-row" onSubmit={onSearch}>
        <Field className="unidades-search" label="Buscar unidad" htmlFor="unidadQ">
          <Input
            id="unidadQ"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Interno, placas, marca o modelo…"
          />
        </Field>
        <div className="unidades-filters-desktop">
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
          {buscando ? (
            <Button
              type="button"
              variant="secondary"
              onClick={limpiarTodosLosFiltros}
            >
              Limpiar filtros
            </Button>
          ) : null}
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
        <div className="unidades-filters-mobile">
          <Button type="button" variant="secondary" onClick={abrirFiltros}>
            {filtrosActivos > 0 ? `Filtros (${filtrosActivos})` : 'Filtros'}
          </Button>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
      </form>

      {loadFailed && !dialogOpen && !alertasOpen && !tiposOpen ? (
        <div className="error-state">
          <h2>No se pudo consultar la flota</h2>
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      {error && !dialogOpen && !alertasOpen && !tiposOpen && !loadFailed ? (
        <FormAlert>{error}</FormAlert>
      ) : null}

      {loadFailed ? null : loading ? (
        <p className="muted">Cargando unidades…</p>
      ) : unidades != null && tipos.length === 0 && (unidades.length === 0) ? (
        <div className="empty-state">
          <h2>{isAdmin ? 'No hay tipos' : 'No hay unidades'}</h2>
          <p className="muted">
            {isAdmin
              ? 'Agregue el primer tipo para clasificar la flota.'
              : 'No hay unidades registradas.'}
          </p>
        </div>
      ) : (
        <>
          <div className="unidades-board-toolbar">
            <ListFilter
              className="list-filter-scroll"
              label="Tipo de unidad"
              value={tipoTab}
              options={tabsTipo}
              onChange={setTipoTab}
            />
            <div className="unidades-sort-view">
              <div className="unidades-sort">
                <label htmlFor="unidadOrden">Ordenar por</label>
                <NativeSelect
                  id="unidadOrden"
                  value={orden}
                  aria-label="Ordenar por"
                  onChange={(e) => setOrden(e.target.value as OrdenUnidades)}
                >
                  <option value="interno-asc">Interno A-Z</option>
                  <option value="interno-desc">Interno Z-A</option>
                  <option value="atencion">Atención primero</option>
                </NativeSelect>
              </div>
              <div className="unidades-view-toggle" role="group" aria-label="Vista">
                <button
                  type="button"
                  aria-label="Lista"
                  aria-pressed={vista === 'list'}
                  onClick={() => setVista('list')}
                >
                  <List className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Cuadrícula"
                  aria-pressed={vista === 'grid'}
                  onClick={() => setVista('grid')}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="empty-state unidades-empty">
              <h2>
                {buscando
                  ? 'No hay unidades que coincidan'
                  : 'No hay unidades'}
              </h2>
              <p className="muted">
                {buscando
                  ? 'Ajuste la búsqueda o los filtros.'
                  : 'No hay unidades registradas.'}
              </p>
              {buscando ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={limpiarTodosLosFiltros}
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div
              className={
                vista === 'grid' ? 'unidades-view-grid' : 'unidades-view-list'
              }
            >
              <div className="unidades-table">
                <DataTable columns={columns} data={visibles} />
              </div>
              <div className="unidades-cards">
                {visibles.map((unidad) => (
                  <UnidadCard
                    key={unidad.id}
                    unidad={unidad}
                    tieneAviso={conAviso.has(unidad.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Refine el listado. La búsqueda permanece en la pantalla.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            <Field label="Estado" htmlFor="unidadEstadoSheet">
              <NativeSelect
                id="unidadEstadoSheet"
                value={estadoDraft}
                onChange={(e) => setEstadoDraft(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </NativeSelect>
            </Field>
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                limpiarFiltrosSecundarios();
              }}
            >
              Limpiar filtros
            </Button>
            <Button type="button" onClick={aplicarFiltros}>
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={tiposOpen}
        onOpenChange={(next) => {
          setTiposOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px]">Tipos de unidad</DialogTitle>
            <DialogDescription>
              Edite o elimine un tipo. Nuevo tipo sigue en Administrar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{tipo.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {resumenAvisoMantenimiento(
                      umbrales[tipo.id]?.tKm ?? DEFAULT_T_KM,
                      umbrales[tipo.id]?.tDias ?? DEFAULT_T_DIAS,
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => abrirEdicionFamilia(tipo)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="compact"
                    onClick={() => void eliminarFamilia(tipo)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTiposOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
