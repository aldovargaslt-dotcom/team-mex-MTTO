# UX note — state fidelity v0

Amends the Flota visual desk, the visit confirm step, `/inicio`, por recibir, and ajuste. Does not replace [logistica-flota-visual-ux-v0](logistica-flota-visual-ux-v0.md).

## Flota desk

- Primary action stays **Registrar regreso**.
- The sheet lists only the `EN_RUTA` rows that pass the current filters. Nothing is selected until the operator chooses, except a click on an `EN_RUTA` row, which selects that row.
- Description: the action moves the viaje to Disponible and does not write patio entrada.
- The sheet shows salida time and one patio line from `GET /flota/tablero`: salida abierta, sin salida abierta, or no consultado.
- Column header **Viaje**. Column **Desde la salida** uses the viaje `salidaAt`. **Sin regreso** lists the oldest salida first.
- Alert help: the clock starts when the viaje is En ruta. It does not start at patio **Registrar salida**.

## Visit confirm

Dialog **Cerrar visita** lists each `DESDE_STOCK` line with remaining qty, each compra externa as no stock movement, and that open maintenance avisos for the unit resolve. Cancel returns to the step.

## Inicio

Empty copy names mantenimiento vencido, existencias, and por recibir. A failed source is its own row. It is not a zero.

## Por recibir and ajuste

**Cerrar comprobante** does not change existencias. That sentence is the page lede, visible without the hint. Ajuste shows `Hay N → quedarán M`, uses the orange submit, and does not submit a negative result. Piezas uses **Cantidad** and a real plural («1 línea supera» / «N líneas superan»).

## Nav

`/andon` label is **Mantenimiento vencido**. Campanita stays **Alertas**.
