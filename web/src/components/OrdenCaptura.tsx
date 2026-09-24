'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, ImagePlus, Package } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import { etiquetaUom } from '@/lib/format';
import type { OrigenPieza, SkuCompatible, Unidad, VisitaDetalle } from '@/lib/types';

type Panel = 'unidad' | 'pieza' | 'foto';

export function OrdenCaptura({
  role,
  userId,
  editable,
  detalle,
  fotoUnidad,
  onVisita,
  onFotoUnidad,
}: {
  role: string;
  userId?: string;
  editable: boolean;
  detalle: VisitaDetalle;
  fotoUnidad: string | null;
  onVisita: (visita: VisitaDetalle) => void;
  onFotoUnidad: (foto: string | null) => void;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opts = { role, userId };

  function abrir(next: Panel) {
    setError(null);
    setListo(null);
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="ordenes-captura">
      <div className="ordenes-captura__menu" role="toolbar" aria-label="Captura de la orden">
        <button type="button" aria-pressed={panel === 'unidad'} onClick={() => abrir('unidad')}>
          <Camera aria-hidden />
          Foto de la unidad
        </button>
        <button
          type="button"
          disabled={!editable}
          aria-pressed={panel === 'pieza'}
          onClick={() => abrir('pieza')}
        >
          <Package aria-hidden />
          Agregar pieza
        </button>
        <button
          type="button"
          disabled={!editable}
          aria-pressed={panel === 'foto'}
          onClick={() => abrir('foto')}
        >
          <ImagePlus aria-hidden />
          Subir foto
        </button>
      </div>
      {editable ? null : (
        <p className="ordenes-captura__note">
          Las piezas y las fotos de la orden se capturan mientras está abierta.
        </p>
      )}
      {listo ? <p className="ordenes-captura__note">{listo}</p> : null}
      <FormAlert>{error}</FormAlert>
      {panel === 'unidad' ? (
        <FotoUnidadPanel
          unidadId={detalle.unidadId}
          foto={fotoUnidad}
          busy={busy}
          opts={opts}
          onError={setError}
          onBusy={setBusy}
          onSaved={(foto) => {
            onFotoUnidad(foto);
            setListo('Foto de la unidad guardada.');
          }}
        />
      ) : null}
      {panel === 'pieza' && editable ? (
        <PiezaPanel
          detalle={detalle}
          busy={busy}
          opts={opts}
          onError={setError}
          onBusy={setBusy}
          onSaved={(visita) => {
            onVisita(visita);
            setListo('Pieza agregada a la orden.');
          }}
        />
      ) : null}
      {panel === 'foto' && editable ? (
        <FotoOrdenPanel
          detalle={detalle}
          busy={busy}
          opts={opts}
          onError={setError}
          onBusy={setBusy}
          onSaved={(visita) => {
            onVisita(visita);
            setListo('Foto agregada a la orden.');
          }}
        />
      ) : null}
    </div>
  );
}

function FotoUnidadPanel({
  unidadId,
  foto,
  busy,
  opts,
  onError,
  onBusy,
  onSaved,
}: {
  unidadId: string;
  foto: string | null;
  busy: boolean;
  opts: { role: string; userId?: string };
  onError: (message: string | null) => void;
  onBusy: (value: boolean) => void;
  onSaved: (foto: string | null) => void;
}) {
  const [pendiente, setPendiente] = useState<string | null>(foto);

  useEffect(() => {
    setPendiente(foto);
  }, [foto]);

  async function guardar() {
    onBusy(true);
    onError(null);
    try {
      const unidad = await api<Unidad>(`/unidades/${unidadId}/foto`, {
        ...opts,
        method: 'PATCH',
        body: JSON.stringify({ fotoDataUrl: pendiente }),
      });
      onSaved(unidad.fotoDataUrl ?? null);
    } catch (err) {
      onError(err instanceof HttpError ? err.message : 'No se pudo guardar la foto de la unidad.');
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="ordenes-captura__panel">
      <p className="ordenes-captura__label">Foto de la unidad</p>
      {pendiente ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ordenes-captura__preview" src={pendiente} alt="Foto de la unidad" />
      ) : (
        <p className="muted">Sin foto de la unidad.</p>
      )}
      <ImageDropzone
        label="Tomar o subir"
        hint="Esta foto queda en la unidad."
        disabled={busy}
        onFile={(file) => leerImagen(file, setPendiente, onError)}
      />
      <div className="ordenes-captura__actions">
        <Button type="button" size="compact" className="ordenes-primary" disabled={busy} onClick={() => void guardar()}>
          Guardar foto
        </Button>
        {pendiente ? (
          <Button type="button" size="compact" variant="outline" disabled={busy} onClick={() => setPendiente(null)}>
            Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PiezaPanel({
  detalle,
  busy,
  opts,
  onError,
  onBusy,
  onSaved,
}: {
  detalle: VisitaDetalle;
  busy: boolean;
  opts: { role: string; userId?: string };
  onError: (message: string | null) => void;
  onBusy: (value: boolean) => void;
  onSaved: (visita: VisitaDetalle) => void;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<SkuCompatible[]>([]);
  const [elegido, setElegido] = useState<SkuCompatible | null>(null);
  const [qty, setQty] = useState(1);
  const usados = useMemo(
    () => new Set(detalle.piezas.map((pieza) => pieza.itemId)),
    [detalle.piezas],
  );

  const role = opts.role;
  const userId = opts.userId;

  useEffect(() => {
    if (!detalle.tipoVehiculoId) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ tipoVehiculoId: detalle.tipoVehiculoId! });
          if (q.trim()) params.set('q', q.trim());
          setResultados(
            await api<SkuCompatible[]>(`/inventario/skus?${params.toString()}`, { role, userId }),
          );
          onError(null);
        } catch (err) {
          onError(err instanceof HttpError ? err.message : 'No se pudieron buscar las piezas.');
        }
      })();
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q, detalle.tipoVehiculoId, role, userId, onError]);

  async function agregar() {
    if (!elegido) return;
    onBusy(true);
    onError(null);
    const origen: OrigenPieza = elegido.stock >= qty ? 'DESDE_STOCK' : 'COMPRA_EXTERNA';
    try {
      const next = await api<VisitaDetalle>(`/visitas/${detalle.id}`, {
        ...opts,
        method: 'PATCH',
        body: JSON.stringify({
          piezas: [
            ...detalle.piezas.map((pieza) => ({
              itemId: pieza.itemId,
              qty: pieza.qty,
              origen: pieza.origen,
            })),
            { itemId: elegido.id, qty, origen },
          ],
        }),
      });
      setElegido(null);
      setQty(1);
      onSaved(next);
    } catch (err) {
      onError(err instanceof HttpError ? err.message : 'No se pudo agregar la pieza.');
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="ordenes-captura__panel">
      <p className="ordenes-captura__label">Pieza usada en esta orden</p>
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Buscar SKU o nombre"
        aria-label="Buscar pieza"
      />
      <ul className="ordenes-captura__skus">
        {resultados.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={usados.has(item.id) || busy}
              className={elegido?.id === item.id ? 'is-on' : ''}
              onClick={() => setElegido(item)}
            >
              <span className="mono">{item.sku}</span> {item.nombre}
              <span className="muted">
                {' '}
                · {item.stock} {etiquetaUom(item.uom)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="ordenes-captura__actions">
        <label>
          Cantidad
          <Input
            type="number"
            min={1}
            value={qty}
            className="w-20"
            onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        <Button
          type="button"
          size="compact"
          className="ordenes-primary"
          disabled={!elegido || busy}
          onClick={() => void agregar()}
        >
          Agregar a la orden
        </Button>
      </div>
      {elegido ? (
        <p className="ordenes-captura__note">
          {elegido.stock >= qty
            ? 'Se toma de stock.'
            : 'No alcanza el stock: queda como compra externa.'}
        </p>
      ) : null}
    </div>
  );
}

function FotoOrdenPanel({
  detalle,
  busy,
  opts,
  onError,
  onBusy,
  onSaved,
}: {
  detalle: VisitaDetalle;
  busy: boolean;
  opts: { role: string; userId?: string };
  onError: (message: string | null) => void;
  onBusy: (value: boolean) => void;
  onSaved: (visita: VisitaDetalle) => void;
}) {
  async function subir(dataUrl: string) {
    if (detalle.fotos.length >= 8) {
      onError('Puede adjuntar como máximo 8 fotos.');
      return;
    }
    onBusy(true);
    onError(null);
    try {
      const next = await api<VisitaDetalle>(`/visitas/${detalle.id}`, {
        ...opts,
        method: 'PATCH',
        body: JSON.stringify({
          fotos: [...detalle.fotos.map((foto) => ({ dataUrl: foto.dataUrl })), { dataUrl }],
        }),
      });
      onSaved(next);
    } catch (err) {
      onError(err instanceof HttpError ? err.message : 'No se pudo subir la foto.');
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="ordenes-captura__panel">
      <p className="ordenes-captura__label">Foto de esta orden</p>
      <ImageDropzone
        label="Tomar o subir"
        hint={`${detalle.fotos.length} de 8`}
        disabled={busy || detalle.fotos.length >= 8}
        onFile={(file) => leerImagen(file, (dataUrl) => void subir(dataUrl), onError)}
      />
    </div>
  );
}

function leerImagen(
  file: File,
  onData: (dataUrl: string) => void,
  onError: (message: string | null) => void,
) {
  if (!file.type.startsWith('image/')) {
    onError('Elija una imagen.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onData(reader.result);
  };
  reader.readAsDataURL(file);
}
