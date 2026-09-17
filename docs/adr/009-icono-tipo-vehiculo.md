# ADR-009 — Icono de tipo de vehículo

Estado: aceptado (v0)

Extiende [ADR-000](000-thin-kernel.md): el catálogo `TipoVehiculo` gana un campo de presentación. No cambia ownership ni envelopes.

## Decisión

Admin elige el glifo del listado de Unidades al crear o editar un tipo.

- Columna opcional `tipos_vehiculo.icono` (`varchar`, catálogo cerrado: `truck` | `car` | `van` | `bus`).
- Si va `null`, la UI infiere por el nombre (compat hacia atrás).
- No hay iconos libres, GPS ni fotos de unidad.

Kernel dueño. Inventario / Andon / Flota no leen este campo.

## Consecuencias

`POST` / `PATCH /unidades/tipos` aceptan `icono`. `GET` lo devuelve en el tipo (también anidado en unidades). Valor inválido → 400.
