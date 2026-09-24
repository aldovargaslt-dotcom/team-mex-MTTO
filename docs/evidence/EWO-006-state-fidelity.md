# EWO-006 evidence

## Tests

- `cd web && npx tsc --noEmit` — pass
- `npx eslint` on touched `web/src` files — pass
- API not run: `api/src` unchanged

## Click-through

Role Logística on `/flota`: column **Viaje**, **Desde la salida**, **Registrar regreso** disabled until a filtered unit is chosen. RAM FORANEO showed patio “sin salida abierta” and salida time. **Sin regreso** listed 63AL5K (Hace 1 d) before FOTON (Hace 9 h). Cancelled without POST.

Supervisor: nav **Mantenimiento vencido**. Inicio listed mantenimiento vencido and stock bajo. Por recibir help states cerrar comprobante does not change existencias (queue empty, button not shown). Ajuste on FIL-ACEITE-01 showed “Hay 10 pza → quedarán 9”.

Visit confirm dialog was not opened: the new borrador still had faltantes, so **Cerrar visita** stayed disabled. That borrador was deleted (`DELETE /visitas/32c20aea-b882-49d1-baa4-a8bbd8a88b1f`).

## AC

- AC-01, AC-02, AC-05: seen in the browser.
- AC-03: persist guard is in `persist()`; not clicked through.
- AC-04: dialog is in the confirm step; not opened because faltantes blocked the button.
