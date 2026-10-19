# UX — Análisis de mantenimiento: mock v1

## Estado y alcance

Fuente funcional canónica de este incremento:
[SPEC-AN-MTTO-001](../specs/SPEC-AN-MTTO-001.md), estado Proposed. Este documento
define composición y comportamiento visual; no sustituye sus AC. Las propuestas
técnicas de la SPEC requieren resolución antes de ejecución. La autorización
posterior «hazle spec» comprende documentación, no código.

Intercambio de datos y fallos propuestos en
[AN-MTTO-001](../contracts/AN-MTTO-001-contract.md). Viaje registrado no implica
movimiento físico/productividad; costo conocido/km con importes pendientes es
parcial. Mantener estas precisiones en copy, tooltip y tabla de datos.

Decisiones de cierre confirmadas: Directivo configura horarios; Supervisor
consulta/solicita. Porcentaje solo con cobertura temporal completa; caso parcial
muestra horas y causa, sin ratio. Servicios externos se reconocen en conclusión,
no en pago/captura; IVA desconocido no se pinta0. Diseño concreto en
[contrato técnico](../contracts/AN-MTTO-001-technical.md), para ratificación.

Diseño conceptual solicitado por el propietario: pasar el mock por el flujo UI
sin generar interfaz de código. Fecha cliente: 2026-10-18. Dirección visual y
revisión de mocks; pendiente de aceptación visual humana. No autoriza runtime,
rutas, dependencias, permisos ni cálculos. La SPEC enlazada contiene los criterios
funcionales; diseño de contratos propuesto pendiente de ratificación técnica.
No constituye proof-ui ni QA funcional.

Fuente de producto: [discovery GrillMe](../../workspace/discovery/maintenance-analysis-grillme.md).
Fuentes visuales: [contrato](../design/DESIGN_SYSTEM.md),
[dirección](../design/VISUAL_DIRECTION.md), [Operate](../design/OPERATE_CRAFT.md),
[sidebar](ux-sidebar-module-navigation-v1.md). Los mocks anteriores de esta
conversación son exploraciones aproximadas, no nuevos tokens aprobados.

Alcance visual de este pase: Resumen desktop y adaptación teléfono. Las otras
tres secciones se definen como arquitectura de información y comportamiento,
sin afirmar que sus pantallas completas se hayan diseñado.

## Propósito / usuarios / preguntas

Directivo ADMIN_DIRECTIVO y Supervisor SUPERVISOR revisan resultados semanales
y tendencia mensual para localizar gasto elevado, tiempo sin operar y sistemas
con intervenciones frecuentes. La interpretación de rutas/carga/pavimento es humana.

- Qué veo: Análisis de mantenimiento, sección Resumen, periodo y alcance de unidades.
- Qué falta: costos pendientes y horario no configurado, sin convertir faltantes en cero.
- Qué debo revisar: unidades con gasto/intervenciones/atrasos y registros asociados.
- Estado: datos conocidos y cobertura explícita por indicador.
- Apoyo: tendencia mensual, desglose por sistema y tabla trazable.

## Dirección Impeccable Operate

Modo Operate. P0 título, periodo y cobertura; P1 unidades para revisar y enlace
a registros; P2 dos gráficos comparativos; P3 notas de cálculo/fecha. Sin CTA
de alta en una pantalla de consulta: la acción principal es abrir la unidad o
los registros de una selección. No fabricar botón sólido para llenar el header.

La síntesis numérica es una franja única con divisores, no cuatro KPI cards.
Tabla antes que gráficos: la decisión operativa aparece antes que su apoyo.
Dos gráficos en una sección blanca compartida, dividida por una línea. Sin
gráficas ni KPIs añadidos a Inicio o Flota.

## Patrón / hermano / primitivas

Extensión explícita del patrón 3 (listado denso + filtro) para análisis agregado:
el listado solo no explica evolución temporal ni composición del gasto; patrón
5 corresponde a una unidad y no sirve de marco global. La tabla conserva anatomía
documental; las gráficas añaden apoyo al listado, no un shell independiente.

Hermano de shell: `/inventario/stock`,
`docs/screenshots/ewo055_admin_stock_d1440.png`; fuente actual
`web/src/components/WorkspaceSidebar.tsx`. Hermano analítico:
`/inventario/analisis`, `InventoryAnalysis` (anatomía consultiva, no sus cálculos).
Reutilización futura propuesta: PageHeader, OperationalToolbar, DataTable,
Button secondary/quiet, NativeSelect, Note y EmptyState. Sin implementar.

## Navegación propuesta

- Desktop >=1024: shell existente; módulo Análisis con Resumen,
  Utilización, Costos, Tendencias por sistema dentro del sidebar. No duplicarlos
  como tabs superiores. Nuevo módulo es propuesta de diseño, no cambio ejecutado.
