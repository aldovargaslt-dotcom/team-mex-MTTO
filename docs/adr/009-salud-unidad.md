# ADR-009 — Salud de unidad (schema `salud`)

Estado: aceptado (v0)

Extiende [ADR-000](000-thin-kernel.md) (kernel delgado), [ADR-002](002-schema-per-module.md) (schema propio), [ADR-005](005-andon-no-stock-alerts.md) (Andon = vencido) y los productores de inbox de [ADR-006](006-notifications-schema.md). Spec: [unit-health-v0](../specs/unit-health-v0.md). Test IDs: H1–H15 en [ADR-004](ADR-004-tdd-test-bar-andon-v0.md).

## Decisión

La **salud de unidad** es un bounded context **Salud**, no un campo editable ni un tercer estado de `Unidad`.

- Persiste en schema PostgreSQL `salud`: configuración versionada, snapshot de cruce e histeresis, y el ciclo de vida de la alerta **derivada** `HEALTH_BELOW_THRESHOLD`.
- El score se **calcula** (mantenimiento + alertas fuente + inspecciones). No hay `PATCH` de health. `ACTIVA` / `INACTIVA` / envío especial no entran a la fórmula ni disparan inactivación.
- Lecturas de otros BC por **puertos** (IDs opacos, sin JOIN SQL): última visita cerrada y aviso Andon no resuelto; umbral `t_km` / `t_dias`; km más reciente de patio. Salud **no escribe** `andon.*`, `flota.*`, `visitas` ni `inventario.*`.
- La alerta por umbral de health es **DERIVED**: entra al inbox (`SourceModule.SALUD`, `dedupe_key=SALUD:HealthBelow:{unidadId}`) y **no** penaliza `alerts_score`. No usa WhatsApp / `NotifyPort` (dual-stack Andon intacto; default `noop`).
- Andon sigue siendo solo mantenimiento vencido (ADR-005). Esta alerta **no** aparece en el tablero Andon.

## Auth

- `GET /unidades/:id/health`: `SUPERVISOR` y `ADMIN_DIRECTIVO`.
- `GET/PUT /salud/config` (y versiones): solo `ADMIN_DIRECTIVO`.
- `LOGISTICA` no administra ni consulta este BC en v0 (la ficha de patio no muestra Health).

## Consecuencias

- Configurar pesos y umbrales de alerta no requiere cambiar código; una sola versión activa; el historial de versiones es la auditoría (`created_by`, `created_at`, valores).
- GET health (y el cierre `VisitaCerrada` + PUT config) recalcula con la config activa.
- Inspecciones v0: `NOT_APPLICABLE`; los pesos de dimensiones aplicables se renormalizan.
