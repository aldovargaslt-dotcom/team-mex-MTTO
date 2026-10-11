'use client';

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

// A changed resource identity never exposes another role/filter/object's data.
// Only reads are retried; callers keep mutation state and domain rules separate.
export function useReadResource<T>(key: string | null, read: () => Promise<T>, retainDuringRetry = false) {
  const readRef = useRef(read);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string | null; data: T | null; loading: boolean; error: unknown;
  }>({ key: null, data: null, loading: true, error: null });
  useEffect(() => { readRef.current = read; }, [read]);
  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ key, data: retainDuringRetry && current.key === key ? current.data : null, loading: true, error: null }));
    if (key !== null) {
      void readRef.current().then(
        (data) => { if (!cancelled) setState({ key, data, loading: false, error: null }); },
        (error: unknown) => { if (!cancelled) setState({ key, data: null, loading: false, error }); },
      );
    }
    return () => { cancelled = true; };
  }, [key, attempt, retainDuringRetry]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((next: SetStateAction<T | null>) => {
    setState((current) => current.key !== key ? current : {
      ...current, data: typeof next === 'function'
        ? (next as (value: T | null) => T | null)(current.data) : next,
    });
  }, [key]);
  return { ...(state.key === key ? state : { data: null, loading: true, error: null }), retry, setData, retried: attempt > 0 };
}
