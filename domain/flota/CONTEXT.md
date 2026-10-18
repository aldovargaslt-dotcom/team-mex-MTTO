# Flota — routing card

## Current target vocabulary — 2026-10-15

Physical custody remains distinct from journey, downtime and readiness. An opened
maintenance order means withdrawal from operation, not arrival at a workshop.
Physical departure is linked to Logistics authorization while preserving its own
signatures and current safety requirements. Definitions and artifact routing:
[ADR025](../../docs/adr/025-abc-utilization-downtime.md).

**DDD status:** provisional / unvalidated. ADR-008 **names** Flota a bounded context; still re-validate when a change crosses Kernel ops or Logística UI. Technical evidence: schema `flota`, `api/src/flota`.

## Purpose

Yard log: who took which unit, to which **sitio**, with chofer + aval signatures. **Not** TMS (no GPS/routes).

Two independent loops (spec):

- Maintenance availability: kernel `ACTIVA` / `INACTIVA` (+ envío especial motivo).
- Custody: `SALIDA` / `ENTRADA`.

## Authoritative docs

Referencia de producto relacionada: [GrillMe Unidades 2026-10-17](../mantenimiento/unidades-readiness-grillme-2026-10-17.md)
(Daily/Stock, vigencia durante viaje y trazabilidad futura de chofer). Las
diferencias con ADR025 se conservan pendientes; no cambia reglas de Flota.

- [docs/specs/fleet-manager-v0.md](../../docs/specs/fleet-manager-v0.md)
- [docs/specs/fleet-tablero-viaje-v0.md](../../docs/specs/fleet-tablero-viaje-v0.md) (status **propuesto**)
- [ADR-008](../../docs/adr/008-flota-schema.md)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) F1–F11
- Visual: [brief-logistica-flota-visual-v0.md](../../docs/design-system/brief-logistica-flota-visual-v0.md)

## Language (subset)

Sitio, `SALIDA`, `ENTRADA`, firma CHOFER/AVAL, `unidad_operativa`, chofer último de patio.

## Seams

Opaque IDs to kernel unidades/choferes. `AndonAbiertoPort` read-only. **Must not** write `andon.*`. Patio “en ruta” is **not** the same field as kernel `ops_estado` (ADR-011).

## UI

`web/src/app/flota`. Do not change Mantenimiento `/unidades` in a Flota visual cut.


## Approved CHECK movement seam — target

[ADR017](../../docs/adr/017-check-movement-seam.md) preserves patio SALIDA/ENTRADA and CHOFER+AVAL. New departures validate valid signed operable CHECK and insurance via server ports coordinated with writers; invalid insurance must not prevent return. Opaque CHECK snapshot reference, no cross-schema FK/JOIN. No implicit sync of Logistics journey. EN_TALLER needs explicit authorized physical transition/source (R04 adoptada), never Corrective existence. Current code unchanged; [contract](../../docs/contracts/CHK-001-contract.md) for future implementation. /flota movement surface, /logistica dashboard/Tower.


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.
