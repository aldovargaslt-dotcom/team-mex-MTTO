# ADR-004 — TDD test bar (Andon v0)

Estado: aceptado (v0)

Barra de pruebas para el kernel de cierre / outbox / inventario. **Andon (A1–A8) queda para TDD posterior**; no hay módulo Andon en este corte.

Caracterización (no retro-TDD completo) en lo ya existente. TDD estricto hacia adelante en Andon y código nuevo.

## Cierre (C1–C4)

- **C1** — `erroresCierre`: unidad ACTIVA, chofer, km, tipo, ≥1 trabajo, ambas firmas.
- **C2** — km &lt; último cerrado no se persiste ni como borrador.
- **C3** — outbox `VisitaCerrada` solo si la visita queda `CERRADO` (no en PATCH de borrador).
- **C4** — fallo de cierre (p. ej. stock) o visita ya cerrada: sin fila outbox extra.

## Outbox (O1–O2)

- **O1** — payload: `eventId`, `visitaId`, `unidadId`, `tipoVehiculoId`, `km`, `cerradoAt`, `consumos` (más `eventType` / `occurredAt` de ADR-001). `eventId` = `outbox_events.id`.
- **O2** — el mismo `eventId` no se despacha de nuevo si `processedAt` ya está (idempotencia barata en el kernel).

## Inventario apply (I1–I4)

Solo si se toca el handler de apply (ADR-002). Si no se toca, se **conservan** las pruebas existentes:

- **I1** — `DESDE_STOCK` → `SALIDA_OT` si stock ≥ qty.
- **I2** — stock insuficiente: 400, visita `BORRADOR`, stock intacto, sin outbox.
- **I3** — `COMPRA_EXTERNA` → pendiente de comprobante, sin movimiento de stock.
- **I4** — `itemId` opaco; DTO de visita sin `sku`/`stock`.

## Andon (A1–A8)

Fuera de alcance. TDD cuando exista el módulo.
