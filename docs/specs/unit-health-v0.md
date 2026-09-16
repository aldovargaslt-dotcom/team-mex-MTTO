# Spec — Salud de unidad v0

Producto y frontera. Complementa [ADR-010](../adr/010-salud-unidad.md). Mapea el spec largo de Health Status al dominio **actual** (visitas + Andon + flota patio).

## Qué es

Indicador **calculado y explicable**: qué tan cerca está la unidad de una intervención preventiva, correctiva o de inspección. No es Activa/Inactiva, ni En ruta, ni asignada.

## Mapeo al dominio

| Dimensión spec | En v0 | Notas |
|----------------|-------|-------|
| Mantenimiento (km + tiempo, MIN) | `andon.umbrales` + `ultima_visita_cerrada` + km patio | Un solo ítem (“mantenimiento preventivo”). Ventana preventiva = 15 % del intervalo (no hay `warning_km` en Andon). |
| Alertas SOURCE | Aviso Andon no resuelto | Sin catálogo INFO…CRITICAL en Andon; un aviso = penalización HIGH (−30). Stock no entra (es por SKU). |
| Inspecciones | No existe el BC | `NOT_APPLICABLE`; no 0 ni 100. Pesos aplicables se renormalizan. |
| Hard cap seguridad crítica | Cableado | Solo si un SOURCE llega `CRITICAL` + categoría SAFETY (fixtures). Andon vencido no es SAFETY. |
| Hard cap mtto severo | `maintenance_score <= 14` | Máximo 50. |
| OOS mecánico / inspección vencida | No existen | No usar `INACTIVA`. |
| Alerta HEALTH_BELOW_THRESHOLD | Schema `salud` + inbox | No `andon.avisos`. Histeresis 60 / 65. Una activa por unidad. |

Odómetro: `currentKm = max(lastClosed.km, último km de movimiento de patio)`. Sin visita cerrada → Health **No disponible**.

## Fórmula

Ver ADR-004 H1–H7. Pesos default 45 / 40 / 15, enteros, suma 100. Display = `round` del score capado. Status sobre el entero. Color solo vía `getHealthSemantic(status)`.

## Recalc

On-demand en GET + handler `VisitaCerrada` + PUT de config (reevalúa la flota con la política nueva). Snapshot solo para cruce / histeresis.

## Fuera de v0

Planes por servicio, `warning_km` en Andon, BC de inspecciones, ML/telemetría/DTCs, pesos por tipo, umbral por unidad, Health en tablero Andon o listado compacto, roles nuevos, WhatsApp, auto-inactivar, editar health a mano.
