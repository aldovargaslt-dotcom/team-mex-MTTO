'use client';

import { FormEvent, useMemo, useState } from 'react';
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
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import type { HealthConfig, HealthDimensionId, Role } from '@/lib/types';

const DEFAULTS = {
  maintenance: 45,
  alerts: 40,
  inspections: 15,
  alertEnabled: true,
  alertThreshold: 60,
  recoveryThreshold: 65,
  alertSeverity: 'WARNING' as const,
};

const DIM_LABEL: Record<HealthDimensionId, string> = {
  maintenance: 'Mantenimiento',
  alerts: 'Alertas',
  inspections: 'Inspecciones',
};

type Draft = {
  maintenance: string;
  alerts: string;
  inspections: string;
  alertEnabled: boolean;
  alertThreshold: string;
  recoveryThreshold: string;
  alertSeverity: HealthConfig['alertSeverity'];
};

function toDraft(cfg: HealthConfig): Draft {
  const w = Object.fromEntries(cfg.dimensions.map((d) => [d.id, d.weight]));
  return {
    maintenance: String(w.maintenance ?? DEFAULTS.maintenance),
    alerts: String(w.alerts ?? DEFAULTS.alerts),
    inspections: String(w.inspections ?? DEFAULTS.inspections),
    alertEnabled: cfg.alertEnabled,
    alertThreshold: String(cfg.alertThreshold),
    recoveryThreshold: String(cfg.recoveryThreshold),
    alertSeverity: cfg.alertSeverity,
  };
}

function parseIntField(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  return n;
}

