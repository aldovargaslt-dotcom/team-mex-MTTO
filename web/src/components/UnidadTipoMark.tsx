import { Bus, Car, Truck, Van, type LucideIcon } from 'lucide-react';
import { glyphTipo, type TipoGlyph } from '@/lib/unidades-catalogo';
import { cn } from '@/lib/utils';

const ICONS: Record<TipoGlyph, LucideIcon> = {
  truck: Truck,
  car: Car,
  bus: Bus,
  van: Van,
};

export function UnidadTipoMark({
  nombre,
  icono,
  size = 'md',
}: {
  nombre: string;
  icono?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = ICONS[glyphTipo(nombre, icono)];
  const iconClass =
    size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-8' : 'size-5';
  return (
    <span
      className={cn(
        'unidades-thumb',
        size === 'sm' && 'unidades-thumb--sm',
        size === 'lg' && 'unidades-thumb--lg',
      )}
      aria-hidden
    >
      <Icon className={iconClass} strokeWidth={1.75} />
    </span>
  );
}

export function UnidadTipoIcon({
  nombre,
  icono,
  className,
}: {
  nombre: string;
  icono?: string | null;
  className?: string;
}) {
  const Icon = ICONS[glyphTipo(nombre, icono)];
  return (
    <Icon
      className={className ?? 'size-3.5'}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}
