'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, Clock, Search, Settings2, Truck } from 'lucide-react';
import {
  AmbitoBadge,
  UnidadOpsBadge,
} from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert } from '@/components/ui/field';
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
import { etiquetaAlertaRegreso, formatFecha, formatHace } from '@/lib/format';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import type {
  AmbitoUnidad,
  ChipLogisticaUnidad,
  LogisticaUnidadRow,
  LogisticaUnidadesResponse,
  TableroFlotaRow,
} from '@/lib/types';

function parseChip(raw: string | null): ChipLogisticaUnidad {
  if (raw === 'EN_RUTA' || raw === 'DISPONIBLE' || raw === 'TODAS') return raw;
  return 'TODAS';
}

function parseAmbito(raw: string | null): AmbitoUnidad | null {
  if (raw === 'LOCAL' || raw === 'FORANEO') return raw;
  return null;
}

function parseAlerta(raw: string | null): 'SIN_REGRESO' | null {
  return raw === 'SIN_REGRESO' ? 'SIN_REGRESO' : null;
}

function frasePatio(row: TableroFlotaRow | undefined, failed: boolean) {
  if (failed) return 'Patio: no consultado.';
  if (!row) return 'Patio: sin ficha.';
  if (row.salidaAbiertaId) {
    return `Patio: salida abierta · ${row.sitioNombre ?? 'sin sitio'}.`;
  }
  return 'Patio: sin salida abierta.';
}

