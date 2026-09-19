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

## Inventario umbral (S1–S4)

TDD en `api/src/inventario/stock-alerta-rules.spec.ts` (puro + fake `StockAlertPort`) + e2e de cruce.

- **S1** — `min_qty` null = sin alerta (opt-in). `qty <= min_qty` → Bajo; `qty = 0` → Agotado / `CRITICAL`; `qty > 0` → `WARNING`.
- **S2** — cruce a `qty <= min_qty` emite `StockBajo` por `StockAlertPort` con envelope `{ eventId, itemId, sku, qty, minQty, occurredAt }`; cruce a `qty > min_qty` emite `StockReabastecido`. Notifications: `source_module=INVENTARIO`, `subject_type=ITEM`, `subject_ref=itemId`, `dedupe_key=INV:stock-bajo:{itemId}`.
- **S3** — cero escrituras en `andon.*` (ADR-005). WhatsApp Inventario fuera.
- **S4** — dominio Inventario no escribe `notifications.*` ni `andon.*`; solo el adapter Notifications llama `ingestStockBajo` / `clear`.

## Flota patio (F1–F11)

TDD en `api/src/flota/flota-engine.spec.ts` (fakes en memoria; sin Postgres). Spec: [fleet-manager-v0](../specs/fleet-manager-v0.md).

- **F1** — una sola `SALIDA` abierta por `unidadId`; segunda salida → error.
- **F2** — `ENTRADA` exige salida abierta de esa unidad; la cierra.
- **F3** — chofer debe estar `ACTIVO` (catálogo kernel).
- **F4** — sitio debe existir y estar `ACTIVO`.
- **F5** — `occurredAt` no puede ser futuro.
- **F6** — `ENTRADA.occurredAt` >= `SALIDA.occurredAt` de la abierta.
- **F7** — km de entrada >= km de la salida abierta.
- **F8** — firmas `CHOFER` y `AVAL` obligatorias en el mismo alta; sin ellas no hay fila.
- **F9** — un chofer no puede tener dos `SALIDA` abiertas (unidades distintas).
- **F10** — bitácora permitida si la unidad está `INACTIVA`.
- **F11** — no hay borrador: alta + proyección + firmas en una transacción lógica.

## Salud de unidad (H1–H15)

TDD en `api/src/salud/*.spec.ts` (dominio puro e in-memory fakes; sin Postgres). Spec: [unit-health-v0](../specs/unit-health-v0.md). ADR-010.

- **H1** — 72/80/100 × 45/40/15 → raw 79.4 → display 79 `GOOD`.
- **H2** — pesos 0–100, suma exactamente 100; 50+50+10 inválido; 0+100+0 válido; negativos y &gt;100 inválidos.
- **H3** — curva de mantenimiento progresiva (sin acantilado 1001 vs 999 km); `MIN(km, tiempo)`.
- **H4** — penalización de avisos SOURCE; `HEALTH_BELOW_THRESHOLD` (DERIVED) no cambia `alerts_score`.
- **H5** — hard caps: SAFETY CRITICAL → max 30; `maintenance_score <= 14` → max 50.
- **H6** — status sobre el entero redondeado: 89.5/90/74.9/75/59.9/60/39.9/40/0/100.
- **H7** — inspecciones `NOT_APPLICABLE` renormaliza; sin visita cerrada → No disponible (no 100).
- **H8** — `INACTIVA` no altera el score ni aplica cap de OOS.
- **H9** — previous 70, current 59, threshold 60 → crear alerta.
- **H10** — alerta activa y 59→55 → no duplicar.
- **H11** — histeresis 60/65: 59→62 sigue activa; 62→66 resuelve.
- **H12** — previous null, current 45 → crear.
- **H13** — cambio de threshold 60→70 con health 65 → reevaluar y crear.
- **H14** — PUT config: Admin ok; Supervisor y `LOGISTICA` 403.
- **H15** — dominio Salud no escribe `andon.*`; cero filas de health en schema Andon.

## Logística asignación (L1–L4)

TDD en `api/src/logistica/logistica-rules.spec.ts` (dominio puro; sin Postgres) + e2e de HTTP. ADR-008 (puerto `UnidadChoferAssignmentPort`).

- **L1** — 1:0..1: un chofer no se asigna a dos unidades; una unidad no toma segundo chofer sin `unassign`.
- **L2** — solo chofer `ACTIVO` es asignable; `INACTIVO` no aparece en `GET /logistica/choferes`.
- **L3** — soft-block: `PATCH` a `INACTIVO` falla si alguna `unidad.choferId` apunta al chofer; el chofer sigue `ACTIVO` y el kernel no se borra.
- **L4** — escritura síncrona a Kernel `unidades.chofer_id`; cero filas nuevas en `outbox_events`.

## Outbound ops

Puerto `NotifyPort`. `ANDON_NOTIFY_PROVIDER=evolution|noop` (**default noop**). Contrato lab: `POST /message/sendText/{instance}` con `number=ANDON_WA_GROUP_JID` (`@g.us`). Cableado HTTP: **otro agente**. Throwaway Baileys — **riesgo ToS, no prod**. Meta/Twilio no en este PR. Enterado in-app. Checklist: [andon-whatsapp-ops-checklist-v0](../../architecture/andon-whatsapp-ops-checklist-v0.md).
