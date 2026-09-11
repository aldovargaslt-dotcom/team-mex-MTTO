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
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { TipoVehiculo, Unidad } from '@/lib/types';

export default function UnidadesPage() {
  return (
    <RoleGate>
      <UnidadesList />
    </RoleGate>
  );
}

function UnidadesList() {
  const { role, userId, isAdmin } = useRole();
  const router = useRouter();
  const [numeroInterno, setNumeroInterno] = useState('');
  const [placas, setPlacas] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargar(overrides?: {
    numeroInterno?: string;
    placas?: string;
    tipo?: string;
  }) {
    if (!role) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const n = overrides?.numeroInterno ?? numeroInterno;
    const p = overrides?.placas ?? placas;
    const t = overrides?.tipo ?? tipo;
    if (n.trim()) params.set('numeroInterno', n.trim());
    if (p.trim()) params.set('placas', p.trim());
    if (t.trim()) params.set('tipo', t.trim());
    const qs = params.toString();
    try {
      const data = await api<Unidad[]>(`/unidades${qs ? `?${qs}` : ''}`, {
        role,
        userId,
      });
      setUnidades(data);
    } catch (err) {
      setUnidades([]);
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
    void (async () => {
      if (!role) return;
      try {
        setTipos(await api<TipoVehiculo[]>('/tipos-vehiculo', { role, userId }));
      } catch {
        setTipos([]);
      }
      await cargar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    void cargar();
  }

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
            {row.original.tipo.nombre}
            {row.original.marcaModelo ? ` · ${row.original.marcaModelo}` : ''}
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
        lede="Consulte la flota por número interno, placas o tipo."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/unidades/nueva">Nueva unidad</Link>
            </Button>
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
          <Field label="Tipo" htmlFor="tipo">
            <NativeSelect
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {tipos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label=" " htmlFor="buscar">
            <Button id="buscar" variant="outline" type="submit" className="w-full">
              Buscar
            </Button>
          </Field>
        </Card>
      </form>

      {error ? (
        <div className="error-state">
          <h2>No se pudo consultar la flota</h2>
          <FormAlert>{error}</FormAlert>
        </div>
      ) : loading ? (
        <p className="muted">Cargando unidades…</p>
      ) : (
        <DataTable
          columns={columns}
          data={unidades ?? []}
          empty="No hay unidades que coincidan. Ajuste los filtros."
          onRowClick={(unidad) => router.push(`/unidades/${unidad.id}`)}
        />
      )}
    </>
  );
}
