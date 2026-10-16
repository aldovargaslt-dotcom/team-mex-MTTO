'use client';

import { useState, type FormEvent } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import { useReadResource } from '@/lib/use-read-resource';
import { ReadStatus } from '@/components/ReadStatus';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Entry = { id: string; nombre: string; activa?: boolean; activo?: boolean };
const CONFIG = {
  categorias: { title: 'Categorías', singular: 'categoría', endpoint: '/inventario/familias', state: 'activa', example: 'Ej. Filtros' },
  proveedores: { title: 'Proveedores', singular: 'proveedor', endpoint: '/inventario/proveedores', state: 'activo', example: 'Ej. Refacciones del Norte' },
} as const;

export function InventarioCatalogo({ kind }: { kind: keyof typeof CONFIG }) {
  const config = CONFIG[kind];
  const { role, userId } = useRole();
  const read = useReadResource(role ? JSON.stringify([role, userId, kind]) : null,
    () => api<Entry[]>(config.endpoint, { role: role!, userId }));
  const [nombre, setNombre] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const rows = read.data?.filter((row) => row.nombre.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (busy || !nombre.trim()) return;
    setBusy('create'); setError(null); setNotice('');
    try {
      await api(config.endpoint, { role: role!, userId, method: 'POST', body: JSON.stringify({ nombre: nombre.trim() }) });
      setNombre(''); setNotice(kind === 'categorias' ? 'Categoría agregada.' : 'Proveedor agregado.');
      read.retry();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : `No se pudo agregar: ${config.singular}. Intenta de nuevo.`);
    } finally { setBusy(null); }
  }
  async function toggle(row: Entry) {
    if (busy) return;
    setBusy(row.id); setError(null); setNotice('');
    try {
      await api(`${config.endpoint}/${row.id}`, { role: role!, userId, method: 'PATCH', body: JSON.stringify({ [config.state]: !row[config.state] }) });
      setNotice(`${row.nombre}: ${row[config.state] ? 'desactivado' : 'activado'}.`);
      read.retry();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar. Intenta de nuevo.');
    } finally { setBusy(null); }
  }
  return <>
    <PageHeader title={config.title} />
    <form onSubmit={crear} className="inventory-catalog-create" aria-busy={busy === 'create'}>
      <Field label={kind === 'categorias' ? 'Nombre de la nueva categoría' : 'Nombre del nuevo proveedor'} htmlFor={`${kind}-nombre`} className="inventory-search">
        <Input id={`${kind}-nombre`} required value={nombre} disabled={busy !== null} onChange={(event) => setNombre(event.target.value)} placeholder={config.example} />
      </Field>
      <Button type="submit" disabled={busy !== null || !nombre.trim() || !role}>{busy === 'create' ? 'Guardando…' : `Agregar ${config.singular}`}</Button>
    </form>
    <FormAlert>{error}</FormAlert>
    <p role="status" className="text-xs text-muted-foreground">{notice}</p>
    <ReadStatus loading={read.loading} error={read.error} loadingText={`Cargando ${config.title.toLowerCase()}…`} errorText={`No se pudieron cargar ${kind === 'categorias' ? 'las categorías' : 'los proveedores'}.`} retry={read.retry} />
    {read.data !== null ? <>
      {read.data.length > 0 ? <div className="inventory-toolbar">
        <Field label={`Buscar ${config.singular}`} htmlFor={`${kind}-search`} className="inventory-search"><Input id={`${kind}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre" /></Field>
      </div> : null}
      <ul className="inventory-catalog-list" aria-label={config.title}>
        {rows?.length ? rows.map((row) => <li key={row.id}>
          <div className="inventory-identity"><strong className="font-medium text-navy">{row.nombre}</strong><span className="inventory-secondary">{row[config.state] ? (kind === 'categorias' ? 'Activa' : 'Activo') : (kind === 'categorias' ? 'Inactiva' : 'Inactivo')}</span></div>
          <Button type="button" size="compact" variant={row[config.state] ? 'dangerSoft' : 'outline'} disabled={busy !== null} onClick={() => void toggle(row)} aria-label={`${row[config.state] ? 'Inactivar' : 'Activar'} ${row.nombre}`}>{busy === row.id ? 'Guardando…' : row[config.state] ? 'Inactivar' : 'Activar'}</Button>
        </li>) : <li className="text-sm text-muted-foreground">{read.data.length ? 'No hay coincidencias. Ajusta la búsqueda.' : `Aún no hay ${config.title.toLowerCase()}. Agrega ${kind === 'categorias' ? 'la primera' : 'el primero'} en el formulario.`}</li>}
      </ul>
    </> : null}
  </>;
}
