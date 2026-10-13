# UX — Refacciones y costos de OT

Estado: Proposed; contrato funcional en [SPEC-INV-OT-001](../specs/work-order-inventory-costs-v1.md). Documento de diseño, sin UI implementada.

## Screen purpose / primary user

Supervisor registra uso o compra sin recapturar OT/unidad y cierra la orden. Administrador corrige materiales de cerradas con historia visible. Español, desktop y móvil.

## Questions the screen must answer

Qué piezas y OT estoy viendo; cuánto se usó y costó; qué cantidad sigue sin destino; qué está confirmado; qué comprobante/movimiento explica el costo.

## Primary and secondary actions

Mantener primary del wizard **Continuar / Cerrar orden**. En captura, primary contextual **Confirmar uso** o **Guardar compra**. No dos CTA principales simultáneas en el mismo formulario.

Secundarias: **Usar del almacén**, **Registrar compra**, **Devolver a proveedor**, **Cancelar**. Cerradas: **Corregir materiales** sólo administrador; abre confirmación con motivo y antes/después. No botón Aprobar.

## Information hierarchy / pattern / clone

P0: cantidad sin destino, error de stock/costo o conflicto. P1: ítem, origen, cantidad utilizada y costo de línea. P2: compra, sobrante, conversión y comprobante. P3: historia de correcciones y proveedor.

Clone: Piezas de `/unidades/:id/visitas/:visitaId`, patrón 6 del [catálogo de patrones](PAGE_PATTERNS.md); cerrada conserva documento, no otro wizard. Existencias/Consumo/Movimientos conservan patrón 3 y tabla densa. Captura corta usa patrón 7, sin dashboard ni nueva navegación global.

## Forms

- Almacén: búsqueda SKU + **Cantidad utilizada**. Disponible, unidad y costo derivados, precio no editable.
- Compra: ítem, **Cantidad comprada**, **Total pagado**, **Comprobante**, **Cantidad utilizada**. Resto calculado: **Restante al almacén**. Confirmación explícita **Recibido en almacén**; no aumentar stock por asumirlo.
- Compra multítem: añadir líneas en mismo formulario, un comprobante compartido, importe por línea.
- Cantidades divisibles admiten decimales y muestran unidad, por ejemplo **4.5 L** usados y **0.5 L** al almacén. Piezas indivisibles sólo enteros. Input decimal accesible en móvil; interpretar coma o punto según entrada local y normalizar sin redondeo oculto. Validación server-side con precisión por unidad.
- Conversión conocida: **1 caja = 10 piezas**. Desconocida exige completar antes de guardar.
- Resumen: **Costo de materiales**; compras y pérdidas separadas. Costo desconocido: **Costo pendiente**, total marcado incompleto.
- Alta de refacción reutiliza diálogo existente; crea identidad sin stock y retorna a la compra.

Decisiones confirmadas: **Total pagado (MXN, impuestos incluidos)**; comprobante opcional con **Agregar comprobante después**. Inicio muestra una condición de Seguimiento **Comprobante pendiente** por compra, acción **Adjuntar comprobante**, sin duplicación por ítem. Adjuntar después del cierre conserva stock/costos; leer o cerrar OT no elimina condición. Costo pendiente no impide consumir/cerrar, total permanece incompleto hasta completado administrativo auditado. Añadir estas situaciones a proof en los tres viewports.

## States

- Loading: **Cargando refacciones…**; impedir confirmar con saldo/costo sin cargar.
- Empty: **Esta orden todavía no tiene refacciones registradas.**
- Error: **No se pudo guardar. Tus datos siguen aquí; vuelve a intentarlo.**
- Success: **Uso registrado.** / **Compra registrada.** Mostrar cantidades/costos persistidos.
- Warning: **Faltan 3 piezas por asignar a un destino.** / **Hay piezas sin costo registrado.**
- Critical: **Existencias insuficientes: disponibles 1, solicitadas 2.**
- Conflict: **Esta orden cambió. Revisa los datos actualizados antes de guardar.**
- Saving: **Guardando…**, botón disabled; servidor igualmente protege retries.
- Disabled close: explicación inline de destino pendiente, no tooltip como única información.

## Interaction / mobile / proof

No exigir proveedor/precio/recibo al consumir almacén. Cantidad usada sin default «todo». Adjuntar evidencia no confirma recepción. Advertir si se sale con captura no guardada; movimientos contabilizados permanecen.

390px: cards por línea permitidas, campos con label, hits 44px y CTA visible; 1024/1440 mantienen la receta del wizard/tabla actual. Overlays por portal, foco accesible y retorno al disparador. No duplicar tabla y listado móvil en el mismo viewport.

Proof futura: compra con sobrante, almacén sin recibo, conversión, cierre bloqueado, administrador corrigiendo cerrada, error/retry y costo pendiente en 390/1024/1440. PNG bajo `docs/screenshots/inventory-work-order-costs-v1/`; no evidencia visual creada todavía.
