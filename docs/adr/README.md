# ADRs

Fuente de arquitectura de Team Mex. Estado: **aceptado (v0)** salvo que un ADR posterior lo sustituya.

El archivo 004 se llama `ADR-004-…` (histórico). No renombrar en un overlay de proceso.

| # | Archivo | Tema |
|---|---------|------|
| 000 | [000-thin-kernel.md](000-thin-kernel.md) | Kernel delgado; dueños de módulo |
| 001 | [001-visita-cerrada-outbox.md](001-visita-cerrada-outbox.md) | Envelope congelado `VisitaCerrada` |
| 002 | [002-schema-per-module.md](002-schema-per-module.md) | Schema por módulo; sin FKs ni JOINs cruzadas |
| 003 | [003-shadcn-tailwind.md](003-shadcn-tailwind.md) | UI: shadcn + Tailwind + north star |
| 004 | [ADR-004-tdd-test-bar-andon-v0.md](ADR-004-tdd-test-bar-andon-v0.md) | Barra TDD: IDs C / O / I / A / N / S |
| 005 | [005-andon-no-stock-alerts.md](005-andon-no-stock-alerts.md) | Andon ≠ alertas de stock |
| 006 | [006-notifications-schema.md](006-notifications-schema.md) | Schema `notifications` (inbox) |
| 007 | [007-inventario-stock-bajo.md](007-inventario-stock-bajo.md) | `min_qty` / `StockBajo` |
| 008 | [008-flota-schema.md](008-flota-schema.md) | Schema `flota`, rol `LOGISTICA`, envío especial |
| 009 | [009-icono-tipo-vehiculo.md](009-icono-tipo-vehiculo.md) | `tipos_vehiculo.icono` (glifo del catálogo) |
| 010 | [010-salud-unidad.md](010-salud-unidad.md) | Schema `salud`, Health Score, alerta derivada |

Mapa de bounded contexts → directorios: [context-map.md](context-map.md). Briefs visuales de corte: [docs/design-system/](../design-system/). Sistema de ingeniería UI (spec UX, Visual QA): [docs/design/](../design/).

## Cuándo escribir un ADR

Nuevo ADR (o el existente pasa a *superseded*) cuando cambie:

- un **schema** PostgreSQL o la frontera de un módulo
- un **envelope** de evento (`VisitaCerrada`, `StockBajo`, …)
- el **ownership** de un bounded context (quién escribe qué tablas / puertos)

No hace falta ADR para copy, tokens CSS, CI, o plantillas de PR. Cortes **visual only**: brief en `docs/design-system/*` (Must/Don’t) + spec UX en [docs/design/](../design/) si cambia jerarquía; “ninguno — visual only” en el PR.

No reescribir en silencio un ADR aceptado. Ver regla en `.cursor/rules/docs-adr.mdc`.