- Mantener Inicio, Órdenes, Unidades, Inventario y accesos por rol actuales.
  Análisis no reemplaza Análisis de Inventario ni cambia sus destinos.
- Teléfono: conservar los cuatro accesos de barra inferior existentes y proponer
  acceso a Análisis desde el menú global ya disponible. Al abrir el módulo,
  selector/panel con las cuatro secciones y retorno de foco. Su integración
  final debe especificarse antes de implementación; no migrar navegación actual.

## Tokens y paleta analítica

Decisión posterior Q15: Preventivo azul `#2F5BB8` y Correctivo terracota `#C45D23`
en toda la aplicación según [contrato](../design/DESIGN_SYSTEM.md#identidad-global-del-tipo-de-mantenimiento--decisión-posterior).
Tipo y estado separados; selección de filtros neutra. Los turquesa/violeta
descritos abajo son históricos de la imagen y no son una paleta aprobada para
implementación ni colores de tipo. No se ha actualizado la imagen ni la interfaz.

Comparación por tipo (Preventivo/Correctivo) y por concepto (Refacciones/Servicios
externos) son dimensiones distintas. Ofrecer cambio de desglose con título y
leyenda explícitos, sin atribuir a refacciones el significado de Preventivo ni
a servicio externo el de Correctivo. Históricos Sin clasificar visibles como
categoría neutral; no excluirlos silenciosamente del total conocido.

Roboto, navy #24284D, naranja #EA7515, fondo #F3F3F3, blanco, borde #E4E5EC,
texto #1C1D26 y muted #5C5F73. Radios 6px, sin sombras/gradientes.
H1 20px/600, secciones 13–14px/600, cuerpo 14, metadatos 12, thead 11.
Página 12–16px, gap 12px, contenido máximo 1040px del shell existente.
Naranja solo ubicación, foco y acciones aprobadas; selección de filtros neutra.

Paleta categórica de prueba, limitada al mock (no tokens nuevos del sistema):
refacciones turquesa #258C83, servicios externos violeta #7967B4. Color siempre
acompañado de leyenda y valores; no representa bueno/malo. Frecuencia de sistemas
usa una sola serie turquesa. No asignar un color decorativo a cada sistema.
Estados usan pasteles semánticos existentes con texto, sin depender solo del color.
Contraste de la imagen no demuestra contraste de una implementación.

## Contenido / coherencia del fixture

Fixture ficticio: semana 12–18 oct 2026, todas las unidades. Síntesis semanal:
costo conocido $18,400 sin IVA, 3 servicios pendientes, 186h en viaje,
12 órdenes abiertas al corte. Sin porcentaje de utilización por falta de horario.
Pendientes de costo no equivalen a cero. Órdenes abiertas son estado al corte,
no órdenes abiertas durante la semana. Los conteos pendientes indican alcance.

Tabla de ejemplo: TM-014 $8,400, 3 correctivos, Reparaciones frecuentes;
TM-027 $6,200* con costo externo pendiente, 2 correctivos;
TM-008 $3,800, 2 correctivos, Mantenimiento vencido. Total conocido $18,400;
no afirmar que todos los pendientes de la flota se limitan a estas tres filas.
Columna título Costo conocido, leyenda asterisco Costo parcial; clic en unidad.
No ranking de severidad opaco: fila lleva motivo observable; ordenación visible.

Gráfico mensual es contexto independiente del filtro semanal, explícitamente
rotulado: últimos 6 meses, mayo–octubre; octubre al día 18 (parcial).
Totales mensuales: 22,000 / 31,000 / 27,000 / 38,000 / 42,000 / 48,600.
Octubre: refacciones 35,400 + servicios 13,200. No comparar octubre parcial
contra meses completos como mejora/empeoramiento. Sin flechas porcentuales.

Frecuencia por sistema corresponde a semana seleccionada: frenos12, llantas9,
suspensión6, motor4; cuenta órdenes concluidas con ese sistema, no piezas ni
revisiones CHECK. Una orden puede incluir varios sistemas. No equiparar este
conteo a reemplazos o fallas. Tipos de trabajo se exploran en Tendencias.

## Acciones / interacciones propuestas

- Periodo semanal, tipo/unidad y Restablecer: controles neutros. Cambios mantienen
  todas las unidades/periodos explícitos y actualizan tabla y gráfico semanal.
- Gráfico mensual conserva el alcance de unidades, con ventana mensual indicada
  aparte. Seleccionar mes abre Costos con ese periodo; no cambia silenciosamente
  las cifras semanales. La misma selección puede hacerse desde tabla de datos.
- Seleccionar sistema abre Tendencias por sistema, conserva semana y unidades.
- Unidad abre su detalle con retorno conservando filtros.
- Leyenda alterna series; estado visible y activable con teclado, nunca color solo.
- Tooltip al hover/foco y toque; detalle consultable sin hover. En mock limpio no
  mantener tooltip abierto tapando otras series. Selección persistente abre datos
  asociados bajo gráfico o en su vista; no sobrecarga de diálogos.
- Overlays futuros portaled; Escape/cierre y retorno de foco, estados hover/focus/
  disabled/loading; motion funcional150–250ms, reduced0. Son requisitos, no pruebas.

## Otras secciones (contenido propuesto, no mocks completos)

- Utilización: horarios generales/excepciones con vigencia; viaje, mantenimiento,
  otras retenciones, disponible sin uso, sin información. No duplicar periodos
  solapados ni inferir disponibilidad de ausencia de eventos.
- Costos: refacciones + servicios externos sin mano de obra interna; neto/impuestos/
  total, fecha efectiva de servicio, captura tardía auditada, sin duplicar piezas
  incluidas en servicio. Supervisor captura desde unidad, orden/parada si existe.
  Q16: tipo Preventivo/Correctivo heredado de orden vinculada cuando exista;
  captura directa solicita el tipo. Históricos sin evidencia quedan Sin clasificar.
- Tendencias: sistema + revisión/ajuste/reparación/cambio, frecuencia, costos
  atribuibles y km entre intervenciones con evidencia. Sin inferir causalidad.
- Próximos servicios e impacto de refacciones apoyan planeación en sus vistas,
  enlazando órdenes/inventario. No acumular todos los insights en Resumen.

## Estados (diseño, no ejecución)

| Estado | Copy / tratamiento |
|---|---|
| Carga | Cargando análisis…; conservar espacio de datos sin números ficticios, sin shimmer |
| Sin registros | No hay registros para el periodo y las unidades seleccionadas. Cambia los filtros para consultar otro alcance. |
| Sin coincidencias | No hay unidades con estos filtros. Restablecer filtros. |
| Error | No pudimos cargar el análisis. Reintentar. Sin mostrar datos viejos como actuales |
| Parcial | 3 servicios pendientes de costear. El costo conocido puede aumentar |
| Sin horario | Utilización no calculada: falta configurar el horario. Directivo puede configurar; Supervisor consulta/solicita |
| Cobertura temporal parcial | Utilización no calculada: faltan datos del periodo. Horas conocidas y cobertura visibles, sin porcentaje |
| IVA desconocido | IVA no disponible para todos los consumos. Conservar neto conocido, sin total fiscal inventado |
| Sin km | Costo por km no disponible: faltan lecturas válidas para este periodo |
| Falta clasificación | Sin desglose por sistema. No asignar costo arbitrariamente |
| Crítico | Solo desde condición fuente real, con magnitud/texto; no semáforo inventado |
| Normal | Datos sin tintes de estado, cobertura y corte consultables |

## Responsive

- Desktop1440: sidebar230 aprox., topbar64, contenido1040, tabla y dos gráficos
  con reparto60/40 dentro de sección. Controles compactos sin columnas minúsculas.
-1024: reducir sidebar mediante patrón existente; gráficos pueden apilarse.
-390: identidad/título, semana, filtros, síntesis2x2 sin cards independientes;
  nota parcial visible antes de tabla. Tabla con scroll local y columnas legibles,
  gráficos apilados, sin scroll horizontal global. Bottom nav conserva módulos
  existentes y acceso por menú global; mantener targets44px y safe area. Gráfico de seis meses cabe
  con etiquetas abreviadas; tooltip se abre por toque. No texto menor a12 para caber.

## Evidencia / límites

Entregables gráficos en `docs/design/mocks/analisis-mantenimiento-v1/`.
Revisión conceptual independiente y hallazgos se registran junto a los mocks.
El estado normal/parcial se representa en imagen; demás estados especificados,
sin afirmar imágenes exhaustivas. Sin ui-implementer, sin cambios a web/api,
sin lint/build requeridos, sin better-ui sobre código, sin proof-ui ni aprobación
Visual QA de aplicación. Tipografía/píxeles de imágenes generadas son aproximados;
los tokens y medidas de esta spec mandan en una futura implementación.

## Integración con el shell canónico de main — EWO-063

APPLICATION_NAVIGATION.md gobierna el shell vigente tras integrar main. Análisis
usa su catálogo ApplicationNavigation, selección navy/blanco y subnav secundaria,
conservar filtros entre hojas. El selector de sección de la página aparece solo
en móvil<768px. Las primeras capturas de este documento son evidencia histórica
del shell anterior; no autorizan recuperar WorkspaceSidebar ni variantes locales.
