'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function ActionMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root?.open) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      root.removeAttribute('open');
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <details ref={rootRef} className="action-menu">
      <summary>
        <span>{label}</span>
        <ChevronDown className="action-menu__chevron" aria-hidden />
      </summary>
      <div className="action-menu__panel">{children}</div>
    </details>
  );
}

export function ActionMenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="action-menu__item"
      onClick={(event) => {
        const details = event.currentTarget.closest('details');
        details?.removeAttribute('open');
        onClick();
      }}
    >
      {children}
    </button>
  );
}
