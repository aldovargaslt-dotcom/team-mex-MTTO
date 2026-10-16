# Inventario operativo v1 — brief y criterios UX

Estado: aprobado en chat el 2026-10-16. Usuario confirmó prioridad B (registrar
entradas/revisar faltantes), identificación A (nombre) y el brief completo.
Ejecución: EWO-042. Refina las siete vistas actuales; no cambia reglas del dominio.

## Propósito y usuario

Supervisor y Admin registran entradas físicas y revisan faltantes. Modo Operate.
Existencias es el destino de navegación principal; `/inventario` conserva
Refacciones y sus enlaces. Patrón 3 de PAGE_PATTERNS, hermano Existencias actual;
formularios cortos patrón 7, ficha/movimiento en Sheet como actualmente.

## Jerarquía y acciones

P0: Existencias y Registrar entrada (único primary). P1: faltantes/agotados.
P2: nombre, cantidad, mínimo y filtros con conteos. P3: SKU/categoría/metadatos.
Buscar por nombre primero, también SKU y OEM donde los datos estén disponibles.
Tabla: Refacción, Existencia, Mínimo, Faltante, Estado. Cantidad/unidad juntas;
números alineados, estado comunicado con texto, no solo color. Sin mínimo no
significa disponible ni agotado: conservar semántica de ADR007/022.

## Criterios verificables

1. Navegación de Inventario desktop/mobile abre Existencias; Refacciones accesible.
2. Búsqueda y filtros de existencias se combinan; conteos por estado con datos
   cargados, sin mostrar ceros como hechos durante carga. Filas BAJO/AGOTADO
   reciben énfasis semántico y orden prioritario sin inventar clasificación.
3. Entrada global no preselecciona piezas. Búsqueda por nombre/SKU; selection
   explícita. Entrada contextual conserva pieza y stock resultante. Proveedor,
   costos, permisos, idempotencia y reglas financieras intactos.
4. Identidad de tabla abre ficha/detalle con botón o enlace de teclado, además
   del clic en fila. No convertir tr en botón ni anidar controles.
5. Refacciones agrupa búsqueda/filtros; error de alta dentro del diálogo;
   guardado comunica actividad y evita doble envío.
6. Movimientos agrupa búsqueda/periodo/tipo; personalizado permite fechas;
   filtros URL y acceso al detalle preservados. Notas resumidas en lista.
7. Consumo prioriza nombre y separa accesos a movimientos/compra externa.
   Entradas y ajustes siguen presentes como contexto; sin métricas nuevas.
8. Comprobantes separa documento/archivo/costo, con filas uniformes y acciones
   explícitas. No cambia RECIBIDA ni supone archivo obligatorio. Vista previa
   en detalle; conserva carga, recepción y capacidades financieras.
9. Categorías/Proveedores: creación agrupada con su botón, carga/empty/error
   distintos y envío bloqueado mientras está pendiente; conservar activar/inactivar.
10. Desktop 1440/1024: toolbar compacta y tabla legible. Mobile 390: filas
    operativas con nombre/existencia/excepción; filtros adaptables, hits 44px.
    Sin reducir tipografía ni cambiar Roboto/navy/naranja/tokens globales.

## Estados y proof

Cargando existencias… / No hay refacciones que coincidan / Reintentar;
Guardar → Guardando…; Registrar entrada → Confirmando…; error conserva inputs.
Los estados de operación incierta se conservan. Warning y critical solo por
datos fuente. Overlays portaled existentes. Foco, disabled y teclado verificables.

Proof previsto: entrada desde role picker Supervisor/Admin, búsqueda y filtro,
abrir ficha por teclado, entrada global sin pieza, entrada contextual, error alta,
comprobante con/sin archivo, catálogo cargando/guardando; d1440/d1024/m390.
No declarar visual OK sin PNG y revisión independiente. Evidencia EWO-042.

## Fuera

Sin API, schema, permisos, reglas de costos/stock, máximos, OC, nuevas fuentes,
dependencias, shell nuevo, KPI decorativo, despliegue o cambios de otras áreas.
