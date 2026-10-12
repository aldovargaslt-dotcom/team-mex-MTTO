'use client';

import { useState, type FocusEvent } from 'react';
import { HttpError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/field';

export function ReadStatus({ loading, error, loadingText, errorText, retry, retryLabel = 'Reintentar', className = '' }: {
  loading: boolean; error?: unknown; loadingText: string; errorText: string;
  retry: () => void; retryLabel?: string; className?: string;
}) {
  const [retried, setRetried] = useState(false);
  const detail = error instanceof HttpError
    ? error.status === 403 ? ' No tienes acceso con este perfil.'
      : error.status === 401 ? ' Verifica tu sesión.' : '' : '';
  function releaseRetryFocus(event: FocusEvent<HTMLButtonElement>) {
    if (loading || error) return;
    const next = event.relatedTarget;
    if (!(next instanceof HTMLElement)) { setRetried(false); return; }
    // Keep layout stable between pointer-down (blur) and click on the next control.
    const clear = () => {
      next.removeEventListener('click', clear);
      next.removeEventListener('blur', clear);
      setRetried(false);
    };
    next.addEventListener('click', clear, { once: true });
    next.addEventListener('blur', clear, { once: true });
  }
  return (
    <div aria-busy={loading} className={`read-status ${className}`}>
      <span role="status" className="muted">
        {loading ? loadingText : !error && retried ? 'Consulta actualizada.' : ''}
      </span>
      <FormAlert>{error ? `${errorText}${detail}` : null}</FormAlert>
      {error || retried ? (
        <Button type="button" variant="outline" aria-label={retryLabel === 'Reintentar' ? `${retryLabel}: ${errorText}` : retryLabel} onBlur={releaseRetryFocus} aria-disabled={loading} onClick={() => { if (loading) return; setRetried(true); retry(); }}>
          {loading ? 'Reintentando…' : retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
