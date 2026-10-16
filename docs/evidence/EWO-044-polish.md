# EWO-044 — Pulido de Análisis

Fecha: 2026-10-16. Autorización: solicitud del usuario «Do a polish with better ui».
Criterios: [adenda de gráficas v1](../design-system/inventario-graficas-v1.md).
Continuación local de EWO-044; se conserva el trabajo anterior sin publicar.

## Cambios

- Valores temporales colocados justo encima de cada barra; referencias de máximo,
  mitad y cero, con guías discretas. Eje alineado mediante un marco de gráfica,
  independiente de la altura del título. Escala y agregación permanecen iguales.
- Ranking con columnas explícitas Almacén/Externa, cantidades alineadas y nombres
  completos, sin slash ni SKU repetido. El SKU permanece en el detalle y title.
- Selector de unidad en línea con leyenda; comparaciones separadas por una línea,
  sin nuevas tarjetas, tokens, colores de CTA ni dependencias.
- Exclusiones al pie; espaciado reducido y detalle por refacción titulado, con
  conteo y totales por fuente. Se omiten subtotales cero sin perder datos de filas.
- Cantidades de unidad desconocida no se suman visualmente: «Unidad no disponible».
  Se conserva la cantidad individual de cada refacción en la tabla/lista.

## Verificación

| Comprobación | Resultado | Evidencia y límite |
|---|---|---|
| `node web/tests/inventory-charts.test.mjs` | PASS — 9 pruebas existentes | Agregación, unidades, límites UTC, ranking y fuentes; no se cambió el helper |
| `cd web && npm run lint` | PASS | Sin errores/advertencias ESLint |
| `cd web && npm run build` | PASS | Compilación de producción y tipos |
| Chromium 151 / CDP | PASS — 35 comprobaciones, 0 excepciones JS | [Registro](inventario-graficas-polish-v1-browser.json); roles Supervisor/Admin mediante selector real; API fixture local |
| Responsive | PASS — 18 PNG | 1440×900, 1024×768 y 390×844 emulado; detalle titulado visible en primer viewport desktop; scroll local de series largas |
| Revisión independiente `analysis_visual_qa` como ux-auditor | PASS tras corrección | Jerarquía, escala, ranking, leyenda, foco y 44px; sin bloqueantes pendientes |
| `git diff --check` | PASS | Sin errores de espacios |
| Backend real, persistencia y permisos productivos | SKIPPED | Fixture API, sin escrituras productivas; no implica integración completa |
| Dispositivo físico / auditoría completa de accesibilidad | SKIPPED | Emulación, Enter, foco, tabla de valores y objetivos táctiles comprobados; no auditoría completa |

El click-through conserva búsqueda/categoría/periodo y selección de unidad;
comprueba expansión, valores textuales, enlaces a orígenes, retorno encadenado,
fechas mensuales con año, teclado, carga, vacío, fuente parcial y catálogo fallido.

La revisión detectó que presentar la suma numérica de unidades desconocidas en
el resumen podía mezclar piezas y litros al fallar el catálogo. Se corrigió antes
del cierre y se recapturó catálogo fallido y resumen desktop/móvil. Una nueva
comprobación exige aviso sin cifra agregada. Veredicto independiente final: OK,
limitado a fixtures locales.

## Capturas principales

- [Desktop](../screenshots/inventario-graficas-polish-v1/consumo_d1440.png)
- [1024](../screenshots/inventario-graficas-polish-v1/consumo_d1024.png)
- [Móvil](../screenshots/inventario-graficas-polish-v1/consumo_m390.png)
- [Ranking y detalle móvil](../screenshots/inventario-graficas-polish-v1/ranking_m390.png)
- [Ranking expandido](../screenshots/inventario-graficas-polish-v1/ranking_expandido_d1440.png)
- [Mensual](../screenshots/inventario-graficas-polish-v1/mensual_d1440.png)
- [Valores](../screenshots/inventario-graficas-polish-v1/valores_d1440.png)
- [90 días móvil](../screenshots/inventario-graficas-polish-v1/tiempo_90d_m390.png)
- [Catálogo no disponible corregido](../screenshots/inventario-graficas-polish-v1/catalogo_error_d1440.png)

El registro JSON enumera los 18 estados, incluidos carga, vacío y error parcial.
Capturas anteriores EWO-044 se conservan como evidencia del incremento previo.

## Entrega

Archivos: `ConsumptionCharts.tsx`, `ConsumptionView.tsx`, estilos scoped en
`globals.css`, adenda UX y estado EWO-044. Sin cambios API, captura operacional,
permisos, rutas ni cálculos de consumo. Sin pruebas nuevas para cambios cosméticos;
las comprobaciones de navegador cubren la presentación y el caso de unidad ausente.

Cambios locales, sin commit/push/despliegue. Servicios dev/fixture y Chromium de
prueba cerrados. Sigue pendiente validar integración con backend de destino antes
de publicar.
