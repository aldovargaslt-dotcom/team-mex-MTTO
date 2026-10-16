# Inventario — Análisis v1

Estado: alcance autorizado en chat el 2026-10-16: enfocar la vista Análisis,
agrupando Consumo/Movimientos según la propuesta conversada. EWO-043.
Sin nueva captura operacional ni motivos estructurados; consultas sobre los datos
actuales. No agente IA, predicción, gráficos nuevos ni cambios API/dominio.

Extensión autorizada posterior: [gráficas v1](inventario-graficas-v1.md), EWO-044,
incorpora evolución y ranking sobre Consumo. El límite de gráficos anterior
describe solo el incremento inicial EWO-043.

## Propósito y patrón

Supervisor/Admin entiende uso por refacción y abre registros que lo explican.
Patrón 3 de PAGE_PATTERNS. Hermano: Consumo/Movimientos de EWO-042, mismos
DataTable/listas mobile y Sheet para detalle. Modo Operate, tokens ADR003.
P0 Análisis; P1 cantidades que abren su origen; P2 filtros y resultado;
P3 SKU, fecha y nota. Consulta sin CTA naranja de escritura.

## Criterios verificables

1. Subnav: Existencias, Refacciones, Análisis, Comprobantes, Catálogo.
   `/inventario/analisis` abre Consumo, últimos 30 días.
2. Dos vistas internas Consumo/Movimientos con estado accesible y URL.
   Búsqueda por nombre/SKU/OEM, categoría y periodo compartidos. Solo Movimientos
   añade tipo. Cambiar de vista conserva filtros comunes y no restringe
   Consumo por tipo de movimiento. Categorías/OEM usan catálogo actual.
3. Periodos Hoy/7/30/90 días/Este mes/Todo/Personalizado; fechas en UTC como las
   consultas existentes, no una nueva política de día operacional. Fechas
   inválidas/invertidas no disparan consultas y muestran corrección junto al campo.
4. Resumen: Refacción, Desde almacén, Compra externa. Entradas/ajustes permanecen
   en Movimientos. No inventar saldos históricos ni nuevas métricas.
5. Cantidad desde almacén abre Movimientos con refacción, periodo y SALIDA_OT;
   Volver al resumen restaura la consulta previa y posición de lectura.
   Compra externa abre Comprobantes con refacción/periodo y retorno seguro a
   la consulta. Enlaces y botones semánticos, Enter/Tab y back del navegador.
6. Rutas antiguas `/inventario/consumo` y `/inventario/movimientos` redirigen
   conservando parámetros y la intención previa (Movimientos sin periodo sigue
   Todo; Consumo sigue 30 días). Enlaces actuales siguen funcionando.
7. Cargas, vacío filtrado, vacío de periodo y fallos parciales distinguibles.
   Fuente ausente no equivale a cero. Fallo de catálogo conserva consulta básica;
   filtro de categoría sin catálogo no genera un resultado falsamente vacío.
8. Desktop 1440/1024: tabla compacta + barra compartida. Mobile 390: listas de
   nombre completo/magnitudes/acciones visibles y controles de 44px. No reducir
   letra ni introducir cards decorativas. Sheet portaled existente.

## Límites de datos y verificación

Lecturas actuales y agregación existente; sin cambios a reglas de costo,
stock, captura, permisos, migraciones ni datasets históricos. Totales de consumo
siguen las fuentes actuales. No atribuir causalidad ni completitud no verificada.
Prueba: lógica de filtros/URLs, lint/build, CDP Chromium con fixtures locales,
role picker Supervisor/Admin, enlaces antiguos, drilldown/regreso, errores y
vistas desktop/mobile. QA visual independiente con PNG. No Playwright.
