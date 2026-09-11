# ADR-006 — Schema `notifications` (inbox)

Estado: aceptado (v0)

Notifications es un BC delgado (campanita + inbox). **No** es el bus de Andon ni el dueño de stock. WhatsApp / outbound de avisos sigue en `NotifyPort` de Andon.

## Schema PostgreSQL `notifications`

Sin JOINs ni FKs hacia `andon.*`, `inventario.*`, `visitas` ni `unidades`. `source_ref` y `subject_ref` son IDs opacos.

### `inbox_item`

| Columna | Notas |
|---------|--------|
| `id` | UUID |
| `source_module` | `ANDON` \| `INVENTARIO` |
| `source_event` | p. ej. `AvisoAbierto`, `StockBajo` |
| `source_ref` | opaco (avisoId, itemId, …); **sin FK cruzada** |
| `subject_type` | `UNIDAD` \| `ITEM` \| `NONE` |
| `subject_ref` | opaco |
| `severity` | `LOW` \| `INFO` \| `WARNING` \| `CRITICAL` |
| `title` | |
| `body` | |
| `dedupe_key` | **unique** — upsert, no duplicar activo |
| `created_at` | |
| `expires_at` | nullable; AvisoResuelto expira/limpia el matching `dedupe_key` |

`deeplinkPath` se **calcula** en el DTO (no columna): UNIDAD → `/unidades/{subject_ref}`.

### `inbox_read`

PK `(inbox_item_id, user_id)`. `read_at`. `user_id` es el id opaco de Kernel (`X-User-Id`). FK **solo** a `notifications.inbox_item`.

## API

- `GET /notifications` — default no leídas; `?filter=all` todas (no expiradas). No leídas primero.
- `GET /notifications/badge` — `{ unread }`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

Supervisor y Admin: mismo inbox v0.

## Productores v0

- **Andon `AvisoAbierto`** (cableado): `WARNING`, `subject_type=UNIDAD`, `dedupe_key=ANDON:AvisoAbierto:{unidadId}`.
- **Andon `AvisoResuelto`**: no crea fila nueva; `expires_at` en el ítem matching.
- **Inventario `StockBajo`**: tipos + handler de ingest listos; Inventario aún no emite.

## Prohibido

- Filas o tablas de stock en `andon.*` (ADR-005).
- Reemplazar `NotifyPort` (WA) por este inbox.
