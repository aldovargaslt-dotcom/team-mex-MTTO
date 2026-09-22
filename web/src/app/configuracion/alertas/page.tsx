'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
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
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { etiquetaMinimo, resumenAvisoMantenimiento } from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  AlertFamily,
  AlertOwningModule,
  AlertType,
  CatalogUmbrales,
  Role,
  ThresholdMode,
} from '@/lib/types';

function etiquetaFamilia(family: AlertFamily) {
  return family === 'FLOTA' ? 'Flota' : 'Mantenimiento';
}

function etiquetaModulo(mod: AlertOwningModule) {
  if (mod === 'INVENTARIO') return 'Inventario';
  if (mod === 'SALUD') return 'Salud';
  if (mod === 'ALERTAS') return 'Flota';
  if (mod === 'OTRO') return 'Otro';
  return 'Mantenimiento';
}

function ledeParaRol(role: Role | null) {
  if (role === 'LOGISTICA') {
    return 'Tipos que configuras aquí. Lo que llega a la campanita: unidad sin regreso.';
  }
  if (role === 'SUPERVISOR') {
    return 'Tipos que configuras aquí. Lo que llega a la campanita: mantenimiento, existencias y salud.';
  }
  return 'Tipos que configuras aquí. Lo que llega a la campanita. Alta y baja solo en esta lista.';
}

export default function ConfiguracionAlertasPage() {
  return <CatalogContent />;
}

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, userId, isAdmin } = useRole();
  const wantedCode = searchParams.get('code');
  const [rows, setRows] = useState<AlertType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<AlertType | null>(null);

  async function cargar() {
    const data = await api<AlertType[]>('/configuracion/alertas', {
      role: role!,
      userId,
    });
    setRows(data);
    return data;
  }

  useEffect(() => {
    if (!role) return;
    void cargar()
      .then((data) => {
        if (!wantedCode) return;
        const match = data.find((row) => row.code === wantedCode);
        if (match) setSelected(match);
      })
      .catch((err) => {
        setRows([]);
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar las alertas.',
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, wantedCode]);

  const columns = useMemo<ColumnDef<AlertType, unknown>[]>(() => {
    const cols: ColumnDef<AlertType, unknown>[] = [
      {
        accessorKey: 'label',
        header: 'Alerta',
        cell: ({ row }) => (
          <span className="font-medium text-navy">{row.original.label}</span>
        ),
      },
      {
        accessorKey: 'family',
        header: 'Área',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {etiquetaFamilia(row.original.family)}
          </span>
        ),
      },
      {
        accessorKey: 'owningModule',
        header: 'Dueño',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {etiquetaModulo(row.original.owningModule)}
          </span>
        ),
      },
    ];
    if (isAdmin && (rows ?? []).some((row) => !row.active)) {
      cols.push({
        accessorKey: 'active',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.active ? null : (
            <Badge variant="muted">Inactiva</Badge>
          ),
      });
    }
    return cols;
  }, [isAdmin, rows]);

  function openType(row: AlertType) {
    setSelected(row);
    const params = new URLSearchParams(searchParams.toString());
    params.set('code', row.code);
    router.replace(`/configuracion/alertas?${params.toString()}`);
  }

  function closeType() {
    setSelected(null);
    router.replace('/configuracion/alertas');
  }

  return (
    <div className="unidades-page">
      <PageHeader
        title="Alertas"
        lede={ledeParaRol(role)}
        actions={
          isAdmin ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Nueva alerta
            </Button>
          ) : null
        }
      />
      <FormAlert>{error}</FormAlert>
      {rows == null ? (
        <p className="muted">Cargando alertas…</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h2>No hay alertas para este rol.</h2>
          <p>
            Las alertas de otras áreas las ve administración. Las inactivas no se
            listan aquí.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={openType}
          empty="No hay alertas para este rol."
        />
      )}
      {isAdmin ? (
        <CreateAlertDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          role={role!}
          userId={userId}
          onCreated={() => void cargar()}
        />
      ) : null}
      {selected && role ? (
        <TypeEditorDialog
          type={selected}
          role={role}
          userId={userId}
          isAdmin={isAdmin}
          onClose={closeType}
          onChanged={() => void cargar()}
        />
      ) : null}
    </div>
  );
}

