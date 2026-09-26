# AGENTS

Índice **de este repositorio**. La metodología global (SDD, DDD, TDD, ADR, ICM, Engineering Work Orders, verificación) no se copia aquí.

**Producto:** Team Mex MTTO — visitas de mantenimiento, inventario (piezas), Andon, campanita, bitácora de patio, ops Logística, salud de unidad.

Antes de cargar árbol: [ICM.md](ICM.md) (**minimum sufficient authoritative context**, no “load the repo”). Vocabulario: [context/GLOSSARY.md](context/GLOSSARY.md).

## Fuentes de verdad

| Tema | Dónde |
|------|--------|
| Producto (qué / quién / alcance / no-goals) | [context/PRODUCT.md](context/PRODUCT.md) — run/deploy/seed: [README.md](README.md) |
| Arquitectura as-is | [context/ARCHITECTURE.md](context/ARCHITECTURE.md) |
| ADRs (único SoT de decisiones) | [docs/adr/](docs/adr/) — índice [docs/adr/README.md](docs/adr/README.md) |
| Mapa técnico de módulos | [docs/adr/context-map.md](docs/adr/context-map.md) |
| Áreas de dominio (provisionales) | [domain/README.md](domain/README.md) |
| Specs funcionales | [docs/specs/](docs/specs/) |
| UI / spec UX / Visual QA | [docs/design/](docs/design/) + briefs [docs/design-system/](docs/design-system/) |
| Engineering Work Orders | [docs/engineering-work-orders/](docs/engineering-work-orders/) (`EWO-xxx`) |
| Evidencia de cierre | [docs/evidence/](docs/evidence/) · UI PNG: [docs/screenshots/](docs/screenshots/) |
| Enrutado de contexto | [ICM.md](ICM.md) |

No hay `docs/decisions/` ni carpeta `work-orders/`.

## WO vs Engineering Work Order

- **WO** = wizard de visita (Supervisor), orden de trabajo de mantenimiento. No redefinir.
- **Engineering Work Order** = artefacto de ejecución no trivial. ID `EWO-001`, `EWO-002`, …. Ruta `docs/engineering-work-orders/`. **No** usar el acrónimo WO.
- Cortes / briefs (issue + [PR template](.github/pull_request_template.md) + `docs/design-system/`) son **históricos**. No migrarlos a EWO salvo pedido explícito.

Implementación no trivial: EWO **aprobado**. No ampliar alcance del EWO en silencio. Spec UX si cambia layout/jerarquía/acciones ([plantilla](docs/design/UX_SPEC_TEMPLATE.md)).

## ICM y escalación

1. Leer [ICM.md](ICM.md) y cargar solo el contexto de la etapa + el área afectada.
2. No decidir en silencio producto, dominio (incluido “esto ya es un Bounded Context”), ni arquitectura.
3. Escalar si hay conflicto SPEC/ADR, fuera de v0, ownership, o pedido de unificar notify.

## Antes de cambiar X, lee Y

| Si tocas | Lee primero |
|----------|-------------|
| Kernel, unidades, choferes, tipos, outbox | [ADR-000](docs/adr/000-thin-kernel.md), [ADR-001](docs/adr/001-visita-cerrada-outbox.md), [ADR-002](docs/adr/002-schema-per-module.md), [ADR-008](docs/adr/008-flota-schema.md) (`LOGISTICA`, `motivoInactivacion`) |
| Flota / bitácora patio | [spec](docs/specs/fleet-manager-v0.md), [tablero viaje](docs/specs/fleet-tablero-viaje-v0.md), ADR-008, ADR-004 (F1–F11) |
| Logística Flota visual | [brief](docs/design-system/brief-logistica-flota-visual-v0.md) rev 19e, [ADR-009 architecture](architecture/ADR-009-logistica-flota-ops-estado-v0.md), [ADR-010 sin regreso](architecture/ADR-010-flota-sin-regreso-alertas-v0.md), [ADR-011](docs/adr/011-logistica-flota-ops-estado.md), [ADR-012](docs/adr/012-flota-sin-regreso-alertas.md). Nav → `/flota` Tablero only. Assign-chofer **parked**. No tocar Mantenimiento `/unidades`. No `andon.*`. |
| Logística asignación chofer↔unidad | PARKED. [brief](docs/design-system/brief-logistica-asignacion-v0.md), ADR-008 (puerto). No es el desk v0. |
| Visitas / cierre / `VisitaCerrada` | ADR-001, ADR-002, [ADR-004](docs/adr/ADR-004-tdd-test-bar-andon-v0.md) (C/O) |
| Andon | ADR-004, [ADR-005](docs/adr/005-andon-no-stock-alerts.md), [ops checklist](architecture/andon-whatsapp-ops-checklist-v0.md) |
| Inventario | ADR-002, [ADR-007](docs/adr/007-inventario-stock-bajo.md), ADR-004 (I/S) |
| Notifications / campanita | [ADR-006](docs/adr/006-notifications-schema.md), ADR-004 (N) |
| UI (`web/src`) | [ADR-003](docs/adr/003-shadcn-tailwind.md) + briefs [docs/design-system/](docs/design-system/) + sistema [docs/design/README.md](docs/design/README.md) |
| UX operacional (copy, existencias, filtros, hub piezas) | [ux-operacional-cortes-v0](docs/design-system/ux-operacional-cortes-v0.md) — recorte SPEC-UX-001; **no toca Flota**. Flota: [tablero viaje](docs/specs/fleet-tablero-viaje-v0.md) |
| Consulta / conducta (cadencia, ranking, consumo, Andon reincidencia, patio) | [ux-consulta-conducta-cortes-v0](docs/design-system/ux-consulta-conducta-cortes-v0.md) — **no** fusionar con A–E ni con el tablero viaje |
| Salud de unidad | [ADR-010](docs/adr/010-salud-unidad.md), [spec](docs/specs/unit-health-v0.md), ADR-004 (H1–H15). No escribir `andon.*`. Dual-stack notify intacto. |
| Catálogo Alertas | [SPEC](docs/specs/alert-catalog-v0.md), [ADR-013](docs/adr/013-alert-catalog-ownership.md), [UX](docs/design/ux-alert-catalog-v0.md), ADR-004 K. No mergear schemas. Dual-stack notify intacto. |
| Notify / WhatsApp | Dual-stack abajo. Default **noop**. No “arreglar”. |

