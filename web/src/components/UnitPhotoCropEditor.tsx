'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/field';
import { exportUnitPhoto, loadOrientedImage } from '@/lib/unit-photo';

type Point = { x: number; y: number };
type Gesture = { kind: 'drag'; point: Point } | { kind: 'pinch'; distance: number; zoom: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function UnitPhotoCropEditor({
  file,
  onCancel,
  onUse,
}: {
  file: File | null;
  onCancel: () => void;
  onUse: (dataUrl: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      setImage(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    setImage(null);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setError(null);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!src) return;
    let active = true;
    void loadOrientedImage(src)
      .then((loaded) => {
        if (active) setImage(loaded);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir esta foto. Elige otra imagen.');
      });
    return () => {
      active = false;
    };
  }, [src]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrame({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [file, image]);

  const baseScale = image && frame.width && frame.height
    ? Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight)
    : 0;
  const renderedWidth = image ? image.naturalWidth * baseScale * zoom : 0;
  const renderedHeight = image ? image.naturalHeight * baseScale * zoom : 0;

  function clamp(next: Point, nextZoom = zoom): Point {
    if (!image || !frame.width || !frame.height) return { x: 0, y: 0 };
    const scale = baseScale * nextZoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    return {
      x: Math.max(-(width - frame.width) / 2, Math.min((width - frame.width) / 2, next.x)),
      y: Math.max(-(height - frame.height) / 2, Math.min((height - frame.height) / 2, next.y)),
    };
  }

  function setZoomAndClamp(value: number, nextOffset = offset) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    setZoom(nextZoom);
    setOffset(clamp(nextOffset, nextZoom));
  }

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, pointFromEvent(event));
    const values = [...pointers.current.values()];
    if (values.length >= 2) {
      const [a, b] = values;
      gesture.current = { kind: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    } else {
      gesture.current = { kind: 'drag', point: pointFromEvent(event) };
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = pointFromEvent(event);
    pointers.current.set(event.pointerId, point);
    const currentGesture = gesture.current;
    if (pointers.current.size >= 2 && currentGesture?.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoomAndClamp(currentGesture.zoom * (distance / currentGesture.distance));
    } else if (currentGesture?.kind === 'drag') {
      const dx = point.x - currentGesture.point.x;
      const dy = point.y - currentGesture.point.y;
      setOffset((current) => clamp({ x: current.x + dx, y: current.y + dy }));
      gesture.current = { kind: 'drag', point };
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    const remaining = [...pointers.current.values()][0];
    gesture.current = remaining ? { kind: 'drag', point: remaining } : null;
  }

  async function confirmPhoto() {
    if (!image || !frame.width || busy) return;
    setBusy(true);
    setError(null);
    try {
      const scale = baseScale * zoom;
      const crop = {
        x: ((renderedWidth - frame.width) / 2 - offset.x) / scale,
        y: ((renderedHeight - frame.height) / 2 - offset.y) / scale,
        width: frame.width / scale,
        height: frame.height / scale,
      };
      onUse(await exportUnitPhoto(image, crop));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo preparar la foto.');
    } finally {
      setBusy(false);
    }
  }

  if (!file) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="unit-photo-crop-dialog">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>Lo que está dentro del marco se guardará.</DialogDescription>
        </DialogHeader>
        <div
          ref={frameRef}
          className="unit-photo-crop-frame"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(event) => {
            const delta = event.shiftKey ? 20 : 8;
            const directions: Record<string, Point> = {
              ArrowLeft: { x: -delta, y: 0 },
              ArrowRight: { x: delta, y: 0 },
              ArrowUp: { x: 0, y: -delta },
              ArrowDown: { x: 0, y: delta },
            };
            const movement = directions[event.key];
            if (movement) {
              event.preventDefault();
              setOffset((current) => clamp({ x: current.x + movement.x, y: current.y + movement.y }));
            }
          }}
          onWheel={(event) => {
            event.preventDefault();
            setZoomAndClamp(zoom * (event.deltaY < 0 ? 1.06 : 0.94));
          }}
          role="img"
          aria-label="Previsualización del recorte 4 por 3. Arrastra para ajustar la foto."
        >
          {src && image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="unit-photo-crop-image"
              src={src}
              alt=""
              draggable={false}
              style={{
                width: renderedWidth,
                height: renderedHeight,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <p className="unit-photo-crop-loading">Preparando foto…</p>
          )}
          <div className="unit-photo-crop-mask" aria-hidden />
        </div>
        <div className="unit-photo-crop-controls">
          <label htmlFor="unit-photo-zoom">Zoom</label>
          <input
            id="unit-photo-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!image || busy}
            onChange={(event) => setZoomAndClamp(Number(event.target.value))}
            aria-label="Zoom"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!image || busy}
            onClick={() => {
              setZoom(MIN_ZOOM);
              setOffset({ x: 0, y: 0 });
            }}
          >
            Restablecer
          </Button>
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        <DialogFooter className="unit-photo-crop-footer">
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" disabled={!image || busy} onClick={() => void confirmPhoto()}>
            {busy ? 'Preparando…' : 'Usar foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
