'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

export function SignaturePad({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  function pos(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const source =
      'touches' in event
        ? event.touches[0]
        : (event as React.MouseEvent);
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.MouseEvent | React.TouchEvent) {
    if (disabled) return;
    event.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || disabled) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(event);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#24284D';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  }

  return (
    <div className="signature">
      <div className="signature-head">
        <span>{label}</span>
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="compact"
            onClick={clear}
            aria-label="Borrar firma"
          >
            Borrar firma
          </Button>
        ) : null}
      </div>
      {disabled && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="signature-img" src={value} alt={label} />
      ) : (
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          className="signature-canvas"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      )}
    </div>
  );
}
