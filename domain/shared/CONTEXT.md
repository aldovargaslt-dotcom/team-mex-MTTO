# Shared — routing card

**DDD status:** provisional. Use only for concepts that several areas already share. Do not dump every term here ([GLOSSARY.md](../../context/GLOSSARY.md) is the term index).

## Shared concepts (evidence)

- `Unidad`, `TipoVehiculo`, `Chofer` identities (opaque UUIDs).
- Roles: `SUPERVISOR`, `ADMIN_DIRECTIVO`, `LOGISTICA`.
- Envelope `VisitaCerrada` (shape owned by Mantenimiento/Kernel outbox; consumed by Inventario, Andon, Salud).
- Ports as the only legal cross-area write/read seam (ADR-002).
- **Alert Catalog** (provisional shared capability, not a confirmed BC): type metadata + permission façade. [ADR-013](../../docs/adr/013-alert-catalog-ownership.md). Threshold values stay in owning modules.

## Shared invariants (evidence)

- No FKs / JOINs across PostgreSQL schemas.
- IDs in foreign modules are opaque strings.
- A module does not write another module’s schema.

## Relationships

See [context-map.md](../../docs/adr/context-map.md) seams: `NotifyPort`, `StockAlertPort`, `AvisoInboxPort`, `AndonAbiertoPort`, `HealthAlertPort`, `FlotaSinRegresoPort`, `UnidadChoferAssignmentPort`.

## Notes

If a concept has a single owner (e.g. `min_qty` → Inventario, aviso Andon → Andon), document it on that card, not here.
