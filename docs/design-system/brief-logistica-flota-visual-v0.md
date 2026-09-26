# Brief — Logística Flota v0

> Alcance histórico del tablero `/flota`. El dashboard de movimientos en `/logistica` se rige por [SPEC-LOGISTICA-DASHBOARD-001](../specs/logistica-dashboard-v0.md) y [su spec UX](../design/ux-logistica-dashboard-v0.md), bajo EWO-008; no reutilizar este brief como fuente de layout para esa ruta.

**Status: Accepted** · rev 2026-09-19e (default Todos)  
**HOLD merge #64** hasta Visual OK Aldo (screenshots)  
**ADR** | canonical `architecture/ADR-010-flota-sin-regreso-alertas-v0.md` (`salida_at`) · pointer [ADR-012](../adr/012-flota-sin-regreso-alertas.md)

## Locks
1. Revert #62 Mantenimiento only (#65 done)  
2. Flota = KPI + lista operable (Unidades pre-#62)  
3. KPI **En ruta** / Disponibles / Total / **Sin regreso**  
4. **Ubicación class** Foráneo \| Local ≠ tipo STOCK\|RUTAS\|CAMIONES  
5. **Destino** texto libre  
6. **Regreso** API `enRuta → disponible` (limpia `salida_at`)  
7. Tablero only (Ciclos/Sitios OUT)  
8. Assign desk parked  

## Filters
| Control | |
|---|---|
| **Default** | **Todos** (no chip pre-seleccionado) |
| Chips **Local \| Foráneo** | MUST |
| Buscar | placas / unidad |
| KPI cards | clickeables como filtro |

## Sin regreso triage
| | |
|---|---|
| KPI | **clickable** → aplica filtro Sin regreso |
| Fila | pill/badge **Sin regreso** |
| **NO** | chip en filter-bar |

## Alertas Sin regreso (FULL LOCK)
| | |
|---|---|
| Owner rules | **sistema compartido alertas** (no silo) |
| UI config | Logística configura esta familia (tiempo / sin regreso) |
| Clock start | **`registrarSalida`** → `salida_at` |
| Defaults | **Local 8h** / **Foránea 24h** |
| Override | **unidad** gana sobre ubicación |
| Emit | **Tablero badge** + **campanita** (ADR-006) |
| Config v0 | **API mínima** |
| ADR | **ADR-010** canonical |

## UI row
placas · unidad · chofer · En ruta · Sin regreso badge · Ubicación · Destino · ›  
1 CTA naranja **Registrar regreso** · badges ≠ naranja CTA  

## Done / ship gate
1. Expand #64 con locks arriba  
2. ADR-010 Accepted  
3. Screenshots → **Aldo Visual OK** → merge  
