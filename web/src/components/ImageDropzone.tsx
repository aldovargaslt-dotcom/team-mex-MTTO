'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImageDropzone({
  onFile,
  label = 'Tomar o subir',
  hint,
  disabled,
  capture = true,
}: {
  onFile: (file: File) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  capture?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'dropzone',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      onClick={() => inputRef.current?.click()}
    >
      <Camera className="size-5 text-navy" aria-hidden />
      <span>{label}</span>
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture ? 'environment' : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </button>
  );
}
