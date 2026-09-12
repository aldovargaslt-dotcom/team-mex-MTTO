'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
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
import { useRole } from '@/lib/role';
import type { EstadoSitio, SitioFlota } from '@/lib/types';

export default function SitiosPage() {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <SitiosAdmin />
    </RoleGate>
  );
}

function SitiosAdmin() {
  const { role, userId } = useRole();
  const [sitios, setSitios] = useState<SitioFlota[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SitioFlota | null>(null);
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<EstadoSitio>('ACTIVO');
  const [saving, setSaving] = useState(false);

  async function cargar() {
    setSitios(await api<SitioFlota[]>('/flota/sitios', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError ? err.message : 'No se pudieron cargar los sitios.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const columns = useMemo<ColumnDef<SitioFlota>[]>(
    () => [
      { accessorKey: 'nombre', header: 'Sitio' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
      },
    ],
    [],
  );

  function abrirAlta() {
    setEditing(null);
    setNombre('');
    setEstado('ACTIVO');
    setError(null);
    setOpen(true);
  }

  function abrirEdicion(sitio: SitioFlota) {
    setEditing(sitio);
    setNombre(sitio.nombre);
    setEstado(sitio.estado);
    setError(null);
    setOpen(true);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api(`/flota/sitios/${editing.id}`, {
          role: role!,
          userId,
          method: 'PATCH',
          body: JSON.stringify({ nombre: nombre.trim(), estado }),
        });
      } else {
        await api('/flota/sitios', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({ nombre: nombre.trim() }),
        });
      }
      setOpen(false);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo guardar el sitio.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Sitios"
        lede="Catálogo de ubicación nominal (Patio, Taller, cliente)."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/flota">Tablero</Link>
            </Button>
            <Button type="button" onClick={abrirAlta}>
              Nuevo sitio
            </Button>
          </>
        }
      />
      <FormAlert>{error}</FormAlert>
      <DataTable
        columns={columns}
        data={sitios}
        empty="No hay sitios."
        onRowClick={abrirEdicion}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={guardar}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar sitio' : 'Nuevo sitio'}</DialogTitle>
              <DialogDescription>
                Nombre único. Un sitio inactivo no se puede elegir en un movimiento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <Field label="Nombre" htmlFor="sitio-nombre">
                <Input
                  id="sitio-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </Field>
              {editing ? (
                <Field label="Estado" htmlFor="sitio-estado">
                  <NativeSelect
                    id="sitio-estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoSitio)}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </NativeSelect>
                </Field>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
