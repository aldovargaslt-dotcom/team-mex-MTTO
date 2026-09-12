'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
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
import { Input } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { resumenAvisoMantenimiento } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';

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
  const [numeroInterno, setNumeroInterno] = useState('');
  const [placas, setPlacas] = useState('');
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

  async function cargar(overrides?: { numeroInterno?: string; placas?: string }) {
    if (!role) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const n = overrides?.numeroInterno ?? numeroInterno;
    const p = overrides?.placas ?? placas;
    if (n.trim()) params.set('numeroInterno', n.trim());
    if (p.trim()) params.set('placas', p.trim());
    const qs = params.toString();
    try {
      const [lista, catalogo, umb] = await Promise.all([
        api<Unidad[]>(`/unidades${qs ? `?${qs}` : ''}`, { role, userId }),
        api<TipoVehiculo[]>('/unidades/tipos', { role, userId }),
        api<UmbralAndon[]>('/andon/umbrales', { role, userId }),
      ]);
      setUnidades(lista);
      setTipos(catalogo);
      setUmbrales(Object.fromEntries(umb.map((u) => [u.tipoVehiculoId, u])));
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
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

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
            ? 'No se pudo actualizar la familia.'
            : 'No se pudo crear la familia.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function eliminarFamilia(tipo: TipoVehiculo) {
    const ok = window.confirm(
      `¿Eliminar la familia ${tipo.nombre}? Solo se puede si no tiene unidades.`,
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
          : 'No se pudo eliminar la familia.',
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

  const buscando = Boolean(numeroInterno.trim() || placas.trim());
  const grupos = useMemo(() => {
    const byTipo = new Map<string, Unidad[]>();
    for (const unidad of unidades ?? []) {
      const id = unidad.tipo.id;
      const list = byTipo.get(id) ?? [];
      list.push(unidad);
      byTipo.set(id, list);
    }
    return tipos
      .map((tipo) => ({
        tipo,
        unidades: byTipo.get(tipo.id) ?? [],
        umbral: umbrales[tipo.id],
      }))
      .filter((grupo) => {
        if (buscando) return grupo.unidades.length > 0;
        if (isAdmin) return true;
        return grupo.unidades.length > 0;
      });
  }, [tipos, unidades, umbrales, buscando, isAdmin]);

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'numeroInterno',
        header: 'Interno',
        cell: ({ row }) => (
          <span className="mono">{row.original.numeroInterno}</span>
        ),
      },
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => (
          <span>
            {row.original.marcaModelo
              ? `${row.original.marcaModelo}${
                  row.original.anio ? ` · ${row.original.anio}` : ''
                }`
              : '—'}
          </span>
        ),
      },
      { accessorKey: 'placas', header: 'Placas' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge estado={row.original.estado} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Unidades"
        lede="Flota agrupada por familia. Consulte por número interno o placas."
        actions={
          isAdmin ? (
            tipos.length > 0 ? (
              <>
                <Button type="button" variant="secondary" onClick={abrirAlertas}>
                  Configurar alertas
                </Button>
                <Button type="button" variant="secondary" onClick={abrirAltaFamilia}>
                  Nueva familia
                </Button>
                <Button asChild>
                  <Link href="/unidades/nueva">Nueva unidad</Link>
                </Button>
              </>
            ) : (
              <Button type="button" onClick={abrirAltaFamilia}>
                Nueva familia
              </Button>
            )
          ) : null
        }
      />

      <form className="mb-3" onSubmit={onSearch}>
        <Card className="filters">
          <Field label="Número interno" htmlFor="numeroInterno">
            <Input
              id="numeroInterno"
              value={numeroInterno}
              onChange={(e) => setNumeroInterno(e.target.value)}
              placeholder="Ej. U-101"
            />
          </Field>
          <Field label="Placas" htmlFor="placas">
            <Input
              id="placas"
              value={placas}
              onChange={(e) => setPlacas(e.target.value)}
              placeholder="Ej. TMX-101-A"
            />
          </Field>
          <Field label=" " htmlFor="buscar">
            <Button id="buscar" variant="outline" type="submit" className="w-full">
              Buscar
            </Button>
          </Field>
        </Card>
      </form>

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
            {buscando
              ? 'No hay unidades que coincidan'
              : isAdmin
                ? 'No hay familias'
                : 'No hay unidades'}
          </h2>
          <p className="muted">
            {buscando
              ? 'Ajuste los filtros.'
              : isAdmin
                ? 'Agregue la primera familia para clasificar la flota.'
                : 'No hay unidades registradas.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {grupos.map((grupo) => (
            <section key={grupo.tipo.id} aria-labelledby={`familia-${grupo.tipo.id}`}>
              <div className="mb-1 flex min-h-11 flex-wrap items-center justify-between gap-2">
                <div>
                  <h2
                    id={`familia-${grupo.tipo.id}`}
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
                empty="No hay unidades en esta familia."
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
                {editing ? 'Editar familia' : 'Nueva familia'}
              </DialogTitle>
              <DialogDescription>
                Nombre y descripción de la familia.
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
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Agregar familia'}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={guardarAlertas}>
            <DialogHeader>
              <DialogTitle className="text-[16px]">Alertas de mantenimiento</DialogTitle>
              <DialogDescription>
                Te avisamos en la campanita cuando una unidad recorra demasiados
                kilómetros o pase demasiado tiempo sin visita. Basta con que se
                cumpla una de las dos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
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
                        label="Kilómetros"
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
                        label="Días sin visita"
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
