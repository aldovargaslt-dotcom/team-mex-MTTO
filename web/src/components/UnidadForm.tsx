'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { EstadoUnidad, TipoVehiculo, Unidad } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FormAlert } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { ImageDropzone } from '@/components/ImageDropzone';
import { UnidadMarca } from '@/components/UnidadTipoMark';

export type UnidadFormValues = {
  numeroInterno: string;
  placas: string;
  vin: string;
  tipoId: string;
  estado: EstadoUnidad;
  marcaModelo: string;
  anio: string;
  fotoDataUrl: string;
};

export function UnidadForm({
  role,
  userId,
  initial,
  defaultTipoId,
  submitLabel,
  onSubmit,
  error,
}: {
  role: string;
  userId: string;
  initial?: Partial<Unidad>;
  defaultTipoId?: string;
  submitLabel: string;
  onSubmit: (values: UnidadFormValues) => Promise<void>;
  error: string | null;
}) {
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [values, setValues] = useState<UnidadFormValues>({
    numeroInterno: initial?.numeroInterno ?? '',
    placas: initial?.placas ?? '',
    vin: initial?.vin ?? '',
    tipoId: initial?.tipo?.id ?? defaultTipoId ?? '',
    estado: initial?.estado ?? 'ACTIVA',
    marcaModelo: initial?.marcaModelo ?? '',
    anio: initial?.anio != null ? String(initial.anio) : '',
    fotoDataUrl: initial?.fotoDataUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const tipoActual = tipos.find((tipo) => tipo.id === values.tipoId);

  useEffect(() => {
    void (async () => {
      setTipos(await api<TipoVehiculo[]>('/unidades/tipos', { role, userId }));
    })();
  }, [role, userId]);

  useEffect(() => {
    if (!initial) return;
    setValues({
      numeroInterno: initial.numeroInterno ?? '',
      placas: initial.placas ?? '',
      vin: initial.vin ?? '',
      tipoId: initial.tipo?.id ?? defaultTipoId ?? '',
      estado: initial.estado ?? 'ACTIVA',
      marcaModelo: initial.marcaModelo ?? '',
      anio: initial.anio != null ? String(initial.anio) : '',
      fotoDataUrl: initial.fotoDataUrl ?? '',
    });
  }, [initial, defaultTipoId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof UnidadFormValues>(
    key: K,
    value: UnidadFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
      <Card className="grid gap-3 p-4 sm:col-span-2 sm:grid-cols-2">
      <Field label="Foto de la unidad" htmlFor="foto-unidad" className="sm:col-span-2">
        <div id="foto-unidad" className="grid gap-2">
          <UnidadMarca
            foto={values.fotoDataUrl || null}
            nombre={tipoActual?.nombre ?? ''}
            icono={tipoActual?.icono}
            size="lg"
            className="unidad-foto--editor"
          />
          <p className="muted text-xs">
            Se guarda en la unidad. Sin foto, se usa el icono del tipo.
          </p>
          <ImageDropzone
            label="Tomar o subir"
            hint="Una sola foto."
            disabled={saving}
            onFile={(file) => {
              if (!file.type.startsWith('image/')) {
                setFotoError('Elija una imagen.');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result !== 'string') return;
                if (reader.result.length > 1_500_000) {
                  setFotoError('La foto de la unidad es demasiado grande.');
                  return;
                }
                setFotoError(null);
                set('fotoDataUrl', reader.result);
              };
              reader.readAsDataURL(file);
            }}
          />
          {values.fotoDataUrl ? (
            <button
              type="button"
              className="text-left text-[13px] text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setFotoError(null);
                set('fotoDataUrl', '');
              }}
            >
              Quitar foto
            </button>
          ) : null}
          {fotoError ? <FormAlert>{fotoError}</FormAlert> : null}
        </div>
      </Field>
      <Field label="Número interno" htmlFor="numeroInterno">
        <Input
          id="numeroInterno"
          required
          value={values.numeroInterno}
          onChange={(e) => set('numeroInterno', e.target.value)}
        />
      </Field>
      <Field label="Placas" htmlFor="placas">
        <Input
          id="placas"
          required
          value={values.placas}
          onChange={(e) => set('placas', e.target.value)}
        />
      </Field>
      <Field label="VIN" htmlFor="vin">
        <Input
          id="vin"
          maxLength={32}
          value={values.vin}
          onChange={(e) => set('vin', e.target.value)}
          placeholder="Opcional"
        />
      </Field>
      <Field label="Tipo" htmlFor="tipoId">
        <NativeSelect
          id="tipoId"
          required
          value={values.tipoId}
          onChange={(e) => set('tipoId', e.target.value)}
        >
          <option value="">Seleccione un tipo</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Estado" htmlFor="estado">
        <NativeSelect
          id="estado"
          value={values.estado}
          onChange={(e) => set('estado', e.target.value as EstadoUnidad)}
        >
          <option value="ACTIVA">Activa</option>
          <option value="INACTIVA">Inactiva</option>
        </NativeSelect>
      </Field>
      <Field label="Marca / modelo" htmlFor="marcaModelo">
        <Input
          id="marcaModelo"
          value={values.marcaModelo}
          onChange={(e) => set('marcaModelo', e.target.value)}
          placeholder="Ej. International MV"
        />
      </Field>
      <Field label="Año" htmlFor="anio">
        <Input
          id="anio"
          type="number"
          min={1980}
          max={2100}
          value={values.anio}
          onChange={(e) => set('anio', e.target.value)}
        />
      </Field>
      {error ? (
        <div className="sm:col-span-2">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/unidades">Cancelar</Link>
        </Button>
      </div>
      </Card>
    </form>
  );
}

export function toPayload(values: UnidadFormValues) {
  return {
    numeroInterno: values.numeroInterno.trim(),
    placas: values.placas.trim(),
    vin: values.vin.trim() || undefined,
    tipoId: values.tipoId,
    estado: values.estado,
    marcaModelo: values.marcaModelo.trim() || undefined,
    anio: values.anio ? Number(values.anio) : undefined,
    fotoDataUrl: values.fotoDataUrl.trim() || null,
  };
}
