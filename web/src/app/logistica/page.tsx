'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { ListFilter } from '@/components/ListFilter';
import { RoleGate } from '@/components/RoleGate';
import { ChoferOpsBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, ListChrome } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type {
  ChipLogistica,
  LogisticaChoferesResponse,
  LogisticaChoferRow,
  Unidad,
} from '@/lib/types';

const CHIPS: { id: ChipLogistica; label: string }[] = [
  { id: 'DISPONIBLE', label: 'Disponibles' },
  { id: 'EN_RUTA', label: 'En ruta' },
  { id: 'TODOS', label: 'Todos' },
];

function parseChip(raw: string | null): ChipLogistica {
  if (raw === 'EN_RUTA' || raw === 'TODOS' || raw === 'DISPONIBLE') return raw;
  return 'DISPONIBLE';
}

function emptyCopy(chip: ChipLogistica, q: string) {
  if (q.trim()) return 'Nadie coincide con la búsqueda.';
  if (chip === 'DISPONIBLE') {
    return 'No hay choferes disponibles. Todos están en ruta.';
  }
  if (chip === 'EN_RUTA') {
    return 'Nadie en ruta. Asigne un chofer a una unidad.';
  }
  return 'No hay choferes activos.';
}

export default function LogisticaPage() {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando choferes…</p>}>
        <LogisticaAsignacion />
      </Suspense>
    </RoleGate>
  );
}

