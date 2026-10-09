'use client';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, HttpError } from '@/lib/api';
import { etiquetaRol, useRole } from '@/lib/role';
import type { Role } from '@/lib/types';

type User = {
  id: string;
  subject: string;
  displayName: string;
  roles: Role[];
  facilityScopes: string[];
  active: boolean;
  version: number;
};
type Options = { roles: Role[]; facilities: { id: string; name: string }[] };
type Draft = Omit<User, 'id' | 'version'>;
const emptyDraft = (): Draft => ({
  subject: '',
  displayName: '',
  roles: [],
  facilityScopes: [],
  active: true,
});
const failure = (error: unknown, fallback: string) =>
  error instanceof HttpError ? error.message : fallback;

export default function UsersPage() {
  const { role, userId, ready, isAdmin, reloadSession } = useRole();
  const [rows, setRows] = useState<User[] | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!isAdmin || !role) return;
    const current = ++generation.current;
    setRows(null);
    setOptions(null);
    setError('');
    try {
      const [users, config] = await Promise.all([
        api<User[]>('/admin/users', { role, userId }),
        api<Options>('/admin/users/options', { role, userId }),
      ]);
      if (current !== generation.current) return;
      setRows(users);
      setOptions(config);
    } catch (err) {
      if (current !== generation.current) return;
      setRows(null);
      setOptions(null);
      setError(
        failure(err, 'No se pudieron cargar los usuarios. Intenta de nuevo.'),
      );
    }
  }, [isAdmin, role, userId]);
  useEffect(() => {
    const counter = generation;
    void load();
    return () => {
      counter.current++;
    };
  }, [load]);
  function start(user: User | null, deactivate = false) {
    setEditing(user);
    setDraft(
      user
        ? {
            subject: user.subject,
            displayName: user.displayName,
            roles: [...user.roles],
            facilityScopes: [...user.facilityScopes],
            active: deactivate ? false : user.active,
          }
        : emptyDraft(),
    );
    setFormError('');
    setConfirmed(false);
    setNotice('');
    setOpen(true);
  }
  const columns: ColumnDef<User, unknown>[] = [
    {
      header: 'Nombre',
      accessorKey: 'displayName',
      cell: ({ row }) => (
        <button
          type="button"
          className="min-h-11 text-left text-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => start(row.original)}
        >
          {row.original.displayName}
        </button>
      ),
    },
    {
      header: 'Roles',
      cell: ({ row }) => row.original.roles.map(etiquetaRol).join(', '),
    },
    {
      header: 'Patios',
      cell: ({ row }) => (
        <span className="inline-block max-w-60 whitespace-normal">
          {row.original.facilityScopes
            .map(
              (id) =>
                options?.facilities.find((f) => f.id === id)?.name ??
                'Patio no disponible',
            )
            .join(', ')}
        </span>
      ),
    },
    {
      header: 'Acceso',
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'success' : 'muted'}>
          {row.original.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Acción',
      cell: ({ row }) => (
        <Button
          type="button"
          size="compact"
          variant={row.original.active ? 'dangerSoft' : 'outline'}
          onClick={() => start(row.original, row.original.active)}
        >
          {row.original.active ? 'Desactivar' : 'Editar acceso'}
        </Button>
      ),
    },
  ];
  const filtered = useMemo(
    () =>
      rows?.filter(
        (u) =>
          (status === 'ALL' || u.active === (status === 'ACTIVE')) &&
          `${u.displayName} ${u.roles.map(etiquetaRol).join(' ')}`
            .toLocaleLowerCase('es')
            .includes(query.trim().toLocaleLowerCase('es')),
      ) ?? [],
    [rows, query, status],
  );
  const deactivating = Boolean(editing?.active && !draft.active);
  function toggle(key: 'roles' | 'facilityScopes', value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value as never)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!role || saving) return;
    if (!draft.roles.length || !draft.facilityScopes.length) {
      setFormError('Selecciona al menos un rol y un patio.');
      return;
    }
    if (deactivating && !confirmed) {
      setFormError('Confirma la desactivación de este usuario.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { subject, ...fields } = draft;
      await api<User>(editing ? `/admin/users/${editing.id}` : '/admin/users', {
        role,
        userId,
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(
          editing
            ? { ...fields, version: editing.version }
            : { ...fields, subject },
        ),
      });
      setOpen(false);
      setNotice('Acceso guardado.');
      if (editing?.subject === userId) await reloadSession();
      else await load();
    } catch (err) {
      setFormError(
        failure(err, 'No se pudo guardar el acceso. Intenta de nuevo.'),
      );
    } finally {
      setSaving(false);
    }
  }
  if (!ready) return <p role="status">Verificando sesión…</p>;
  if (!isAdmin)
    return (
      <>
        <PageHeader title="Usuarios" />
        <p role="alert">No tienes permiso para administrar usuarios.</p>
      </>
    );
  return (
    <>
      <PageHeader
        title="Usuarios"
        lede="Administra los roles y patios a los que puede acceder cada persona."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={open}
              onClick={() => {
                setNotice('');
                void load();
              }}
            >
              Actualizar
            </Button>
            <Button
              variant={open ? 'secondary' : 'default'}
              disabled={!options || open}
              onClick={() => start(null)}
            >
              Agregar usuario
            </Button>
          </>
        }
      />
      <p className="mb-3 text-xs text-muted-foreground">
        La cuenta debe existir en el proveedor de inicio de sesión. Agregarla
        aquí habilita su acceso a Team Mex.
      </p>
      {notice ? (
        <p className="mb-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field label="Buscar usuario" htmlFor="users-search">
          <Input
            id="users-search"
            value={query}
            placeholder="Nombre o rol"
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Acceso" htmlFor="users-status">
          <NativeSelect
            id="users-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </NativeSelect>
        </Field>
      </div>
      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <FormAlert>{error}</FormAlert>
          <Button variant="secondary" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : rows === null ? (
        <p role="status">Cargando usuarios…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          empty="No hay usuarios que coincidan con la búsqueda."
        />
      )}
      <Dialog
        open={open && isAdmin}
        onOpenChange={(next) => {
          if (!saving) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar acceso' : 'Agregar usuario'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Actualiza el acceso de ${editing.displayName}.`
                : 'Vincula una cuenta del proveedor y asigna sus permisos.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-3">
            <Field label="Nombre" htmlFor="user-name">
              <Input
                id="user-name"
                autoComplete="off"
                maxLength={120}
                required
                value={draft.displayName}
                disabled={saving}
                onChange={(e) =>
                  setDraft({ ...draft, displayName: e.target.value })
                }
              />
            </Field>
            <Field
              label="Identificador de cuenta del proveedor"
              htmlFor="user-subject"
              hint={
                <p className="text-xs text-muted-foreground">
                  Solicita este identificador al responsable del proveedor de
                  inicio de sesión.
                </p>
              }
            >
              <Input
                id="user-subject"
                autoComplete="off"
                required
                maxLength={255}
                disabled={saving || Boolean(editing)}
                value={draft.subject}
                onChange={(e) =>
                  setDraft({ ...draft, subject: e.target.value })
                }
              />
            </Field>
            <fieldset disabled={saving}>
              <legend className="text-xs font-medium text-muted-foreground">
                Roles
              </legend>
              <div className="grid sm:grid-cols-2">
                {options?.roles.map((r) => (
                  <label
                    key={r}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draft.roles.includes(r)}
                      onChange={() => toggle('roles', r)}
                    />
                    {etiquetaRol(r)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={saving}>
              <legend className="text-xs font-medium text-muted-foreground">
                Patios autorizados
              </legend>
              {options?.facilities.length ? (
                options.facilities.map((f) => (
                  <label
                    key={f.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draft.facilityScopes.includes(f.id)}
                      onChange={() => toggle('facilityScopes', f.id)}
                    />
                    {f.name}
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay patios configurados.
                </p>
              )}
            </fieldset>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                disabled={saving}
                checked={draft.active}
                onChange={(e) => {
                  setConfirmed(false);
                  setDraft({ ...draft, active: e.target.checked });
                }}
              />
              Acceso activo
            </label>
            {deactivating ? (
              <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm text-destructive">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  disabled={saving}
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Confirmo desactivar el acceso de {editing?.displayName}. Perderá
                acceso a nuevas operaciones.
              </label>
            ) : null}
            <FormAlert>{formError}</FormAlert>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={deactivating ? 'dangerSoft' : 'default'}
                disabled={
                  saving ||
                  !options?.facilities.length ||
                  (deactivating && !confirmed)
                }
              >
                {saving
                  ? 'Guardando…'
                  : deactivating
                    ? 'Desactivar acceso'
                    : 'Guardar acceso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
