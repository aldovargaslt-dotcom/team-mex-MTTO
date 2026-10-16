# Pulido integral de Inventario

Autorización: usuario solicita una pasada de polish a todo Inventario (2026-10-16).
EWO-045. Hermano: vistas operativas EWO-042 y Análisis EWO-043/044 ya pulido.
Patrón 3 (listado + filtros), formularios patrón 7 y Sheets existentes.
ADR003, Operate Craft, Roboto/navy/naranja y ancho actual se conservan.

## Alcance y criterios

1. Existencias, Refacciones, Análisis (Consumo/Movimientos), Comprobantes,
   Categorías y Proveedores comparten ritmo visual y filtros con etiquetas
   visibles, separadores sutiles y conteos solo después de cargar los datos.
   Conteos de búsqueda se expresan como resultados de la lista, no nuevas métricas.
2. Navegación Inventario en un renglón desplazable en móvil, sección activa
   visible y navegación de Catálogo subordinada. Sin cambiar rutas ni shell global.
3. Tablas densas con identidad prioritaria, metadatos legibles, cantidades
   alineadas, foco/hover claros y estados BAJO/AGOTADO conservados. Listas móviles
   con nombres completos y controles >=44px, sin duplicación ni overflow de página.
4. Catálogos diferencian creación y consulta mediante títulos y separación, sin
   añadir tarjetas. Mismo input y acciones crear/activar/inactivar, sin nueva captura.
5. Comprobantes mantiene documento/archivo/costo separados, con filas alineadas
   y nombre/acción visibles en móvil. Retorno desde Análisis y adjuntos intactos.
6. Alertas usa editor de filas compacto (identidad/existencia y mínimo), una ayuda
   común en vez de una tarjeta/explicación por pieza. Footer alcanzable, mismos
   campos, validaciones y guardado. Ficha distingue nombre de SKU; entradas/ajustes,
   alta y detalles reciben espaciado consistente sin tocar reglas financieras.
7. Análisis conserva gráficas, unidades, fechas, fuentes parciales y URLs. No
   duplicar su pulido anterior ni inventar nuevas métricas. Movimientos obtiene
   el mismo contexto de resultados y tratamiento de tabla/detalle.
8. Prueba real de click-through local con rol Supervisor/Admin, búsquedas,
   filtros, teclado, formularios y recuperación de error, capturas 1440/1024/390,
   revisión visual independiente, lint/build. No Playwright ni nueva UI library.

Sin API/schema, dependencias, permisos, nuevas reglas de stock/costo, inputs
operacionales, despliegue ni cambios en otras áreas. Integración real se declara
por separado; fixtures no prueban persistencia productiva ni permisos reales.
