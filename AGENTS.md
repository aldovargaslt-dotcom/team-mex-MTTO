# AGENTS

Índice para agentes. **No** copia ADRs ni briefs: ábrelos antes de tocar código.

## Antes de cambiar X, lee Y

| Si tocas | Lee primero |
|----------|-------------|
| Kernel, unidades, choferes, tipos, outbox | [ADR-000](docs/adr/000-thin-kernel.md), [ADR-001](docs/adr/001-visita-cerrada-outbox.md), [ADR-002](docs/adr/002-schema-per-module.md), [ADR-008](docs/adr/008-flota-schema.md) (`LOGISTICA`, `motivoInactivacion`) |
| Flota / bitácora patio | [spec](docs/specs/fleet-manager-v0.md), [tablero viaje](docs/specs/fleet-tablero-viaje-v0.md), ADR-008, ADR-004 (F1–F11) |
| Logística asignación chofer↔unidad | [brief](docs/design-system/brief-logistica-asignacion-v0.md), ADR-008 (puerto), ADR-004 (L1–L4). Estado = Kernel `unidad.choferId`; no schema `logistica`; no mutar `flota.*`. |
| Visitas / cierre / `VisitaCerrada` | ADR-001, ADR-002, [ADR-004](docs/adr/ADR-004-tdd-test-bar-andon-v0.md) (C/O) |
| Andon | ADR-004, [ADR-005](docs/adr/005-andon-no-stock-alerts.md), [ops checklist](architecture/andon-whatsapp-ops-checklist-v0.md) |
| Inventario | ADR-002, [ADR-007](docs/adr/007-inventario-stock-bajo.md), ADR-004 (I/S) |
| Notifications / campanita | [ADR-006](docs/adr/006-notifications-schema.md), ADR-004 (N) |
| UI (`web/src`) | [ADR-003](docs/adr/003-shadcn-tailwind.md) + briefs [docs/design-system/](docs/design-system/) + sistema [docs/design/README.md](docs/design/README.md) |
| UX operacional (copy, existencias, filtros, hub piezas) | [ux-operacional-cortes-v0](docs/design-system/ux-operacional-cortes-v0.md) — recorte SPEC-UX-001; **no toca Flota**. Flota: [tablero viaje](docs/specs/fleet-tablero-viaje-v0.md) |
| Consulta / conducta (cadencia, ranking, consumo, Andon reincidencia, patio) | [ux-consulta-conducta-cortes-v0](docs/design-system/ux-consulta-conducta-cortes-v0.md) — **no** fusionar con A–E ni con el tablero viaje |
| Salud de unidad | [ADR-010](docs/adr/010-salud-unidad.md), [spec](docs/specs/unit-health-v0.md), ADR-004 (H1–H15). No escribir `andon.*`. Dual-stack notify intacto. |
| Notify / WhatsApp | Dual-stack abajo. Default **noop**. No “arreglar”. |

Mapa de directorios: [docs/adr/context-map.md](docs/adr/context-map.md). Índice ADR: [docs/adr/README.md](docs/adr/README.md).

## Dual-stack Andon notify (conflicto conocido; no unificar)

Hay **dos** fábricas. Documentar ambas; el default sigue `ANDON_NOTIFY_PROVIDER=noop`.

1. `api/src/andon/andon-notifier.factory.ts` — Twilio aparcado; `evolution` → stub (“otro agente”).
2. `api/src/andon/notify/` — Evolution HTTP sí cableado (`createAndonNotify`). El runtime usa `notify.providers.ts` → esa fábrica.

El [checklist de ops](architecture/andon-whatsapp-ops-checklist-v0.md) todavía dice que Evolution no está implementado. Lab only / riesgo ToS; ver [docs/andon-evolution-notify.md](docs/andon-evolution-notify.md). **No** fusionar ni “arreglar” en un corte de infra o visual.

## WO UI ≠ brief de ingeniería

“WO” en este repo es el **wizard de visita** (Supervisor). El artefacto de ingeniería es el **brief** / **corte** del PR ([`.github/pull_request_template.md`](.github/pull_request_template.md)) y, si cambia layout o jerarquía, la spec UX ([plantilla](docs/design/UX_SPEC_TEMPLATE.md)). No hay carpeta `work-orders/`.

## Fuera de v0

README: multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa, reserva de stock en borrador. Flota: sin GPS/rutas. No ampliar ownership de Inventario ni Andon sin ADR.

## Verificación

- API: skill [`verify-api`](.cursor/skills/verify-api/SKILL.md) o [`script/verify.sh`](script/verify.sh) (`cd api` / `cd web`; no hay `package.json` raíz).
- UI: skill [`ui-implementer`](.cursor/skills/ui-implementer/SKILL.md) → skill [`proof-ui`](.cursor/skills/proof-ui/SKILL.md) (click-through + screenshots; **sin** Playwright) → subagente `ux-auditor` (Visual QA; **otro pase**).
- CI: [`.github/workflows/verify.yml`](.github/workflows/verify.yml) — Jest unit+e2e y web lint+build. No correr `api` `lint --fix`.
- Humanos: Postgres con `docker compose` (README). Cloud Agents: [`.cursor/environment.json`](.cursor/environment.json) (Postgres nativo). No inventar un tercer camino.

## Subagentes (solo lectura de docs)

- `ux-auditor` — Visual QA: Must/Don’t de design-system + [VISUAL_QA.md](docs/design/VISUAL_QA.md) + heurísticas `proof-ui`. No implementa.
- `sd-scope` — fuera de v0 + ownership ADR + aviso dual-stack
