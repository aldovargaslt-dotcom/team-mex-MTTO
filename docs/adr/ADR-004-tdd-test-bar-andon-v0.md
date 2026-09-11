# ADR-004 — TDD test bar (Andon v0)

Estado: aceptado (v0)

Barra de pruebas para el kernel de cierre / outbox / inventario / **Andon**. TDD estricto en Andon (A1–A8) con dominio puro e in-memory fakes. Caracterización (C/O/I) en lo ya existente.

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

TDD en `api/src/andon/andon-engine.spec.ts` (fakes en memoria; sin Postgres):

- **A1** — skip si no hay visita cerrada previa.
- **A2** — a lo más 1 aviso no resuelto (`ABIERTO` | `ENTERADO`) por `unidadId`.
- **A3** — abre si km desde la última cerrada ≥ `t_km` **o** días ≥ `t_dias`.
- **A4** — unidad inactiva: no abre aviso nuevo.
- **A5** — `VisitaCerrada` → `RESUELTO` + `visita_resolutoria_id` opaco.
- **A6** — Enterado (Supervisor) es in-app; no resuelve.
- **A7** — el handler ignora `consumos`; nunca escribe Visita ni stock.
- **A8** — resolver es idempotente ante `eventId` duplicado.

## Notifications (N1–N4)

TDD en `api/src/notifications/inbox-engine.spec.ts` (fakes en memoria; sin Postgres). Schema ADR-006.

- **N1** — mismo `dedupe_key` → upsert, no segunda fila activa.
- **N2** — `inbox_read` por `(inbox_item_id, user_id)`; badge excluye leídas; listado no leídas primero; mark-all.
- **N3** — productor Andon `AvisoAbierto` → ítem `WARNING`, `source_module=ANDON`, `subject_type=UNIDAD`. WhatsApp sigue en `NotifyPort`.
- **N4** — `AvisoResuelto` pone `expires_at` en el matching `dedupe_key`; handler `StockBajo` escribe `notifications` (no `andon`); cero tablas/filas de stock en `andon.*`.

## Outbound ops

Puerto `NotifyPort`. `ANDON_NOTIFY_PROVIDER=evolution|noop` (**default noop**). Contrato lab: `POST /message/sendText/{instance}` con `number=ANDON_WA_GROUP_JID` (`@g.us`). Cableado HTTP: **otro agente**. Throwaway Baileys — **riesgo ToS, no prod**. Meta/Twilio no en este PR. Enterado in-app. Checklist: [andon-whatsapp-ops-checklist-v0](../../architecture/andon-whatsapp-ops-checklist-v0.md).
