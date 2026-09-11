'use client';

import { useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { PendienteComprobante } from '@/lib/types';
import { ImageDropzone } from '@/components/ImageDropzone';
import { OtLink, useOtLabels } from '@/components/OtLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormAlert, PageHeader } from '@/components/ui/field';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PendientesPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<PendienteComprobante[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ticketFor, setTicketFor] = useState<string | null>(null);
  const labels = useOtLabels(
    rows.map((row) => row.visitaId),
    { role, userId },
  );

  useEffect(() => {
    if (!role) return;
    void (async () => {
      try {
        setRows(
          await api<PendienteComprobante[]>('/inventario/pendientes-comprobante', {
            role,
            userId,
          }),
        );
      } catch (err) {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar los pendientes.',
        );
      }
    })();
  }, [role, userId]);

  async function adjuntar(id: string, file: File) {
    setBusyId(id);
    setError(null);
    try {
      const dataUrl = await readFile(file);
      const updated = await api<PendienteComprobante>(
        `/inventario/pendientes-comprobante/${id}/ticket`,
        {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({ dataUrl }),
        },
      );
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
      setTicketFor(null);
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo adjuntar el ticket.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function recibir(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await api<PendienteComprobante>(
        `/inventario/pendientes-comprobante/${id}/recibir`,
        { role: role!, userId, method: 'POST' },
      );
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo marcar como recibida.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Pendientes"
        lede="Compras externas usadas en una visita. No mueven stock. Adjunte el ticket y marque cuando llegue."
      />
      <FormAlert>{error}</FormAlert>
      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No hay compras externas pendientes.
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const abierto = row.estado === 'PENDIENTE';
            return (
              <Card key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold">{row.sku}</p>
                    <p className="text-sm">
                      {row.nombre} · {row.qty} {etiquetaUom('pieza')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFecha(row.createdAt)} · <OtLink visitaId={row.visitaId} labels={labels} />
                    </p>
                  </div>
                  <Badge variant={abierto ? 'warning' : 'success'}>
                    {row.estado}
                  </Badge>
                </div>
                {row.ticketDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.ticketDataUrl}
                    alt={`Ticket ${row.sku}`}
                    className="mt-3 max-h-28 rounded-lg border border-border"
                  />
                ) : null}
                {abierto ? (
                  <div className="mt-3 grid gap-2 sm:flex">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={busyId === row.id}
                      onClick={() =>
                        setTicketFor(ticketFor === row.id ? null : row.id)
                      }
                    >
                      Adjuntar ticket
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={busyId === row.id}
                      onClick={() => void recibir(row.id)}
                    >
                      Marcar recibida
                    </Button>
                  </div>
                ) : null}
                {abierto && ticketFor === row.id ? (
                  <div className="mt-3">
                    <ImageDropzone
                      label="Tomar o subir"
                      hint="Foto del ticket o nota de compra"
                      disabled={busyId === row.id}
                      onFile={(file) => void adjuntar(row.id, file)}
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
