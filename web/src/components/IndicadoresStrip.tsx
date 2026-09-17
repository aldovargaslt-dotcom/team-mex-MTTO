import { cn } from '@/lib/utils';
import type { HubIndicador } from '@/lib/hub-indicadores';

export function IndicadoresStrip({
  items,
  label,
}: {
  items: HubIndicador[];
  label: string;
}) {
  return (
    <div className="indicadores" role="list" aria-label={label}>
      {items.map((item) => (
        <div
          key={item.id}
          role="listitem"
          className={cn(
            'indicador',
            item.tono === 'warn' && 'indicador--warn',
            item.tono === 'muted' && 'indicador--muted',
          )}
        >
          <p className="indicador__label">{item.label}</p>
          <p className="indicador__value">{item.value}</p>
          {item.detalle ? (
            <p className="indicador__detalle">{item.detalle}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
