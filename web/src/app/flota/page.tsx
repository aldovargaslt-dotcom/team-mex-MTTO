'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Truck } from 'lucide-react';
import {
  AmbitoBadge,
  UnidadOpsBadge,
} from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, HttpError } from '@/lib/api';
import { etiquetaAlertaRegreso } from '@/lib/format';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import type {
  ChipLogisticaUnidad,
  LogisticaUnidadRow,
  LogisticaUnidadesResponse,
} from '@/lib/types';

function parseChip(raw: string | null): ChipLogisticaUnidad {
  if (raw === 'EN_RUTA' || raw === 'DISPONIBLE' || raw === 'TODAS') return raw;
  return 'TODAS';
}

function emptyCopy(chip: ChipLogisticaUnidad, q: string) {
  if (q.trim()) return 'Nadie coincide con la búsqueda.';
  if (chip === 'EN_RUTA') return 'Nadie en ruta. El regreso se registra aquí.';
  if (chip === 'DISPONIBLE') return 'Nadie disponible.';
  return 'No hay unidades.';
}

export default function FlotaPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando flota…</p>}>
      <FlotaVisual />
    </Suspense>
  );
}

function FlotaVisual() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chip = parseChip(searchParams.get('chip'));
  const qParam = searchParams.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const [data, setData] = useState<LogisticaUnidadesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<LogisticaUnidadRow | 'cta' | null>(null);
  const [saving, setSaving] = useState(false);

  async function cargar() {
    const list = await api<LogisticaUnidadesResponse>('/logistica/unidades', {
      role: role!,
      userId,
    });
    setData(list);
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
          : 'No se pudo cargar la flota.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function setParams(next: { chip?: ChipLogisticaUnidad; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextChip = next.chip ?? chip;
    const nextQ = next.q ?? qParam;
    if (nextChip === 'TODAS') params.delete('chip');
    else params.set('chip', nextChip);
    if (!nextQ.trim()) params.delete('q');
    else params.set('q', nextQ.trim());
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const kpis = data?.kpis ?? { enRuta: 0, disponibles: 0, total: 0 };
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const items = useMemo(() => {
    const needle = qParam.trim().toLowerCase();
    return allItems.filter((row) => {
      if (chip !== 'TODAS' && row.opsEstado !== chip) return false;
      if (
        needle &&
        !row.placas.toLowerCase().includes(needle) &&
        !row.numeroInterno.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [allItems, chip, qParam]);
  const enRuta = allItems.filter((row) => row.opsEstado === 'EN_RUTA');
  const sheetRow = sheet && sheet !== 'cta' ? sheet : enRuta[0] ?? null;

  function abrirCta() {
    setError(null);
    setSheet(enRuta[0] ? 'cta' : null);
  }

  function abrirFila(row: LogisticaUnidadRow) {
    setError(null);
    if (row.opsEstado === 'EN_RUTA') {
      setSheet(row);
      return;
    }
    router.push(`/flota/unidades/${row.unidadId}`);
  }

  async function registrar(unidadId: string) {
    setSaving(true);
    setError(null);
    try {
      await api(`/logistica/regresos/${unidadId}`, {
        role: role!,
        userId,
        method: 'POST',
      });
      setSheet(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo registrar el regreso.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSheetSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sheetRow) return;
    await registrar(sheetRow.unidadId);
  }

  const columns: ColumnDef<LogisticaUnidadRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'placas',
        header: 'Placas',
        cell: ({ row }) => (
          <span className="font-medium text-navy">{row.original.placas}</span>
        ),
      },
      {
        accessorKey: 'numeroInterno',
        header: 'Unidad',
      },
      {
        id: 'chofer',
        header: 'Chofer',
        cell: ({ row }) =>
          row.original.choferNombre ? (
            <span>{row.original.choferNombre}</span>
          ) : (
            <span className="muted">—</span>
          ),
      },
      {
        id: 'ops',
        header: 'En ruta',
        cell: ({ row }) => <UnidadOpsBadge ops={row.original.opsEstado} />,
      },
      {
        id: 'alerta',
        header: 'Alerta',
        cell: ({ row }) => {
          const copy = etiquetaAlertaRegreso(row.original.alerta);
          if (!copy) return <span className="muted">—</span>;
          return (
            <Badge variant="warning" className="normal-case tracking-normal">
              {copy}
            </Badge>
          );
        },
      },
      {
        id: 'ambito',
        header: 'Ubicación',
        cell: ({ row }) => <AmbitoBadge ambito={row.original.ambito} />,
      },
      {
        accessorKey: 'destino',
        header: 'Destino',
        cell: ({ row }) =>
          row.original.destino ? (
            <span>{row.original.destino}</span>
          ) : (
            <span className="muted">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="unidades-page">
      <div className="unidades-hero">
        <div className="min-w-0 flex-1">
          <h1>Flota</h1>
          <p className="lede">Quién está en ruta y si falta el regreso.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={abrirCta}
              disabled={enRuta.length === 0}
            >
              Registrar regreso
            </Button>
          </div>
        </div>
      </div>

      <div className="unidades-kpis unidades-kpis--ops" aria-label="Resumen de flota">
        <button
          type="button"
          className={cn('unidades-kpi', chip === 'EN_RUTA' && 'is-active')}
          aria-pressed={chip === 'EN_RUTA'}
          onClick={() => setParams({ chip: 'EN_RUTA' })}
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--total">
            <Truck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">En ruta</span>
            <span className="unidades-kpi__value">{kpis.enRuta}</span>
          </span>
        </button>
        <button
          type="button"
          className={cn('unidades-kpi', chip === 'DISPONIBLE' && 'is-active')}
          aria-pressed={chip === 'DISPONIBLE'}
          onClick={() => setParams({ chip: 'DISPONIBLE' })}
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--ok">
            <Truck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Disponibles</span>
            <span className="unidades-kpi__value">{kpis.disponibles}</span>
          </span>
        </button>
        <button
          type="button"
          className={cn('unidades-kpi', chip === 'TODAS' && 'is-active')}
          aria-pressed={chip === 'TODAS'}
          onClick={() => setParams({ chip: 'TODAS' })}
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--off">
            <Truck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Total</span>
            <span className="unidades-kpi__value">{kpis.total}</span>
          </span>
        </button>
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
            placeholder="Buscar placas o unidad…"
            aria-label="Buscar placas o unidad"
            className="pl-9"
          />
        </div>
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
        open={sheet != null && sheetRow != null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <SheetContent
          side="right"
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            const root = event.currentTarget as HTMLElement;
            const title = root.querySelector<HTMLElement>('[data-slot="sheet-title"]');
            if (!title) return;
            event.preventDefault();
            title.focus();
          }}
        >
          <form className="flex h-full min-h-0 flex-col" onSubmit={onSheetSubmit}>
            <SheetHeader>
              <SheetTitle tabIndex={-1}>Registrar regreso</SheetTitle>
              <SheetDescription>
                {sheetRow
                  ? `${sheetRow.placas} · ${sheetRow.numeroInterno}. Pasa de en ruta a disponible.`
                  : 'Seleccione una unidad en ruta.'}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 px-4">
              {sheetRow ? (
                <p className="text-sm">
                  <UnidadOpsBadge ops="EN_RUTA" />{' '}
                  <AmbitoBadge ambito={sheetRow.ambito} />{' '}
                  <span className="muted">{sheetRow.destino ?? 'sin destino'}</span>
                </p>
              ) : (
                <p className="muted">Nadie en ruta.</p>
              )}
              <FormAlert>{sheet ? error : null}</FormAlert>
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSheet(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !sheetRow}>
                {saving ? 'Registrando…' : 'Registrar regreso'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
