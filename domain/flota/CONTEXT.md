# Flota — routing card

**DDD status:** provisional / unvalidated. ADR-008 **names** Flota a bounded context; still re-validate when a change crosses Kernel ops or Logística UI. Technical evidence: schema `flota`, `api/src/flota`.

## Purpose

Yard log: who took which unit, to which **sitio**, with chofer + aval signatures. **Not** TMS (no GPS/routes).

Two independent loops (spec):

- Maintenance availability: kernel `ACTIVA` / `INACTIVA` (+ envío especial motivo).
- Custody: `SALIDA` / `ENTRADA`.

## Authoritative docs

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
