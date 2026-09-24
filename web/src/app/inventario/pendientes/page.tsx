'use client';

import { useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaEstadoPendiente, etiquetaUom, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { PendienteComprobante } from '@/lib/types';
import { ImageDropzone } from '@/components/ImageDropzone';
import { OtLink, useOtLabels } from '@/components/OtLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        title="Por recibir"
        help="Compras externas aún sin entrar al almacén. Cerrar el comprobante no cambia existencias."
      />
      <FormAlert>{error}</FormAlert>
      {rows.length > 0 ? (
        <div className="card overflow-hidden">
          {rows.map((row) => {
            const abierto = row.estado === 'PENDIENTE';
            return (
              <div key={row.id} className="queue-row">
                <div>
                  <p>
                    <span className="mono">{row.sku}</span> {row.nombre} · {row.qty}{' '}
                    {etiquetaUom('pieza')}
                  </p>
                  <p className="muted">
                    {formatFecha(row.createdAt)} ·{' '}
                    <OtLink visitaId={row.visitaId} labels={labels} />
                  </p>
                  {row.ticketDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.ticketDataUrl}
                      alt={`Ticket ${row.sku}`}
                      className="mt-1 max-h-16 rounded-md border border-border"
                    />
                  ) : null}
                  {abierto && ticketFor === row.id ? (
                    <div className="mt-2">
                      <ImageDropzone
                        label="Tomar o subir"
                        hint="Foto del ticket"
                        disabled={busyId === row.id}
                        onFile={(file) => void adjuntar(row.id, file)}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="row-actions">
                  <Badge variant={abierto ? 'warning' : 'success'}>
                    {etiquetaEstadoPendiente(row.estado)}
                  </Badge>
                  {abierto ? (
                    <>
                      <Button
                        type="button"
                        size="compact"
                        disabled={busyId === row.id}
                        onClick={() =>
                          setTicketFor(ticketFor === row.id ? null : row.id)
                        }
                      >
                        Adjuntar ticket
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="compact"
                        disabled={busyId === row.id}
                        onClick={() => void recibir(row.id)}
                      >
                        Cerrar comprobante
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : !error ? (
        <div className="empty-state">
          <h2>Nada por recibir.</h2>
          <p className="muted">
            Las compras externas de una visita aparecen aquí hasta marcarlas
            recibidas.
          </p>
        </div>
      ) : null}
    </>
  );
}
