# Brief — Logística chofer↔unidad asignación v0

Estado: **Parked** (Aldo lock). Desk de asignación no es el producto v0. Ver [brief-logistica-flota-visual-v0](brief-logistica-flota-visual-v0.md).

Seam: [ADR-008](../adr/008-flota-schema.md) — módulo Nest delgado `logistica`. Estado = Kernel `unidad.choferId`. No schema de mantenimiento. No duplicar maestros Chofer/Unidad. TDD: [ADR-004](../adr/ADR-004-tdd-test-bar-andon-v0.md) L1–L4. UX: [logistica-asignacion-ux-v0](logistica-asignacion-ux-v0.md).

## Product UI (Mode B Despacho)

Audiencia: `LOGISTICA` (+ espejo `ADMIN_DIRECTIVO`). Supervisor fuera.

- Toolbar Mode B (`ListChrome`): `Logística` + count + chips Disponibles | En ruta | Todos + **un** CTA naranja `Asignar a unidad`
- KPI strip: En ruta / Disponibles / Total (**ACTIVO** only)
- Búsqueda por nombre de chofer
- Chips en `ListChrome.filters` (**no** tipos de unidad STOCK|RUTAS; active = quiet fill + navy underline)
- Lista: fila + › → sheet asignar/quitar (**no** navy Ver ficha)
- Fila: nombre · badge ops · placas/unidad si asignado
- Soft-block: no pasar a INACTIVO un chofer asignado
- Cambiar rol quiet + `focus-visible`
- Color lock: 1 naranja; secundarios outline; En ruta = sky/navy quiet (`info`), no `#EA7515`; Disponible muted

## Reglas

1. Un chofer ↔ ≤1 unidad; unidad ≤1 chofer
2. Solo ACTIVO asignable; INACTIVO oculto en la lista v0
3. Soft-block al desactivar si está asignado
4. Sync in-process Kernel; sin eventos v0

## HTTP

`GET /logistica/choferes?q&chip=` · `POST /logistica/asignaciones` `{ unidadId, choferId }` · `DELETE /logistica/asignaciones/:unidadId`

## Fuera

Geo/rutas · multi-asignación · nav Supervisor · tip banner · Ver ficha navy · chips STOCK|RUTAS · alta chofer aquí · mutar `mantenimiento` / `flota.*`
