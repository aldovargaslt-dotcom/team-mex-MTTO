'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { AlertasSinRegresoConfig } from '@/lib/types';

export default function FlotaAlertasPage() {
  const { role, userId } = useRole();
  const [localH, setLocalH] = useState('8');
  const [foraneoH, setForaneoH] = useState('24');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!role) return;
    void api<AlertasSinRegresoConfig>('/logistica/alertas/sin-regreso', {
      role,
      userId,
    })
      .then((cfg) => {
        setLocalH(String(cfg.localH));
        setForaneoH(String(cfg.foraneoH));
      })
      .catch((err) => {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudo cargar la configuración.',
        );
      })
      .finally(() => setLoading(false));
  }, [role, userId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!role) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cfg = await api<AlertasSinRegresoConfig>(
        '/logistica/alertas/sin-regreso',
        {
          role,
          userId,
          method: 'PATCH',
          body: JSON.stringify({
            localH: Number(localH),
            foraneoH: Number(foraneoH),
          }),
        },
      );
      setLocalH(String(cfg.localH));
      setForaneoH(String(cfg.foraneoH));
      setSaved(true);
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

  return (
    <div className="unidades-page">
      <PageHeader
        title="Config alertas"
        lede="Umbral de tiempo sin regreso. Local 8 h y foránea 24 h por defecto. La unidad gana si hay override."
        actions={
          <Button type="button" variant="quiet" asChild>
            <Link href="/flota">Volver a Flota</Link>
          </Button>
        }
      />
      {loading ? (
        <p className="muted">Cargando configuración…</p>
      ) : (
        <form className="grid max-w-md gap-4" onSubmit={onSubmit}>
          <Field
            label="Local (horas)"
            htmlFor="umbral-local"
            help="Sale de CEDIS / patio. Reloj desde registrar salida."
          >
            <Input
              id="umbral-local"
              type="number"
              min={1}
              step={1}
              value={localH}
              onChange={(e) => setLocalH(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Foránea (horas)"
            htmlFor="umbral-foraneo"
            help="Viaje fuera. Reloj desde registrar salida."
          >
            <Input
              id="umbral-foraneo"
              type="number"
              min={1}
              step={1}
              value={foraneoH}
              onChange={(e) => setForaneoH(e.target.value)}
              required
            />
          </Field>
          <FormAlert>{error}</FormAlert>
          {saved ? (
            <p className="text-sm text-muted-foreground">Cambios guardados.</p>
          ) : null}
          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar umbrales'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
