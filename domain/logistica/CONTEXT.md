# Logística — routing card

**DDD status:** provisional / unvalidated. **Likely an application service on Kernel**, not a confirmed Bounded Context: there is **no** `logistica` PostgreSQL schema. Evidence: `api/src/logistica` writes kernel `unidades` columns and (parked) `chofer_id`.

## Purpose

- **Ops visual (v0 desk):** `ambito`, `destino`, `ops_estado`, `salida_at`; registrar regreso; nav Logística → `/flota`.
- **Asignación chofer↔unidad:** port + HTTP exist; **parked** (not the desk).

## Authoritative docs

- [ADR-008](../../docs/adr/008-flota-schema.md) (port parked)
- [ADR-011](../../docs/adr/011-logistica-flota-ops-estado.md) — index; canonical Aldo: [architecture/ADR-009-logistica-flota-ops-estado-v0.md](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md)
- [ADR-012](../../docs/adr/012-flota-sin-regreso-alertas.md)
- Brief: [brief-logistica-flota-visual-v0.md](../../docs/design-system/brief-logistica-flota-visual-v0.md)
- Assign parked: [brief-logistica-asignacion-v0.md](../../docs/design-system/brief-logistica-asignacion-v0.md)

## Language (subset)

`EN_RUTA`, `DISPONIBLE`, `FORANEO`, `LOCAL`, destino, registrar regreso. Do not confuse with Flota `SALIDA` abierta.

## Seams

Writes Kernel unidad fields. `FlotaSinRegresoPort` → Notifications. Must not mutate `flota.*` from registrar regreso (ADR-011). Must not write `andon.*`.

## Escalation

Any attempt to derive `ops_estado` from patio movements, or to un-park assignment UI, needs a product/architecture decision — do not silently decide.
