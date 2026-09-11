import { cn } from '@/lib/utils';

export function VisitStepper({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: readonly { id: string; label: string }[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const current = steps[currentIndex];
  return (
    <>
      <div className="stepper-mobile">
        <p className="text-[13px] font-medium text-navy">
          Paso {currentIndex + 1} de {steps.length} · {current.label}
        </p>
        <div className="stepper-dots" aria-hidden>
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(index <= currentIndex && 'on')}
            />
          ))}
        </div>
      </div>
      <ol className="steps">
        {steps.map((item, index) => (
          <li
            key={item.id}
            className={
              index === currentIndex
                ? 'active'
                : index < currentIndex
                  ? 'done'
                  : ''
            }
          >
            <button type="button" onClick={() => onSelect(index)}>
              {index + 1}. {item.label}
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
