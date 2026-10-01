# ADRs

Fuente de arquitectura de Team Mex (**único SoT de decisiones**; no hay `docs/decisions/`). Estado: **aceptado (v0)** salvo que un ADR posterior lo sustituya.

Baseline as-is para agentes: [context/ARCHITECTURE.md](../../context/ARCHITECTURE.md). Enrutado: [ICM.md](../../ICM.md). Plantilla para un ADR **nuevo**: [ADR-TEMPLATE.md](ADR-TEMPLATE.md).

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
| 008 | [008-flota-schema.md](008-flota-schema.md) | Schema `flota`, rol `LOGISTICA`, envío especial, puerto asignación chofer↔unidad (parked UI) |
| 009 | [009-icono-tipo-vehiculo.md](009-icono-tipo-vehiculo.md) | `tipos_vehiculo.icono` (glifo del catálogo) |
| 010 | [010-salud-unidad.md](010-salud-unidad.md) | Schema `salud`, Health Score, alerta derivada |
| 011 | [011-logistica-flota-ops-estado.md](011-logistica-flota-ops-estado.md) | Kernel `ambito` / `destino` / `opsEstado`; registrar regreso. Canónico Aldo: [architecture/ADR-009](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md) |
| 012 | [012-flota-sin-regreso-alertas.md](012-flota-sin-regreso-alertas.md) | `salida_at`, schema `alertas`, emit `FLOTA_SIN_REGRESO`. Canónico Aldo: [architecture/ADR-010](../../architecture/ADR-010-flota-sin-regreso-alertas-v0.md). No sustituye [010-salud](010-salud-unidad.md). |
| 013 | [013-alert-catalog-ownership.md](013-alert-catalog-ownership.md) | Catálogo de Alertas: façade de umbrales + overlay `alert_catalog.tipo`. No mergea `andon` / `alertas` / `notifications`. |
| 014 | [014-foto-unidad.md](014-foto-unidad.md) | Una foto opcional en `unidades`. No entra en `VisitaCerrada`. |
| 015 | [015-borrador-unico-creacion-atomica-visita.md](015-borrador-unico-creacion-atomica-visita.md) | Un borrador por unidad + creación atómica de visita. |

| 016 | [016-visita-check-evolution.md](016-visita-check-evolution.md) | Visita/CHECK1:1; supersession parcial ADR-015; CHECK_COMPLETED separado de mantenimiento. |
| 017 | [017-check-movement-seam.md](017-check-movement-seam.md) | CHECK válido y puertos de salida, loops independientes, Torre y navegación. |
| 018 | [018-mecanico-auth-signature-identity.md](018-mecanico-auth-signature-identity.md) | MECANICO y identidad production confiable; stub sólo no-production. |
| 019 | [019-vehicle-insurance-policy.md](019-vehicle-insurance-policy.md) | Documentos mínimos POLIZA_SEGURO y policy de salida. |
| 020 | [020-check-storage-migrations-scheduler.md](020-check-storage-migrations-scheduler.md) | S3 privado, migrations TypeORM y daily command/scheduler. |

ADR-016–020 registran decisiones de owner aprobadas el 2026-10-01; contratos técnicos detallados del [paquete Slice 0](../engineering-work-orders/CHK-001-slice-0-review.md) fueron aprobados por owner junto a R01–R05; addenda explícitos preservan cuerpos anteriores. No son evidencia de implementación. ADR-015 permanece como histórico con supersession parcial enlazada.

Mapa de bounded contexts → directorios: [context-map.md](context-map.md). Briefs visuales de corte: [docs/design-system/](../design-system/). Sistema de ingeniería UI (spec UX, Visual QA): [docs/design/](../design/).

## Cuándo escribir un ADR

Nuevo ADR (o el existente pasa a *superseded*) cuando cambie:

- un **schema** PostgreSQL o la frontera de un módulo
- un **envelope** de evento (`VisitaCerrada`, `StockBajo`, …)
- el **ownership** de un bounded context (quién escribe qué tablas / puertos)

No hace falta ADR para copy, tokens CSS, CI, o plantillas de PR. Cortes **visual only**: brief en `docs/design-system/*` (Must/Don’t) + spec UX en [docs/design/](../design/) si cambia jerarquía; “ninguno — visual only” en el PR.

No reescribir en silencio un ADR aceptado. Ver regla en `.cursor/rules/docs-adr.mdc`.
