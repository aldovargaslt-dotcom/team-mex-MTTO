'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BarChart3, Boxes, Check, ChevronDown, ChevronUp, FolderTree, Package, ReceiptText, Truck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { INVENTORY_OPS, INVENTORY_CATALOG, currentInventorySection, isInventoryDestination } from '@/lib/inventory-navigation';

const SECTION_ICONS: Record<string, LucideIcon> = {
  '/inventario/stock': Boxes,
  '/inventario': Package,
  '/inventario/analisis': BarChart3,
  '/inventario/pendientes': ReceiptText,
  '/inventario/familias': FolderTree,
  '/inventario/proveedores': Truck,
};

export function InventorySectionMenu({ placement = 'top' }: { placement?: 'top' | 'bottom-nav' }) {
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const closeReason = useRef<'cancel' | 'navigation' | 'resize' | 'outside'>('cancel');
  const current = currentInventorySection(pathname);
  const CurrentIcon = SECTION_ICONS[current.href] ?? Boxes;
  const fromBottom = placement === 'bottom-nav';

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) {
        closeReason.current = 'resize';
        setOpen(false);
      }
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <Sheet modal={!fromBottom} open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) closeReason.current = 'cancel';
      setOpen(nextOpen);
    }}>
      <SheetTrigger asChild>
        {fromBottom ? (
          <button type="button" className="supervisor-bottom-nav__item active inventory-bottom-trigger"
            aria-current="location" aria-label={`Inventario: ${current.label}. ${open ? 'Ocultar' : 'Mostrar'} secciones`}>
            <Boxes className="size-5" aria-hidden />
            <span className="inventory-bottom-trigger__label">Inventario<ChevronUp aria-hidden className="size-3" /></span>
          </button>
        ) : (
          <Button variant="secondary" className="inventory-section-trigger"
            aria-label={`Inventario: ${current.label}. Cambiar sección`}>
            <CurrentIcon aria-hidden strokeWidth={1.75} />
            <span className="inventory-section-trigger__text">
              <span>Inventario</span><strong>{current.label}</strong>
            </span>
            <ChevronDown aria-hidden className="inventory-section-trigger__chevron" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent ref={panel} side="bottom"
        aria-modal={!fromBottom}
        className={`inventory-section-sheet${fromBottom ? ' inventory-bottom-section-panel' : ''}`}
        onKeyDownCapture={(event) => {
          if (!fromBottom || event.key !== 'Tab') return;
          // Radix Dialog loops Tab even when non-modal. Let this navigation panel
          // yield focus to the bar instead of making keyboard users cycle inside.
          const targets = panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
          if (!targets?.length) return;
          const boundary = event.shiftKey ? targets[0] : targets[targets.length - 1];
          if (document.activeElement !== boundary) return;
          event.preventDefault();
          closeReason.current = 'outside';
          setOpen(false);
          document.querySelector<HTMLElement>(event.shiftKey
            ? '.inventory-bottom-trigger' : '.supervisor-bottom-nav a')?.focus();
        }}
        onOpenAutoFocus={(event) => {
          const active = panel.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')
            ?? panel.current?.querySelector<HTMLAnchorElement>('a');
          if (active) { event.preventDefault(); active.focus(); }
        }}
        onCloseAutoFocus={(event) => {
          if (closeReason.current === 'cancel') return;
          event.preventDefault();
          if (closeReason.current === 'resize') {
            const destination = window.matchMedia('(min-width: 768px)').matches
              ? document.querySelector<HTMLElement>('.app-sidebar__sublink[aria-current="page"]')
                ?? document.querySelector<HTMLElement>('.app-sidebar__module button')
              : document.querySelector<HTMLElement>('.inventory-primary-nav a[aria-current]')
                ?? document.querySelector<HTMLElement>('.inventory-primary-nav a');
            destination?.focus();
          }
        }}>
        <SheetHeader>
          <SheetTitle>Secciones de Inventario</SheetTitle>
          <SheetDescription>Elige la sección que quieres consultar.</SheetDescription>
        </SheetHeader>
        <nav className="inventory-section-sheet__nav" aria-label="Secciones de Inventario">
          {[{ label: 'Operación', links: INVENTORY_OPS }, { label: 'Catálogo', links: INVENTORY_CATALOG }].map((group) => (
            <div className="inventory-section-sheet__group" key={group.label}>
              <p className="inventory-section-sheet__heading">{group.label}</p>
              {group.links.map((link) => {
                const active = isInventoryDestination(pathname, link.href, link.exact);
                const Icon = SECTION_ICONS[link.href];
                return <Link href={link.href} key={link.href}
                  className={active ? 'inventory-section-link active' : 'inventory-section-link'}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    closeReason.current = active ? 'cancel' : 'navigation';
                    setOpen(false);
                  }}>
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                  <span>{link.label}</span>
                  {active ? <Check aria-hidden className="inventory-section-link__check size-4" /> : null}
                </Link>;
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