## Dual-stack Andon notify (conflicto conocido; no unificar)

Hay **dos** fábricas. Documentar ambas; el default sigue `ANDON_NOTIFY_PROVIDER=noop`.

1. `api/src/andon/andon-notifier.factory.ts` — Twilio aparcado; `evolution` → stub (“otro agente”).
2. `api/src/andon/notify/` — Evolution HTTP sí cableado (`createAndonNotify`). El runtime usa `notify.providers.ts` → esa fábrica.

El [checklist de ops](architecture/andon-whatsapp-ops-checklist-v0.md) todavía dice que Evolution no está implementado. Lab only / riesgo ToS; ver [docs/andon-evolution-notify.md](docs/andon-evolution-notify.md). **No** fusionar ni “arreglar” en un corte de infra o visual.

## Fuera de v0

README / [PRODUCT.md](context/PRODUCT.md): multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa, reserva de stock en borrador. Flota: sin GPS/rutas. No ampliar ownership de Inventario ni Andon sin ADR.

## Verificación

- API: skill [`verify-api`](.cursor/skills/verify-api/SKILL.md) o [`script/verify.sh`](script/verify.sh) (`cd api` / `cd web`; no hay `package.json` raíz).
- UI: skill [`ui-implementer`](.cursor/skills/ui-implementer/SKILL.md) → skill [`proof-ui`](.cursor/skills/proof-ui/SKILL.md) (click-through + screenshots; **sin** Playwright) → subagente `ux-auditor` (Visual QA; **otro pase**).
- CI: [`.github/workflows/verify.yml`](.github/workflows/verify.yml) — Jest unit+e2e y web lint+build. No correr `api` `lint --fix`.
- Humanos: Postgres con `docker compose` (README). Cloud Agents: [`.cursor/environment.json`](.cursor/environment.json) (Postgres nativo). No inventar un tercer camino.

## Subagentes (solo lectura de docs)

- `ux-auditor` — Visual QA: Must/Don’t de design-system + [VISUAL_QA.md](docs/design/VISUAL_QA.md) + heurísticas `proof-ui`. No implementa.
- `sd-scope` — fuera de v0 + ownership ADR + aviso dual-stack

## Ejecución y evidencia

Flujo local y significado de PRD / SPEC / AC / EWO / ADR / evidencia: [WORKFLOW](docs/WORKFLOW.md). Pruebas: [TESTING_STRATEGY](docs/testing/TESTING_STRATEGY.md).

- Usar ICM por etapa; buscar primero con `rg` en el módulo afectado. Leer solo referencias relevantes y conservar lenguaje y arquitectura existentes.
- Implementación no trivial: SPEC con criterios verificables y EWO aprobado. No refactors ajenos ni reglas de negocio inventadas.
- Registrar supuestos, riesgos y comandos con `PASS / FAIL / SKIPPED` en evidencia. E2E omitido nunca equivale a verificación completa.
- Cerrar sesión con estado, archivos, evidencia y siguiente paso en el EWO; actualizar contexto solo por cambios duraderos.

Skills externas opcionales de UI/UX: [selección, alcance y precedencia](docs/design/EXTERNAL_SKILLS.md). No sustituyen ADRs ni Visual QA.
