# ADR026 — Compatibilidad de catálogo por tipo y unidad

Accepted 2026-10-13 under EWO-039 and the user's explicit combined-selection answer.

Inventory owns applicability of a refacción, while Kernel owns unit identity/type. Previously compatibility was type-only and item↔placa was excluded. This bounded request adds **catalog compatibility** by specific unit; it does not assign physical stock to a plate or reserve it.

Use the union of selected types and selected unit IDs. Preserve existing relational type compatibility; store a default-empty uuid array of opaque unit IDs on the Inventory item. Validate references through UnidadesService and TiposVehiculoService. No cross-schema JOIN/FK and no copied unit identity/type. Unit-aware reads derive the current type from Kernel, so a type change updates type-based matching but an explicit unit selection stays associated with that unit.

Alternative: copy each selected unit's type into existing type compatibility. Rejected because it would expose a specific-unit part to every other unit of that type. A second join table adds machinery without additional semantics for this small catalog property. Arrays are normalized/deduplicated; existing items retain empty unit selections via an additive explicit migration.
