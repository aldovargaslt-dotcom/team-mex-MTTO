# Alertas de inventario — resultado GrillMe

Fecha: 2026-10-16. Estado: alcance confirmado por el usuario («i approve, go ahead with the spec»). Autorizada la elaboración de la especificación; no se ha autorizado ejecución de runtime. Fuente funcional: [SPEC-INV-ALERT-001](../../docs/specs/SPEC-INV-ALERT-001.md). UX: [modal optimizado](../../docs/design-system/ux-inventario-alertas-modal-v1.md).

## Objetivo y alcance

Optimizar la configuración de mínimos para un catálogo de aproximadamente 100 productos. Priorizar encontrar y ajustar pocos productos; admitir edición en lote. Usuarios existentes: Supervisor y Admin Directivo. Conservar permisos y reglas de Inventario.

## Diseño acordado

Modal amplio con buscador por nombre/SKU, filtros Todos / Con alerta / Sin alerta y tabla compacta. Columnas: selección, producto y SKU, existencias, salidas del mes anterior y mínimo de alerta. Encabezado y pie permanecen visibles; la lista se desplaza. Acción principal: «Guardar cambios», con contador de cambios pendientes. En móvil, superficie de pantalla completa con filas compactas.

La referencia muestra «Salidas mes anterior» y el periodo explícito. Ayuda: «No descuenta devoluciones ni incluye compras externas». Solo información: no sugiere ni modifica mínimos. Se obtiene de SALIDA_OT; no se presenta como consumo neto. El cálculo debe mantener la convención UTC de la consulta actual de movimientos, mostrando el mes correspondiente; no introducir un cambio de zona implícito en este corte.

## Decisiones confirmadas Q1–Q14

1. Priorizar ajustes rápidos de pocos productos.
2. Diseñar para aproximadamente 100 productos.
3. Incluir edición en lote.
4. Incluir referencia histórica junto al producto.
5. Usar mes calendario anterior.
6. Mostrar referencia, sin recomendar un mínimo.
7. Conservar selección al buscar/filtrar; indicar seleccionados fuera de vista y permitir limpiar selección.
8. Resolver guardados parciales: identificar éxitos y fallos, conservar pendientes y reintentar solo fallidos.
9. Mostrar salidas brutas de almacén, con aclaración sobre devoluciones y compras externas.
10. Aplicar mínimo en lote a grupos de la misma unidad. Quitar alertas admite selección de unidades mixtas.
11. Conservar ajuste automático del límite crítico y anunciar el efecto antes de guardar: «El límite crítico también bajará de 5 a 3».
12. El lote reemplaza mínimos existentes; mostrar cantidad afectada y cuántos tenían otro mínimo antes de aplicarlo. Solo modifica borradores hasta guardar.
13. Cancelar, X y Escape con cambios requieren «Descartar cambios» / «Seguir editando». Bloquear cierre durante guardado.
14. Diferenciar cero confirmado de «No disponible». Permitir reintentar referencia; su fallo no bloquea configurar mínimos.

## Criterios de shaping (históricos; criterios canónicos en SPEC)

- AC1: buscar por nombre/SKU y cambiar filtros conserva borradores y selección, incluyendo filas ocultas. Mostrar «3 seleccionados · 2 fuera de esta vista» cuando corresponda.
- AC2: aplicar mínimo en lote respeta unidades, informa reemplazos y actualiza solo borradores. Quitar alertas produce null, no cero.
- AC3: mantener enteros >= 0; vacío desactiva, cero es un mínimo válido. Comparador inclusivo y ownership existentes se conservan.
- AC4: cada fila muestra la referencia del mismo mes calendario anterior, su unidad y periodo; cero, carga y fallo son estados distintos. No cargar datos individualmente por fila.
- AC5: mostrar el ajuste de criticalQty que el cambio de minQty implique, conforme a reglas del backend; no duplicar reglas de severidad en JSX.
- AC6: guardar solo cambios pendientes. Ante fallo parcial, las filas exitosas pasan a guardadas; las fallidas conservan valores y error asociado. Reintento no vuelve a enviar éxitos. No cerrar modal mientras haya pendientes por error.
- AC7: footer accesible durante desplazamiento; controles con etiquetas y navegación por teclado; cambios pendientes protegidos al cerrar.
- AC8: verificar catálogo de aproximadamente 100 productos, filtrado sin resultados, selección oculta, lotes, referencia fallida y guardado parcial. Evaluar desktop y móvil con el sistema visual existente.

## Evidencia de comportamiento actual

- `web/src/app/inventario/stock/page.tsx`: modal de tarjetas sobre todos los rows; PATCH secuenciales, sin recuperación por fila.
- `api/src/inventario/inventario.service.ts`: minQty nullable, ajuste de criticalQty; consulta de movimientos por createdAt con fechas UTC.
- `web/src/lib/consumo-totales.ts`: agregación SALIDA_OT; periodos existentes 7/30/90 días móviles, no mes anterior.
- `api/src/inventario/inventory-costs.service.ts`: devoluciones RETURN reponen stock mediante AJUSTE, sin eliminar SALIDA_OT.
- ADR007 y ampliación ADR022: ownership Inventario, opt-in y límites críticos existentes.

## Siguiente etapa

SPEC/UX elaboradas tras confirmar el conjunto. Siguiente paso de ejecución: Engineering Work Order según AGENTS.md, con referencia a los criterios canónicos de la SPEC. Este documento no modifica runtime, API, esquema ni permisos. No requiere un ADR nuevo para decisiones de presentación reversibles; los ADR existentes siguen siendo fuente de verdad del dominio.
