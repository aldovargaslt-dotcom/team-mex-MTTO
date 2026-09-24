# Kernel — routing card

**DDD status:** provisional / unvalidated. Technical evidence: `public` tables + `api/src/kernel`, `unidades`, `choferes`, `auth`. ADR-000 calls this a **thin kernel**, not a large “fleet domain”.

## Purpose

Shared identity for units, vehicle types, drivers, roles, and the integration outbox. Kernel does **not** own stock, Andon avisos, yard movements, or Health Score.

## Owner (code)

`UnidadesService`, `ChoferesService`, tipos, `OutboxModule`, `AuthGuard` / `RolesGuard`.

## Authoritative docs

- [ADR-000](../../docs/adr/000-thin-kernel.md)
- [ADR-001](../../docs/adr/001-visita-cerrada-outbox.md) (outbox)
- [ADR-008](../../docs/adr/008-flota-schema.md) (`LOGISTICA`, `motivoInactivacion`)
- [ADR-009](../../docs/adr/009-icono-tipo-vehiculo.md) (`tipos_vehiculo.icono`)
- [ADR-011](../../docs/adr/011-logistica-flota-ops-estado.md) (`ambito`, `destino`, `ops_estado` columns live on `unidades`)

## Language (subset)

Unidad, placas, número interno, TipoVehiculo, Chofer ACTIVO/INACTIVO, `motivoInactivacion` / envío especial, roles. Foto de unidad: una imagen opcional en la ficha (`foto_data_url`, ADR-014). No es foto de la visita.

## Seams

Outbox producer for `VisitaCerrada`. Logística **writes** some unidad columns (ops) without a `logistica` schema — flag for DDD validation (Kernel vs Logística ownership of `ops_estado`).

## Do not load by default

Inventario catalog, Andon engine, Flota movement rules — unless the change touches those seams.