export function HealthConfigDialog({
  open,
  onOpenChange,
  role,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  userId?: string;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<HealthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const cfg = await api<HealthConfig>('/salud/config', { role, userId });
      setSaved(cfg);
      setDraft(toDraft(cfg));
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo cargar la configuración de salud.',
      );
    } finally {
      setLoading(false);
    }
  }

  function onOpen(next: boolean) {
    onOpenChange(next);
    if (next) void cargar();
  }

  const parsed = useMemo(() => {
    if (!draft) return null;
    const maintenance = parseIntField(draft.maintenance);
    const alerts = parseIntField(draft.alerts);
    const inspections = parseIntField(draft.inspections);
    const alertThreshold = parseIntField(draft.alertThreshold);
    const recoveryThreshold = parseIntField(draft.recoveryThreshold);
    if (
      maintenance == null ||
      alerts == null ||
      inspections == null ||
      alertThreshold == null ||
      recoveryThreshold == null
    ) {
      return { ok: false as const, sum: NaN, message: 'Indique enteros entre 0 y 100.' };
    }
    const sum = maintenance + alerts + inspections;
    if ([maintenance, alerts, inspections, alertThreshold, recoveryThreshold].some(
      (n) => n < 0 || n > 100,
    )) {
      return { ok: false as const, sum, message: 'Cada porcentaje debe estar entre 0 y 100.' };
    }
    if (sum !== 100) {
      return {
        ok: false as const,
        sum,
        message: `Los pesos deben sumar 100%. Actualmente suman ${sum}%.`,
      };
    }
    if (!(recoveryThreshold > alertThreshold)) {
      return {
        ok: false as const,
        sum,
        message: 'El porcentaje de recuperación debe ser mayor al porcentaje de alerta.',
      };
    }
    return {
      ok: true as const,
      sum,
      payload: {
        dimensions: [
          { id: 'maintenance' as const, weight: maintenance },
          { id: 'alerts' as const, weight: alerts },
          { id: 'inspections' as const, weight: inspections },
        ],
        alertEnabled: draft.alertEnabled,
        alertThreshold,
        recoveryThreshold,
        alertSeverity: draft.alertSeverity,
      },
    };
  }, [draft]);

  function applyDefaults() {
    setDraft({
      maintenance: String(DEFAULTS.maintenance),
      alerts: String(DEFAULTS.alerts),
      inspections: String(DEFAULTS.inspections),
      alertEnabled: DEFAULTS.alertEnabled,
      alertThreshold: String(DEFAULTS.alertThreshold),
      recoveryThreshold: String(DEFAULTS.recoveryThreshold),
      alertSeverity: DEFAULTS.alertSeverity,
    });
    setRestoreConfirm(false);
  }

  async function guardar() {
    if (!parsed || !parsed.ok) return;
    setSaving(true);
    setError(null);
    try {
      await api('/salud/config', {
        role,
        userId,
        method: 'PUT',
        body: JSON.stringify(parsed.payload),
      });
      setConfirmOpen(false);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo guardar la configuración.',
      );
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const weight = (id: HealthDimensionId) =>
    Number(draft?.[id] || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuración de salud</DialogTitle>
            <DialogDescription>
              Define cuánto influye cada dimensión en la salud general de una
              unidad.
            </DialogDescription>
          </DialogHeader>
          {loading || !draft ? (
            <p className="muted">Cargando…</p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (parsed?.ok) setConfirmOpen(true);
              }}
            >
              <FormAlert>{error}</FormAlert>
              {(
                ['maintenance', 'alerts', 'inspections'] as HealthDimensionId[]
              ).map((id) => (
                <Field key={id} label={`${DIM_LABEL[id]} %`} htmlFor={`h-${id}`}>
                  <Input
                    id={`h-${id}`}
                    inputMode="numeric"
                    value={draft[id]}
                    onChange={(e) =>
                      setDraft({ ...draft, [id]: e.target.value })
                    }
                  />
                </Field>
              ))}
              <p className={parsed && !parsed.ok ? 'text-[13px] text-destructive' : 'muted'}>
                Total {Number.isFinite(parsed?.sum) ? parsed?.sum : '—'}%
              </p>
              {parsed && !parsed.ok ? (
                <p role="alert" className="text-[13px] text-destructive">
                  {parsed.message}
                </p>
              ) : null}

              <div>
                <p className="text-[13px] font-medium text-navy">Distribución actual</p>
                {(['maintenance', 'alerts', 'inspections'] as HealthDimensionId[]).map(
                  (id) => (
                    <div key={id} className="mt-1">
                      <div className="flex justify-between text-[12px]">
                        <span>{DIM_LABEL[id]}</span>
                        <span>{weight(id) || 0}%</span>
                      </div>
                      <div className="health-bar-track">
                        <div
                          className="health-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, weight(id)))}%`,
                            background: 'var(--navy)',
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>

              <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
                <legend className="px-1 text-[13px] font-medium">
                  Alertas por salud
                </legend>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={draft.alertEnabled}
                    onChange={(e) =>
                      setDraft({ ...draft, alertEnabled: e.target.checked })
                    }
                  />
                  Generar alertas por Health
                </label>
                <Field label="Generar alerta debajo de %" htmlFor="h-alert">
                  <Input
                    id="h-alert"
                    inputMode="numeric"
                    value={draft.alertThreshold}
                    onChange={(e) =>
                      setDraft({ ...draft, alertThreshold: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Considerar recuperada arriba de %"
                  htmlFor="h-rec"
                >
                  <Input
                    id="h-rec"
                    inputMode="numeric"
                    value={draft.recoveryThreshold}
                    onChange={(e) =>
                      setDraft({ ...draft, recoveryThreshold: e.target.value })
                    }
                  />
                </Field>
                <Field label="Severidad" htmlFor="h-sev">
                  <NativeSelect
                    id="h-sev"
                    value={draft.alertSeverity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        alertSeverity: e.target
                          .value as HealthConfig['alertSeverity'],
                      })
                    }
                  >
                    <option value="LOW">Baja</option>
                    <option value="INFO">Informativa</option>
                    <option value="WARNING">Advertencia</option>
                    <option value="CRITICAL">Crítica</option>
                  </NativeSelect>
                </Field>
              </fieldset>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRestoreConfirm(true)}
                >
                  Restaurar valores predeterminados
                </Button>
                <Button type="submit" variant="secondary" disabled={!parsed?.ok || saving}>
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar configuración de salud</DialogTitle>
            <DialogDescription>
              Este cambio modificará la forma en que se calcula la salud de
              todas las unidades.
            </DialogDescription>
          </DialogHeader>
          {saved && parsed?.ok ? (
            <ul className="text-[13px] flex flex-col gap-1">
              <li>
                Mantenimiento: {saved.dimensions.find((d) => d.id === 'maintenance')?.weight}% →{' '}
                {parsed.payload.dimensions[0].weight}%
              </li>
              <li>
                Alertas: {saved.dimensions.find((d) => d.id === 'alerts')?.weight}% →{' '}
                {parsed.payload.dimensions[1].weight}%
              </li>
              <li>
                Inspecciones: {saved.dimensions.find((d) => d.id === 'inspections')?.weight}% →{' '}
                {parsed.payload.dimensions[2].weight}%
              </li>
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void guardar()} disabled={saving}>
              Actualizar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreConfirm} onOpenChange={setRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar predeterminados</DialogTitle>
            <DialogDescription>
              Pesos 45 / 40 / 15. Alerta debajo de 60%, recuperada arriba de 65%.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRestoreConfirm(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyDefaults}>
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
