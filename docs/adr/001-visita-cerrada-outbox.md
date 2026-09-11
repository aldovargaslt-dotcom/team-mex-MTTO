# ADR-001 — Envelope `VisitaCerrada` (outbox)

Estado: aceptado

Al cerrar una visita, Mantenimiento escribe `outbox_events` en la **misma transacción** que marca `CERRADO`. El payload congelado es:

```ts
type VisitaCerrada = {
  eventId: string;          // outbox row id — clave de idempotencia
  eventType: "VisitaCerrada";
  occurredAt: string;       // ISO-8601 (cerradoAt)
  visitaId: string;
  unidadId: string;
  tipoVehiculoId: string;
  km: number;
  cerradoAt: string;
  consumos: Array<{ itemId: string; qty: number; origen: "DESDE_STOCK" | "COMPRA_EXTERNA" }>;
};
```

- `eventId` = `outbox_events.id`.
- `occurredAt` = el mismo ISO-8601 que `cerradoAt`.
- Inventario **aplica** `consumos` según ADR-002; no interpreta el resto del envelope.
