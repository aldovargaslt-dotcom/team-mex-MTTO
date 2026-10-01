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


## Approved shared target capabilities (not implemented)

MECANICO/TrustedActor via [ADR018](../../docs/adr/018-mecanico-auth-signature-identity.md); minimal decoupled POLIZA_SEGURO/VehicleInsurancePolicyPort via [ADR019](../../docs/adr/019-vehicle-insurance-policy.md), proposed vehicle_documents schema, no new BC classification/full Master Data. SignedCheckReadPort / coordinated DeparturePolicyPort from [ADR017](../../docs/adr/017-check-movement-seam.md), Unit IDs remain opaque. [Contract](../../docs/contracts/CHK-001-contract.md) defines target owners; no writer crosses ownership.


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.
