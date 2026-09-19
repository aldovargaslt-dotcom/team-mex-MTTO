# Brief — Logística Flota visual v0

Estado: **Accepted** (Aldo FULL LOCK). Rev: flota visual; assign-chofer **parked**.

Seam: [ADR-009 ops estado](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md) / [ADR-011](../adr/011-logistica-flota-ops-estado.md). UX: [logistica-flota-visual-ux-v0](logistica-flota-visual-ux-v0.md).

## Product UI (pre-#62 Unidades look)

Audiencia: `LOGISTICA` (+ espejo `ADMIN_DIRECTIVO`). Home Logística = `/flota`. Nav **Logística → Flota** (no desk `/logistica`).

- KPI strip operable: **En ruta** (required) + Disponibles + Total
- Lista densa placas-first
- Columnas: Placas · Unidad · Chofer · En ruta · Alerta · Ubicación (Foráneo\|Local) · Destino · ›
- Ubicación = Kernel `ambito` (**≠** tipos STOCK\|RUTAS\|CAMIONES)
- Destino = texto libre Kernel
- CTA naranja **Registrar regreso** (uno por vista)
- Alerta cuando `opsEstado=EN_RUTA` (sin regreso): badge ámbar/sky, **no** `#EA7515`
- Choferes catálogo sigue Admin; assign-chofer parked
- Sin Ver ficha navy; no tocar Mantenimiento `/unidades`
- **Tablero only** — Ciclos / Sitios fuera del producto Logística Flota v0

## API (real, no mock)

`GET /logistica/unidades?q&chip=` · `POST /logistica/regresos/:unidadId` (`EN_RUTA` → `DISPONIBLE`)

## Fuera

GPS · assign desk · Ciclos/Sitios · mutar `flota.*` en regreso · dual-stack notify · chips de tipo como ubicación
