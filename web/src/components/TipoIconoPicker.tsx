import { UnidadTipoIcon } from '@/components/UnidadTipoMark';
import { ICONOS_TIPO, type TipoGlyph } from '@/lib/unidades-catalogo';
import { cn } from '@/lib/utils';

export function TipoIconoPicker({
  value,
  onChange,
  id,
}: {
  value: TipoGlyph;
  onChange: (id: TipoGlyph) => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="unidades-icono-picker"
      role="radiogroup"
      aria-label="Icono"
    >
      {ICONOS_TIPO.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(selected && 'active')}
            onClick={() => onChange(option.id)}
          >
            <UnidadTipoIcon nombre={option.label} icono={option.id} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
