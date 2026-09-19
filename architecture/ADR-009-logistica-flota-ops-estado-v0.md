# ADR-009 — Logística Flota ops estado (Kernel)

Estado: aceptado (v0). Índice repo: [docs/adr/011-logistica-flota-ops-estado.md](../docs/adr/011-logistica-flota-ops-estado.md). No sustituye [docs/adr/009-icono-tipo-vehiculo.md](../docs/adr/009-icono-tipo-vehiculo.md).

Extiende [ADR-000](../docs/adr/000-thin-kernel.md) y [ADR-008](../docs/adr/008-flota-schema.md). Brief: [brief-logistica-flota-visual-v0](../docs/design-system/brief-logistica-flota-visual-v0.md).

## Decisión

El tablero Logística/Flota v0 pinta **estado operativo real** en Kernel `public.unidades`, no un mock y no el catálogo de tipos STOCK|RUTAS|CAMIONES.

Columnas Kernel (dueño: `UnidadesService` / módulo delgado `logistica` para mutar ops):

| Columna | Valores | Uso UI |
|---------|---------|--------|
| `ambito` | `FORANEO` \| `LOCAL` | Ubicación Foráneo \| Local |
| `destino` | texto libre, nullable | Destino actual |
| `ops_estado` | `EN_RUTA` \| `DISPONIBLE` | En ruta / Disponible |

`opsEstado` **no** se deriva de `flota` SALIDA/ENTRADA en este corte. Patio bitácora (ADR-008) sigue aparte.

Asignación chofer↔unidad (`unidad.choferId`, `UnidadChoferAssignmentPort`) queda **PARKED**: API puede existir; no es el desk de este PR; no hay nav a `/logistica`.

## HTTP (mínimo)

`LOGISTICA` | `ADMIN_DIRECTIVO`; Supervisor 403.

- `GET /logistica/unidades?q&chip=` — lista unidades (placas-first). `chip=EN_RUTA|DISPONIBLE|TODAS`. `q` = placas o número interno. KPI En ruta / Disponibles / Total.
- `POST /logistica/regresos/:unidadId` — `opsEstado` `EN_RUTA` → `DISPONIBLE` (204). Falla si no está en ruta.

Alerta de lista: `opsEstado === EN_RUTA` → sin regreso reportado (badge ámbar/sky, **no** `#EA7515`).

## Consecuencias

- Mantenimiento `/unidades` (Supervisor) **no** cambia en este PR.
- No schema `logistica`. No mutar `flota.*` desde registrar regreso.
- Dual-stack Andon notify intacto.

## Fuera

GPS/rutas, assign-chofer desk, Ver ficha navy, chips STOCK|RUTAS como ubicación, geo.
