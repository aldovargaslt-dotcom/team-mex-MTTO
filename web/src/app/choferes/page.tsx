'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { ChoferEstadoBadge } from '@/components/StatusBadge';
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
import { useRole } from '@/lib/role';
import type { Chofer, EstadoChofer } from '@/lib/types';

type FiltroEstado = 'ACTIVO' | 'TODOS';

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
  const [filtro, setFiltro] = useState<FiltroEstado>('ACTIVO');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Chofer | null>(null);
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<EstadoChofer>('ACTIVO');
  const [saving, setSaving] = useState(false);

  async function cargar(estadoFiltro: FiltroEstado = filtro) {
    const qs = estadoFiltro === 'ACTIVO' ? '?estado=ACTIVO' : '';
    setChoferes(await api<Chofer[]>(`/choferes${qs}`, { role: role!, userId }));
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
  }, [role, filtro]);

  function abrirAlta() {
    setEditing(null);
    setNombre('');
    setEstado('ACTIVO');
    setError(null);
    setOpen(true);
  }

  function abrirEdicion(chofer: Chofer) {
    setEditing(chofer);
    setNombre(chofer.nombre);
    setEstado(chofer.estado);
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
          body: JSON.stringify({
            nombre: nombre.trim(),
            estado,
          }),
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
      setEstado('ACTIVO');
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

  async function cambiarEstado(chofer: Chofer, siguiente: EstadoChofer) {
    const pasaAInactivo = siguiente === 'INACTIVO';
    const ok = window.confirm(
      pasaAInactivo
        ? `¿Pasar a INACTIVO a ${chofer.nombre}? No aparecerá en visitas nuevas; el historial lo conserva.`
        : `¿Reactivar a ${chofer.nombre}? Volverá al select de visitas.`,
    );
    if (!ok) return;
    setError(null);
    try {
      await api<Chofer>(`/choferes/${chofer.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ estado: siguiente }),
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo actualizar el estado del chofer.',
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
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <ChoferEstadoBadge estado={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => {
        const activo = row.original.estado === 'ACTIVO';
        return (
          <div className="row-actions">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => abrirEdicion(row.original)}
            >
              Editar
            </Button>
            {activo ? (
              <Button
                type="button"
                variant="destructive"
                size="compact"
                onClick={() => void cambiarEstado(row.original, 'INACTIVO')}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="compact"
                onClick={() => void cambiarEstado(row.original, 'ACTIVO')}
              >
                Reactivar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Choferes"
        lede="Catálogo de visitas. El supervisor solo selecciona activos; no da de alta."
        actions={
          <Button type="button" onClick={abrirAlta}>
            Agregar chofer
          </Button>
        }
      />

      <Card className="mb-3 flex flex-wrap items-end gap-2 p-3">
        <Field label="Mostrar" htmlFor="filtroEstado" className="w-[200px]">
          <NativeSelect
            id="filtroEstado"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroEstado)}
          >
            <option value="ACTIVO">Activos</option>
            <option value="TODOS">Todos</option>
          </NativeSelect>
        </Field>
      </Card>

      <FormAlert>{error && !open ? error : null}</FormAlert>

      <DataTable
        columns={columns}
        data={choferes}
        empty={
          filtro === 'ACTIVO'
            ? 'No hay choferes activos. Use Agregar chofer o el filtro Todos.'
            : 'No hay choferes. Use Agregar chofer.'
        }
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setNombre('');
            setEstado('ACTIVO');
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
                {editing
                  ? 'INACTIVO lo oculta del select de visitas; el historial conserva el nombre.'
                  : 'El alta queda ACTIVO y aparece en el select de visitas.'}
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
              {editing ? (
                <Field label="Estado" htmlFor="choferEstado">
                  <NativeSelect
                    id="choferEstado"
                    value={estado}
                    onChange={(e) =>
                      setEstado(e.target.value as EstadoChofer)
                    }
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </NativeSelect>
                </Field>
              ) : null}
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
