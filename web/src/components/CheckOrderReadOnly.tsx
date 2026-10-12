'use client';

import { CHECK_RESULT_LABEL, CHECK_SOURCE_LABEL, CHECK_STATUS_LABEL, type CheckOrderDetail } from '@/lib/order-types';
import { formatFecha } from '@/lib/format';

export function CheckOrderReadOnly({ detail, mobile }: { detail: CheckOrderDetail; mobile: boolean }) {
  const Heading = mobile ? 'h1' : 'h2';
  return (
    <section className="rounded-md border border-border bg-card p-4" aria-label="Revisión de consulta">
      <header className="mb-3">
        <p className="text-xs text-muted-foreground">Revisión · Solo consulta</p>
        <Heading className="text-[20px] font-semibold text-navy">{detail.unit.numeroInterno}</Heading>
        <p className="text-xs text-muted-foreground">{detail.unit.placas} · {CHECK_STATUS_LABEL[detail.status]}</p>
      </header>
      <dl className="grid gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Origen</dt><dd>{CHECK_SOURCE_LABEL[detail.source] ?? 'Chequeo operativo'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Fecha operativa</dt><dd>{detail.operationalDate}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Dictamen</dt><dd>{detail.result ? CHECK_RESULT_LABEL[detail.result] : 'Pendiente de dictamen'}</dd></div>
        {detail.completedAt ? <div><dt className="text-xs text-muted-foreground">Concluida</dt><dd>{formatFecha(detail.completedAt)}</dd></div> : null}
        {detail.validity ? <div><dt className="text-xs text-muted-foreground">Vigencia del chequeo</dt><dd>{detail.validity.invalidated ? 'Invalidada' : detail.validity.expired ? 'Vencida' : detail.validity.valid ? 'Vigente' : 'No vigente'}</dd></div> : null}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">La ejecución y firma se realizan en el flujo de chequeos autorizado.</p>
    </section>
  );
}
