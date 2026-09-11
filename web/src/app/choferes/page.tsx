'use client';

import { FormEvent, useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Chofer } from '@/lib/types';

export default function ChoferesPage() {
  return (
    <RoleGate adminOnly>
      <ChoferesAdmin />
    </RoleGate>
  );
}

function ChoferesAdmin() {
  const { role, userId } = useRole();
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Chofer | null>(null);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);

  async function cargar() {
    setChoferes(await api<Chofer[]>('/choferes', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar los choferes.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function abrirAlta() {
    setEditing(null);
    setNombre('');
    setError(null);
    setOpen(true);
  }

  function abrirEdicion(chofer: Chofer) {
    setEditing(chofer);
    setNombre(chofer.nombre);
    setError(null);
    setOpen(true);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await api<Chofer>(`/choferes/${editing.id}`, {
          role: role!,
          userId,
          method: 'PATCH',
          body: JSON.stringify({ nombre: nombre.trim() }),
        });
      } else {
        await api<Chofer>('/choferes', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({ nombre: nombre.trim() }),
        });
      }
      setOpen(false);
      setEditing(null);
      setNombre('');
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : editing
            ? 'No se pudo actualizar el chofer.'
            : 'No se pudo crear el chofer.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este chofer del catálogo?')) return;
    setError(null);
    try {
      await api(`/choferes/${id}`, {
        role: role!,
        userId,
        method: 'DELETE',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo eliminar el chofer.',
      );
    }
  }

  const columns: ColumnDef<Chofer, unknown>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium text-navy">{row.original.nombre}</span>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => abrirEdicion(row.original)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="compact"
            onClick={() => void eliminar(row.original.id)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Choferes"
        lede="Catálogo de visitas. El supervisor solo selecciona; no da de alta."
        actions={
          <Button type="button" onClick={abrirAlta}>
            Agregar chofer
          </Button>
        }
      />

      <FormAlert>{error && !open ? error : null}</FormAlert>

      <DataTable
        columns={columns}
        data={choferes}
        empty="No hay choferes. Use Agregar chofer."
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setNombre('');
          }
        }}
      >
        <DialogContent>
          <form onSubmit={guardar}>
            <DialogHeader>
              <DialogTitle className="text-[16px]">
                {editing ? 'Editar chofer' : 'Agregar chofer'}
              </DialogTitle>
              <DialogDescription>
                Nombre como aparece en la visita de mantenimiento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <Field label="Nombre" htmlFor="choferNombre">
                <Input
                  id="choferNombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  autoFocus
                />
              </Field>
              <FormAlert>{open ? error : null}</FormAlert>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !nombre.trim()}>
                {saving
                  ? 'Guardando…'
                  : editing
                    ? 'Guardar'
                    : 'Agregar chofer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
