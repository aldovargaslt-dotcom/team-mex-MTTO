# Análisis de Inventario — gráficas v1

Autorizado en chat el 2026-10-16: dos gráficas compactas sobre la tabla de
Consumo: evolución y diez refacciones más consumidas. Extiende Análisis EWO-043.
Hermano: `InventoryAnalysis` / `ConsumptionView`, patrón 3 (listado + filtro).
Sección analítica justificada por la comparación temporal y entre refacciones;
sin nueva página ni dashboard de KPIs. ADR003 y Operate craft intactos.

## Criterios

1. Consumo muestra columnas temporales apiladas y barras horizontales por
   refacción, con almacén y compra externa identificados por texto y trama/color.
   Misma búsqueda, categoría, refacción y periodo que la tabla. Entradas/ajustes
   no son consumo. Compra externa no implica falta de stock.
2. Evolución usa días hasta 14 días, semanas hasta 93, meses hasta tres años;
   periodos mayores usan años agrupados, con máximo aproximado de 24 intervalos.
   Calendario UTC existente, intervalos recortados a las fechas seleccionadas y
   ceros intermedios explícitos. Rangos abiertos usan los extremos registrados.
3. Ranking ordenado por total de ambos orígenes, máximo diez; empates estables.
   Mostrar cinco inicialmente y permitir expandir a diez para conservar densidad.
   Barras comparadas desde cero, escala común dentro de cada gráfica y unidad.
4. Unidades del catálogo separadas; pieza/pza equivalentes. Selector analítico
   solo si hay varias unidades, con selección en URL y retorno contextual.
   Refacciones sin unidad conocida no se mezclan ni
   se suponen piezas; se informa la omisión. Tabla y resumen respetan unidades.
5. Seleccionar un intervalo abre su Consumo filtrado, conservando consulta y
   retorno; allí las cantidades abren sus registros. Cada segmento del ranking
   abre directamente los movimientos/comprobantes existentes de esa refacción.
6. Sin gráficos parciales engañosos: durante carga, catálogo ausente o fuente
   fallida se explica disponibilidad y se conserva la tabla parcial existente.
   Sin consumo no se dibujan escalas vacías ni valores inventados.
7. Desktop dos regiones comparativas contiguas sin tarjetas decorativas; móvil
   apiladas. Periodos con muchas columnas tienen scroll local; etiquetas legibles,
   valores accesibles, enlaces con teclado/foco y objetivos de 44px en móvil.
   No tooltips como único acceso a datos; leyenda y detalle textual disponibles.

Sin API/schema/dependencias, inputs operacionales, predicción ni stock histórico.
Verificación: agregación/unidades/fechas/ranking, lint/build y CDP con fixtures,
capturas 1440/1024/390 y revisión visual independiente. No Playwright.

## Pulido autorizado — 2026-10-16

Solicitud posterior: «Do a polish with better ui». Mismo patrón y comportamiento.
Se usa el hermano actual `ConsumptionCharts` / `ConsumptionView`.

- Cifras encima de cada barra y guías horizontales tenues, eje alineado al área
  gráfica sin depender de la altura del título; escala y valores sin alteración.
- Ranking compacto con encabezados explícitos Almacén/Externa, nombres completos,
  cantidades alineadas y enlaces de 44px. SKU sigue disponible en el detalle.
- Leyenda y selector en un renglón compacto; exclusiones al pie, sin dominar.
- Separación sutil entre comparaciones, sin añadir tarjetas ni colores de CTA.
- Detalle por refacción con título, conteo y totales por fuente legibles, sin
  mezclar unidades. Móvil conserva desplazamiento local y nombres completos.
- Mantener URLs, filtros, estados parciales, tabla de valores, foco y navegación.
  Verificar CDP desktop/móvil, lint/build y revisión visual independiente.