function emptyCopy(
  chip: ChipLogisticaUnidad,
  q: string,
  ambito: AmbitoUnidad | null,
  alerta: 'SIN_REGRESO' | null,
) {
  if (q.trim()) return 'Nadie coincide con la búsqueda.';
  if (alerta === 'SIN_REGRESO') return 'Nadie sin regreso.';
  if (chip === 'EN_RUTA') return 'Nadie en ruta. El regreso se registra aquí.';
  if (chip === 'DISPONIBLE') return 'Nadie disponible.';
  if (ambito === 'LOCAL') return 'Nadie en esta ubicación.';
  if (ambito === 'FORANEO') return 'Nadie en esta ubicación.';
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
  const ambito = parseAmbito(searchParams.get('ambito'));
  const alerta = parseAlerta(searchParams.get('alerta'));
  const requestedUnitId = searchParams.get('unidadId');
  const qParam = searchParams.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const [data, setData] = useState<LogisticaUnidadesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [patio, setPatio] = useState<Map<string, TableroFlotaRow> | null>(null);
  const [patioError, setPatioError] = useState(false);

  async function cargar() {
    const list = await api<LogisticaUnidadesResponse>('/logistica/unidades', {
      role: role!,
      userId,
    });
    setData(list);
    try {
      const rows = await api<TableroFlotaRow[]>('/flota/tablero', {
        role: role!,
        userId,
      });
      setPatio(new Map(rows.map((row) => [row.unidadId, row])));
      setPatioError(false);
    } catch {
      setPatio(null);
      setPatioError(true);
    }
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

  function setParams(next: {
    chip?: ChipLogisticaUnidad;
    q?: string;
    ambito?: AmbitoUnidad | null;
    alerta?: 'SIN_REGRESO' | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextChip = next.chip ?? chip;
    const nextQ = next.q ?? qParam;
    const nextAmbito = next.ambito === undefined ? ambito : next.ambito;
    const nextAlerta = next.alerta === undefined ? alerta : next.alerta;
    if (nextChip === 'TODAS') params.delete('chip');
    else params.set('chip', nextChip);
    if (!nextQ.trim()) params.delete('q');
    else params.set('q', nextQ.trim());
    if (!nextAmbito) params.delete('ambito');
    else params.set('ambito', nextAmbito);
    if (!nextAlerta) params.delete('alerta');
    else params.set('alerta', nextAlerta);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const kpis = data?.kpis ?? {
    enRuta: 0,
    disponibles: 0,
    total: 0,
    sinRegreso: 0,
  };
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const items = useMemo(() => {
    const needle = qParam.trim().toLowerCase();
    const filtered = allItems.filter((row) => {
      if (chip !== 'TODAS' && row.opsEstado !== chip) return false;
      if (ambito && row.ambito !== ambito) return false;
      if (alerta && row.alerta !== alerta) return false;
      if (
        needle &&
        !row.placas.toLowerCase().includes(needle) &&
        !row.numeroInterno.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });
    if (alerta === 'SIN_REGRESO') {
      filtered.sort((a, b) => {
        const aMs = a.salidaAt ? new Date(a.salidaAt).getTime() : Number.POSITIVE_INFINITY;
        const bMs = b.salidaAt ? new Date(b.salidaAt).getTime() : Number.POSITIVE_INFINITY;
        return aMs - bMs;
      });
    }
    return filtered;
  }, [allItems, chip, qParam, ambito, alerta]);
  const todosActivo = chip === 'TODAS' && alerta == null;
  useEffect(() => {
    if (!requestedUnitId || !data) return;
    const requested = data.items.find(
      (row) => row.unidadId === requestedUnitId && row.opsEstado === 'EN_RUTA',
    );
    if (requested) {
      setSelectedId(requested.unidadId);
      setSheetOpen(true);
    }
  }, [requestedUnitId, data]);
  const enRuta = items.filter((row) => row.opsEstado === 'EN_RUTA');
  const sheetRow = enRuta.find((row) => row.unidadId === selectedId) ?? null;

  function abrirCta() {
    setError(null);
    setSelectedId(null);
    setSheetOpen(true);
  }

  function abrirFila(row: LogisticaUnidadRow) {
    setError(null);
    if (row.opsEstado === 'EN_RUTA') {
      setSelectedId(row.unidadId);
      setSheetOpen(true);
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
      setSheetOpen(false);
      setSelectedId(null);
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
        header: 'Viaje',
        cell: ({ row }) => <UnidadOpsBadge ops={row.original.opsEstado} />,
      },
      {
        id: 'salida',
        header: 'Desde la salida',
        cell: ({ row }) =>
          row.original.opsEstado === 'EN_RUTA' && row.original.salidaAt ? (
            <span>{formatHace(row.original.salidaAt)}</span>
          ) : (
            <span className="muted">—</span>
          ),
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
      {
        id: 'abrir',
        header: () => <span className="sr-only">Abrir</span>,
        cell: () => (
          <ChevronRight
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
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
            <Button type="button" variant="quiet" asChild>
              <Link href="/configuracion/alertas?code=FLOTA_SIN_REGRESO">
                <Settings2 className="size-4" aria-hidden />
                Config alertas
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="unidades-kpis unidades-kpis--ops" aria-label="Resumen de flota">
        <button
          type="button"
          className={cn('unidades-kpi', chip === 'EN_RUTA' && !alerta && 'is-active')}
          aria-pressed={chip === 'EN_RUTA' && !alerta}
          onClick={() => setParams({ chip: 'EN_RUTA', alerta: null })}
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
          className={cn(
            'unidades-kpi',
            chip === 'DISPONIBLE' && !alerta && 'is-active',
          )}
          aria-pressed={chip === 'DISPONIBLE' && !alerta}
          onClick={() => setParams({ chip: 'DISPONIBLE', alerta: null })}
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
          className={cn('unidades-kpi', todosActivo && 'is-active')}
          aria-pressed={todosActivo}
          onClick={() => setParams({ chip: 'TODAS', alerta: null })}
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--off">
            <Truck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Total</span>
            <span className="unidades-kpi__value">{kpis.total}</span>
          </span>
        </button>
        <button
          type="button"
          className={cn('unidades-kpi', alerta === 'SIN_REGRESO' && 'is-active')}
          aria-pressed={alerta === 'SIN_REGRESO'}
          onClick={() =>
            setParams({ chip: 'TODAS', alerta: 'SIN_REGRESO' })
          }
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--warn">
            <Clock className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Sin regreso</span>
            <span className="unidades-kpi__value">{kpis.sinRegreso}</span>
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
        <div className="unidades-search">
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
        <div className="list-filter" role="group" aria-label="Ubicación">
          <button
            type="button"
            aria-pressed={ambito === 'LOCAL'}
            className={ambito === 'LOCAL' ? 'active' : ''}
            onClick={() =>
              setParams({ ambito: ambito === 'LOCAL' ? null : 'LOCAL' })
            }
          >
            Local
          </button>
          <button
            type="button"
            aria-pressed={ambito === 'FORANEO'}
            className={ambito === 'FORANEO' ? 'active' : ''}
            onClick={() =>
              setParams({ ambito: ambito === 'FORANEO' ? null : 'FORANEO' })
            }
          >
            Foráneo
          </button>
        </div>
      </form>

      <FormAlert>{error && !sheetOpen ? error : null}</FormAlert>

      <div className="hidden md:block">
        <DataTable columns={columns} data={items} empty={emptyCopy(chip, qParam, ambito, alerta)} onRowClick={abrirFila} />
      </div>
      <div className="grid gap-3 md:hidden">
        {items.length ? items.map((row) => (
          <button key={row.unidadId} type="button" className="w-full rounded-lg border bg-card p-4 text-left" onClick={() => abrirFila(row)}>
            <span className="flex items-start justify-between gap-3">
              <span><span className="block font-semibold text-navy">{row.numeroInterno} · {row.placas}</span><span className="mt-1 block text-sm text-muted-foreground">{row.choferNombre || 'Chofer pendiente'} · {row.destino || 'Sin destino'}</span></span>
              <UnidadOpsBadge ops={row.opsEstado} />
            </span>
            <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><AmbitoBadge ambito={row.ambito} />{row.salidaAt ? <span>{formatHace(row.salidaAt)}</span> : null}{row.alerta ? <Badge variant="warning" className="normal-case tracking-normal">{etiquetaAlertaRegreso(row.alerta)}</Badge> : null}</span>
            <span className="mt-3 block text-sm font-medium text-navy">{row.opsEstado === 'EN_RUTA' ? 'Tocar para registrar regreso' : 'Ver unidad'}</span>
          </button>
        )) : <p className="empty-state">{emptyCopy(chip, qParam, ambito, alerta)}</p>}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSheetOpen(false);
            setSelectedId(null);
          }
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
                Pasa el viaje de En ruta a Disponible y limpia el reloj. No registra entrada de patio.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 px-4">
              <Field label="Unidad en ruta" htmlFor="regreso-unidad">
                <NativeSelect
                  id="regreso-unidad"
                  value={selectedId ?? ''}
                  onChange={(event) => setSelectedId(event.target.value || null)}
                  required
                >
                  <option value="">Seleccione la unidad</option>
                  {enRuta.map((row) => (
                    <option key={row.unidadId} value={row.unidadId}>
                      {row.placas} · {row.numeroInterno}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {sheetRow ? (
                <div className="grid gap-1 text-sm">
                  <p>
                    <UnidadOpsBadge ops="EN_RUTA" />{' '}
                    <AmbitoBadge ambito={sheetRow.ambito} />{' '}
                    <span className="muted">{sheetRow.destino ?? 'sin destino'}</span>
                  </p>
                  <p className="muted">
                    Salida del viaje:{' '}
                    {sheetRow.salidaAt
                      ? `${formatFecha(sheetRow.salidaAt)} · ${formatHace(sheetRow.salidaAt)}`
                      : 'sin hora'}
                  </p>
                  <p>{frasePatio(patio?.get(sheetRow.unidadId), patioError)}</p>
                </div>
              ) : (
                <p className="muted">Seleccione la unidad. El regreso no elige solo.</p>
              )}
              <FormAlert>{sheetOpen ? error : null}</FormAlert>
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSheetOpen(false);
                  setSelectedId(null);
                }}
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