function CreateAlertDialog({
  open,
  onOpenChange,
  role,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  userId?: string;
  onCreated: () => void;
}) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [family, setFamily] = useState<AlertFamily>('MTTO');
  const [owningModule, setOwningModule] = useState<AlertOwningModule>('OTRO');
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('MODULE');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/configuracion/alertas', {
        role,
        userId,
        method: 'POST',
        body: JSON.stringify({
          code,
          label,
          family,
          owningModule,
          thresholdMode,
          active,
        }),
      });
      onOpenChange(false);
      setCode('');
      setLabel('');
      setActive(true);
      onCreated();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo crear la alerta.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void onSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Nueva alerta</DialogTitle>
            <DialogDescription>
              Nombre que ve el taller. El código queda fijo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <Field label="Código" htmlFor="alerta-code">
              <Input
                id="alerta-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="font-mono"
              />
            </Field>
            <Field label="Nombre" htmlFor="alerta-nombre">
              <Input
                id="alerta-nombre"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </Field>
            <Field label="Área" htmlFor="alerta-familia">
              <NativeSelect
                id="alerta-familia"
                value={family}
                onChange={(e) => setFamily(e.target.value as AlertFamily)}
              >
                <option value="MTTO">Mantenimiento</option>
                <option value="FLOTA">Flota</option>
              </NativeSelect>
            </Field>
            <Field label="Dueño" htmlFor="alerta-modulo">
              <NativeSelect
                id="alerta-modulo"
                value={owningModule}
                onChange={(e) =>
                  setOwningModule(e.target.value as AlertOwningModule)
                }
              >
                <option value="ANDON">Mantenimiento</option>
                <option value="INVENTARIO">Inventario</option>
                <option value="SALUD">Salud</option>
                <option value="ALERTAS">Flota</option>
                <option value="OTRO">Otro</option>
              </NativeSelect>
            </Field>
            <Field label="Se ajusta en" htmlFor="alerta-modo">
              <NativeSelect
                id="alerta-modo"
                value={thresholdMode}
                onChange={(e) =>
                  setThresholdMode(e.target.value as ThresholdMode)
                }
              >
                <option value="MODULE">Unidades o existencias</option>
                <option value="CATALOG">Esta lista</option>
              </NativeSelect>
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activa
            </label>
            <FormAlert>{error}</FormAlert>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypeEditorDialog({
  type,
  role,
  userId,
  isAdmin,
  onClose,
  onChanged,
}: {
  type: AlertType;
  role: Role;
  userId?: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [payload, setPayload] = useState<CatalogUmbrales | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [andonDraft, setAndonDraft] = useState<
    Record<string, { tKm: string; tDias: string }>
  >({});
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [localH, setLocalH] = useState('8');
  const [foraneoH, setForaneoH] = useState('24');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState('60');
  const [recoveryThreshold, setRecoveryThreshold] = useState('65');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSaved(false);
    void api<CatalogUmbrales>(
      `/configuracion/alertas/${type.code}/umbrales`,
      { role, userId },
    )
      .then((data) => {
        setPayload(data);
        if (data.umbrales) {
          setAndonDraft(
            Object.fromEntries(
              data.umbrales.map((row) => [
                row.tipoVehiculoId,
                { tKm: String(row.tKm), tDias: String(row.tDias) },
              ]),
            ),
          );
        }
        if (data.items) {
          setStockDraft(
            Object.fromEntries(
              data.items.map((row) => [
                row.itemId,
                row.minQty == null ? '' : String(row.minQty),
              ]),
            ),
          );
        }
        if (data.sinRegreso) {
          setLocalH(String(data.sinRegreso.localH));
          setForaneoH(String(data.sinRegreso.foraneoH));
        }
        if (data.salud) {
          setAlertEnabled(data.salud.alertEnabled);
          setAlertThreshold(String(data.salud.alertThreshold));
          setRecoveryThreshold(String(data.salud.recoveryThreshold));
        }
      })
      .catch((err) => {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudo cargar la configuración.',
        );
      })
      .finally(() => setLoading(false));
  }, [type.code, role, userId]);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let body: unknown = {};
      if (type.code === 'MTTO_VENCIDO') {
        body = {
          umbrales: Object.entries(andonDraft).map(([tipoVehiculoId, d]) => ({
            tipoVehiculoId,
            tKm: Number(d.tKm),
            tDias: Number(d.tDias),
          })),
        };
      } else if (type.code === 'STOCK_BAJO') {
        body = {
          items: Object.entries(stockDraft).map(([itemId, raw]) => ({
            itemId,
            minQty: raw.trim() === '' ? null : Number(raw),
          })),
        };
      } else if (type.code === 'SALUD_UMBRAL') {
        body = {
          alertEnabled,
          alertThreshold: Number(alertThreshold),
          recoveryThreshold: Number(recoveryThreshold),
        };
      } else if (type.code === 'FLOTA_SIN_REGRESO') {
        body = { localH: Number(localH), foraneoH: Number(foraneoH) };
      } else {
        onClose();
        return;
      }
      await api(`/configuracion/alertas/${type.code}/umbrales`, {
        role,
        userId,
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo guardar la configuración.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function setActive(active: boolean) {
    setSaving(true);
    setError(null);
    try {
      await api(`/configuracion/alertas/${type.code}`, {
        role,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo cambiar el estado.',
      );
    } finally {
      setSaving(false);
    }
  }

  const canEditValues = [
    'MTTO_VENCIDO',
    'STOCK_BAJO',
    'SALUD_UMBRAL',
    'FLOTA_SIN_REGRESO',
  ].includes(type.code);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={(e) => void guardar(e)}>
          <DialogHeader>
            <DialogTitle>{type.label}</DialogTitle>
            <DialogDescription>
              {etiquetaFamilia(type.family)} · {etiquetaModulo(type.owningModule)}
              {isAdmin ? (
                <span className="mt-0.5 block font-mono text-[12px] font-normal">
                  {type.code}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {loading ? (
              <p className="muted">Cargando…</p>
            ) : (
              <>
                {type.code === 'MTTO_VENCIDO' && payload?.umbrales ? (
                  payload.umbrales.map((row) => (
                    <div key={row.tipoVehiculoId} className="grid gap-2">
                      <p className="text-[13px] font-medium text-navy">
                        {row.tipoNombre}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {resumenAvisoMantenimiento(
                          Number(andonDraft[row.tipoVehiculoId]?.tKm ?? row.tKm),
                          Number(
                            andonDraft[row.tipoVehiculoId]?.tDias ?? row.tDias,
                          ),
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Kilómetros" htmlFor={`km-${row.tipoVehiculoId}`}>
                          <Input
                            id={`km-${row.tipoVehiculoId}`}
                            type="number"
                            min={1}
                            value={andonDraft[row.tipoVehiculoId]?.tKm ?? ''}
                            onChange={(e) =>
                              setAndonDraft((prev) => ({
                                ...prev,
                                [row.tipoVehiculoId]: {
                                  tKm: e.target.value,
                                  tDias: prev[row.tipoVehiculoId]?.tDias ?? '',
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field
                          label="Días sin visita"
                          htmlFor={`dias-${row.tipoVehiculoId}`}
                        >
                          <Input
                            id={`dias-${row.tipoVehiculoId}`}
                            type="number"
                            min={1}
                            value={andonDraft[row.tipoVehiculoId]?.tDias ?? ''}
                            onChange={(e) =>
                              setAndonDraft((prev) => ({
                                ...prev,
                                [row.tipoVehiculoId]: {
                                  tKm: prev[row.tipoVehiculoId]?.tKm ?? '',
                                  tDias: e.target.value,
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))
                ) : null}
                {type.code === 'STOCK_BAJO' && payload?.items ? (
                  <div className="grid gap-2">
                    <p className="text-[13px] text-muted-foreground">
                      Avisar si quedan. Vacío = no avisar. También se edita en
                      Existencias.
                    </p>
                    {payload.items.map((row) => (
                      <Field
                        key={row.itemId}
                        label={`${row.nombre} · ${etiquetaMinimo(row.minQty)}`}
                        htmlFor={`min-${row.itemId}`}
                      >
                        <Input
                          id={`min-${row.itemId}`}
                          type="number"
                          min={0}
                          placeholder="Sin aviso"
                          value={stockDraft[row.itemId] ?? ''}
                          onChange={(e) =>
                            setStockDraft((prev) => ({
                              ...prev,
                              [row.itemId]: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    ))}
                  </div>
                ) : null}
                {type.code === 'SALUD_UMBRAL' ? (
                  <>
                    <label className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={alertEnabled}
                        onChange={(e) => setAlertEnabled(e.target.checked)}
                      />
                      Avisar en campanita
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Avisar bajo" htmlFor="salud-alert">
                        <Input
                          id="salud-alert"
                          type="number"
                          min={0}
                          max={100}
                          value={alertThreshold}
                          onChange={(e) => setAlertThreshold(e.target.value)}
                        />
                      </Field>
                      <Field label="Recuperar desde" htmlFor="salud-rec">
                        <Input
                          id="salud-rec"
                          type="number"
                          min={0}
                          max={100}
                          value={recoveryThreshold}
                          onChange={(e) => setRecoveryThreshold(e.target.value)}
                        />
                      </Field>
                    </div>
                  </>
                ) : null}
                {type.code === 'FLOTA_SIN_REGRESO' ? (
                  <>
                    <Field
                      label="Local (horas)"
                      htmlFor="horas-local"
                      help="Sale de CEDIS / patio. Reloj desde registrar salida."
                    >
                      <Input
                        id="horas-local"
                        type="number"
                        min={1}
                        value={localH}
                        onChange={(e) => setLocalH(e.target.value)}
                        required
                      />
                    </Field>
                    <Field
                      label="Foránea (horas)"
                      htmlFor="horas-foraneo"
                      help="Viaje fuera. Reloj desde registrar salida."
                    >
                      <Input
                        id="horas-foraneo"
                        type="number"
                        min={1}
                        value={foraneoH}
                        onChange={(e) => setForaneoH(e.target.value)}
                        required
                      />
                    </Field>
                  </>
                ) : null}
                {!canEditValues ? (
                  <p className="text-[13px] text-muted-foreground">
                    Este tipo no tiene avisos configurables aún.
                  </p>
                ) : null}
              </>
            )}
            <FormAlert>{error}</FormAlert>
            {saved ? (
              <p className="text-[13px] text-muted-foreground">
                Cambios guardados.
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {isAdmin ? (
              <Button
                type="button"
                variant={type.active ? 'dangerSoft' : 'outline'}
                disabled={saving}
                onClick={() => void setActive(!type.active)}
              >
                {type.active ? 'Desactivar' : 'Reactivar'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              {canEditValues ? (
                <Button
                  type="submit"
                  variant={isAdmin ? 'outline' : 'default'}
                  disabled={saving || loading}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