function LogisticaAsignacion() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chip = parseChip(searchParams.get('chip'));
  const qParam = searchParams.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const [data, setData] = useState<LogisticaChoferesResponse | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'cta' | LogisticaChoferRow | null>(null);
  const [choferId, setChoferId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [saving, setSaving] = useState(false);

  async function cargar() {
    const [list, units] = await Promise.all([
      api<LogisticaChoferesResponse>('/logistica/choferes', {
        role: role!,
        userId,
      }),
      api<Unidad[]>('/unidades', { role: role!, userId }),
    ]);
    setData(list);
    setUnidades(units);
  }

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

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

  function setParams(next: { chip?: ChipLogistica; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextChip = next.chip ?? chip;
    const nextQ = next.q ?? qParam;
    if (nextChip === 'DISPONIBLE') params.delete('chip');
    else params.set('chip', nextChip);
    if (!nextQ.trim()) params.delete('q');
    else params.set('q', nextQ.trim());
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function abrirCta() {
    const primero = (data?.items ?? []).find((row) => row.ops === 'DISPONIBLE');
    setChoferId(primero?.choferId ?? '');
    setUnidadId(unidadesLibres[0]?.id ?? '');
    setError(null);
    setSheet('cta');
  }

  function abrirFila(row: LogisticaChoferRow) {
    setChoferId(row.choferId);
    setUnidadId(row.unidadId ?? unidadesLibres[0]?.id ?? '');
    setError(null);
    setSheet(row);
  }

  const kpis = data?.kpis ?? { enRuta: 0, disponibles: 0, total: 0 };
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const items = useMemo(() => {
    const needle = qParam.trim().toLowerCase();
    return allItems.filter((row) => {
      if (chip !== 'TODOS' && row.ops !== chip) return false;
      if (needle && !row.nombre.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [allItems, chip, qParam]);
  const unidadesLibres = useMemo(
    () =>
      unidades
        .filter((u) => !u.choferId)
        .sort((a, b) => a.placas.localeCompare(b.placas, 'es')),
    [unidades],
  );
  const disponibles = allItems.filter((row) => row.ops === 'DISPONIBLE');
  const sheetRow = sheet && sheet !== 'cta' ? sheet : null;
  const enRutaSheet = sheetRow?.ops === 'EN_RUTA';

  async function asignar(event: FormEvent) {
    event.preventDefault();
    if (!choferId || !unidadId) return;
    setSaving(true);
    setError(null);
    try {
      await api('/logistica/asignaciones', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({ unidadId, choferId }),
      });
      setSheet(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo asignar el chofer.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function quitar() {
    if (!sheetRow?.unidadId) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/logistica/asignaciones/${sheetRow.unidadId}`, {
        role: role!,
        userId,
        method: 'DELETE',
      });
      setSheet(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo quitar la asignación.',
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<LogisticaChoferRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Chofer',
        cell: ({ row }) => (
          <span className="font-medium text-navy">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: 'ops',
        header: 'Estado',
        cell: ({ row }) => <ChoferOpsBadge ops={row.original.ops} />,
      },
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) =>
          row.original.placas ? (
            <span>{row.original.placas}</span>
          ) : (
            <span className="muted">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <ListChrome
        title="Logística"
        countLabel={`${items.length} ${items.length === 1 ? 'chofer' : 'choferes'}`}
        actions={
          <Button type="button" onClick={abrirCta}>
            Asignar a unidad
          </Button>
        }
      />

      <div className="ops-kpis" aria-label="Resumen de choferes activos">
        <div className="ops-kpi">
          <span className="ops-kpi__label">En ruta</span>
          <span className="ops-kpi__value">{kpis.enRuta}</span>
        </div>
        <div className="ops-kpi">
          <span className="ops-kpi__label">Disponibles</span>
          <span className="ops-kpi__value">{kpis.disponibles}</span>
        </div>
        <div className="ops-kpi">
          <span className="ops-kpi__label">Total</span>
          <span className="ops-kpi__value">{kpis.total}</span>
        </div>
      </div>

      <form
        className="unidades-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ q });
        }}
      >
        <div className="list-chrome__search">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar chofer…"
            aria-label="Buscar chofer"
            className="pl-9"
          />
        </div>
        <ListFilter
          label="Estado operativo"
          segmented
          value={chip}
          options={CHIPS}
          onChange={(next) => setParams({ chip: next })}
        />
      </form>

      <FormAlert>{error && !sheet ? error : null}</FormAlert>

      <DataTable
        columns={columns}
        data={items}
        empty={emptyCopy(chip, qParam)}
        onRowClick={abrirFila}
        rowAffordance
      />

      <Sheet
        open={sheet != null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <SheetContent
          side="right"
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            const root = event.currentTarget as HTMLElement;
            const title = root.querySelector<HTMLElement>(
              '[data-slot="sheet-title"]',
            );
            if (!title) return;
            event.preventDefault();
            title.setAttribute('tabindex', '-1');
            title.focus();
          }}
        >
          {enRutaSheet ? (
            <div className="flex flex-col">
              <SheetHeader>
                <SheetTitle>{sheetRow.nombre}</SheetTitle>
                <SheetDescription>
                  Asignado a {sheetRow.placas ?? 'una unidad'}. Quite la
                  asignación para dejarlo disponible.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 px-4">
                <p className="text-sm">
                  <ChoferOpsBadge ops="EN_RUTA" />{' '}
                  <span className="muted">{sheetRow.placas}</span>
                </p>
                <FormAlert>{sheet ? error : null}</FormAlert>
              </div>
              <SheetFooter className="mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSheet(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="dangerSoft"
                  disabled={saving}
                  onClick={() => void quitar()}
                >
                  {saving ? 'Quitando…' : 'Quitar de la unidad'}
                </Button>
              </SheetFooter>
            </div>
          ) : (
            <form className="flex flex-col" onSubmit={asignar}>
              <SheetHeader>
                <SheetTitle>Asignar a unidad</SheetTitle>
                <SheetDescription>
                  Un chofer activo a una unidad libre. No se pisa una
                  asignación existente.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 px-4">
                <Field label="Chofer" htmlFor="asigChofer">
                  <NativeSelect
                    id="asigChofer"
                    value={choferId}
                    onChange={(e) => setChoferId(e.target.value)}
                    disabled={sheetRow != null}
                  >
                    <option value="">Seleccione chofer</option>
                    {(sheetRow ? [sheetRow] : disponibles).map((row) => (
                      <option key={row.choferId} value={row.choferId}>
                        {row.nombre}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Unidad" htmlFor="asigUnidad">
                  <NativeSelect
                    id="asigUnidad"
                    value={unidadId}
                    onChange={(e) => setUnidadId(e.target.value)}
                  >
                    <option value="">Seleccione unidad</option>
                    {unidadesLibres.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.placas} · {unidad.numeroInterno}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {unidadesLibres.length === 0 ? (
                  <p className="muted">No hay unidades libres.</p>
                ) : null}
                <FormAlert>{sheet ? error : null}</FormAlert>
              </div>
              <SheetFooter className="mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSheet(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !choferId || !unidadId}
                >
                  {saving ? 'Asignando…' : 'Asignar a unidad'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
