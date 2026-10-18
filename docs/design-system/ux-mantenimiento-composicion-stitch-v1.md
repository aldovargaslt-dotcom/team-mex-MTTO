# UX — Recomposición de mantenimiento con referencia Stitch v1

## Status / authority

**Approved para las composiciones concretas de EWO-052/053**, 2026-10-17 (fecha local del cliente). Complementa [SPEC-UI-MANTENIMIENTO-002](../specs/SPEC-UI-MANTENIMIENTO-002.md), fuente canónica AC-01–18. Autorización posterior «Construyelo» y orientación de Órdenes confirmada. Las secciones de corte fijan la composición antes de JSX; la revisión de UI renderizada y aceptación humana son gates distintos. No autoriza push/despliegue ni nuevas composiciones fuera del alcance. El cuerpo de exploración registra alternativas iniciales, sustituidas por las decisiones concretas de los cortes.

## Screen purpose

Localizar una orden/unidad, entender su condición y acceder a la acción permitida sin perder datos ni contexto al pasar entre listado, ficha, detalle y captura.

## Primary user

Supervisor primero; Mecánico después, adaptando a su tarea. Admin conserva sus vistas compartidas autorizadas y su lectura de visitas. Matriz ruta/rol en la SPEC; no se reinterpreta el nombre «mantenimiento» como rol nuevo.

## Questions the screen must answer

1. Qué estoy viendo: identidad de orden/unidad y ubicación.
2. Hay algo mal: condición real/lectura incompleta, sin alarmas inventadas.
3. Debo actuar: acción permitida siguiente o consulta sin acción de escritura.
4. Cuál es el estado: borrador/abierta/cerrada/revisión y estado de carga/guardado, según fuente actual.
5. Qué apoyo hay: metadatos, trabajos/evidencia/historial y retorno contextual.

## Primary action / Secondary actions

La acción corresponde al objeto/estado autorizado. Mantener labels actuales como «Nueva orden», «Continuar», «Guardar y salir», «Ver ficha» o «Reintentar» donde ya existan; cada composición registrará etiqueta/variante exactas y su fuente antes de aprobación. Si el usuario atiende una orden seleccionada, su acción es principal y crear otra se vuelve secundaria sin desaparecer. En consulta, navegar/leer puede ser la acción; no inventar un CTA de escritura.

Primitivas Button existentes: default para principal cuando corresponde; secondary/outline/quiet para apoyo, dangerSoft para destructiva existente. Filtros/colas usan su selección neutra y semántica accesible, no se disfrazan de CTA o de condición. Véanse AC-04/07.

## Information hierarchy

- P0: identidad y condición del objeto atendido; condición crítica real visible al decidir.
- P1: siguiente acción permitida, próxima al objeto y distinguible de herramientas.
- P2: datos/evidencia necesarios para decidir o completar la tarea.
- P3: filtros, contexto, metadatos secundarios y navegación.

Cada lámina debe justificar sus regiones de énfasis y mostrar correspondencia antes/después de datos y acciones. Reducir repetición visual no equivale a eliminar información. Conservar los presupuestos de jerarquía/color del contrato visual.

## Pattern / Clone

Clonar la estructura operativa existente y evolucionar su jerarquía usando Stitch como referencia de composición. No copiar HTML ni las funciones ficticias de Comprobantes. Patrones del [catálogo local](../design/PAGE_PATTERNS.md), [contrato visual](../design/DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes) y [Operate craft](../design/OPERATE_CRAFT.md) prevalecen.

| Superficie | Hermano real / patrón | Dirección propuesta para láminas |
| --- | --- | --- |
| Órdenes | `/ordenes`, lista→detalle actual; identidad `OrderIdentity` y `UnidadMarca` | Encabezado compacto, herramientas coherentes, identidad documental y condición separadas de vehículo; detalle legible |
| Unidades | `/unidades`, `UnidadesCatalogo` | Búsqueda/filtros/identidad como acceso; conservar datos e indicadores actuales hasta evaluar su disposición, sin KPIs nuevos |
| Ficha | `/unidades/:id`, `HubIdentityHeader`, `HubFichaNav` | Identidad persistente, condición/acción y separación de información técnica, trabajo e historial; nav contextual |
| Visita | `/unidades/:id/visitas/:visitaId` y componentes de pasos | Reagrupar visualmente campos/ayuda, conservar secuencia, validación, evidencia y pie; lectura cerrada como documento |
| Mi trabajo | `/mi-trabajo`, cola→Sheet existente | Reutilizar anatomía de identidad/estado de orden adaptada a la tarea; sin navegación o permisos Supervisor |

Primer diseño candidato: Órdenes, con comparación actual/propuesta desktop/móvil en mismo estado. Proporciones de paneles, agrupaciones concretas y variantes de componentes se resuelven en revisión; no se fija380px o una card adicional por fidelidad superficial a Stitch.

## Dirección Impeccable Operate para el pase de diseño

Tarea: leer/atender objeto existente; siguiente acción contextual. Reusar shell/primitivas/tokens existentes, estudiar las anatomías repetidas y definir especímenes de encabezado, toolbar, identidad, fila/lista, campo, estado y overlay. Desktop denso sin sacrificar legibilidad; móvil con separación de bloques y acciones alcanzables. Antes de JSX, completar dirección del corte con lámina aprobada, estados, labels/variantes y patrón/hermano. Esta nota guía el diseño y no afirma ejecución del pase futuro de implementación.

Conservar Roboto, paleta, radios y motion locales. No importar la configuración tipográfica/paleta de DESIGN.md ni recetas externas de landing. Skills/gates según [EXTERNAL_SKILLS](../design/EXTERNAL_SKILLS.md).

## States

Conducta canónica: Failure Behavior y AC-12 de la SPEC. El inventario del corte registra el copy actual exacto y su composición para cada estado aplicable:

- Loading: información pendiente sin simular vacío o éxito; controles seguros.
- Empty: distinguir ausencia inicial de cero coincidencias; recuperación actual y acción permitida.
- Error: mensaje/fuentes incompletas y reintento existente, sin sustituir datos válidos por un blanco silencioso.
- Normal: objeto/condición/acción con datos representativos, texto largo, foto presente/ausente y contenido real.
- Warning/critical: pastel semántico con texto/icono y condición del dominio, no de selección.
- Disabled/guardando/éxito: conservar validación y feedback actuales, sin animación como única confirmación.

No añadir estados/servicios por completar una receta. Adjuntar escenarios de contenido a las láminas; una composición solo en estado ideal no está lista para aprobarse.

## Interaction notes

Enlaces y controles reales, nombres/estado accesibles, teclado y foco visibles. Conservar búsqueda/URL/historial y retorno. No desplazar navegación de ficha, filtros o stepper al menú global. No reintroducir Mantenimiento vencido como módulo independiente.

Overlay mediante portales actuales: tokens coherentes, scroll, Escape/cancelación, foco de retorno válido y acceso a acciones. Navegación completada respeta gestión de foco de ruta. No elegir otro tipo de overlay ni añadirlo por decoración; si la propuesta cambia interacción, explicitarlo y verificar AC aplicables antes de aprobar el corte.

Motion funcional150–250ms y reduced0; sin entradas de página, escalas o bounce. UI usable durante transiciones. Conservar guardados/errores y validaciones; no probar escrituras destructivas contra datos reales para una validación visual.

## Mobile / responsive

- 1440: sidebar actual y contenido en espacio restante; lectura compacta de lista/detalle, con metadatos subordinados.
- 1024: ancho útil reducido con sidebar expandida/rail, tabla/panel con scroll local y sin contenido esencial cortado.
- 800: conservar menú/navegación adaptable actual; comprobar geometría, no inventar migración de módulos.
- 390: bloques separados, lista→detalle secuencial cuando el flujo lo hace, targets44px, sin acción tapada por barra inferior/teclado; Supervisor conserva su bottom nav y Mecánico su menú actual.
- 320/altura corta/zoom: smoke de controles, textos largos, scroll, safe-area, overlay y pie de formulario tocados.

No es un rollout de navegación móvil para todos los roles; el estándar de módulos sigue [su UX](ux-sidebar-module-navigation-v1.md).

## Fuera / Don't

Exclusiones canónicas en la SPEC. Sin dark mode, backend, permisos, funciones Stitch nuevas, nuevos KPIs/servicios, sidebar Mecánico o rediseño de módulos excluidos. No modificar reglas de apertura/cierre, firma, cantidades o recuperación. No usar otro color primario por una guía antigua. No aprobar únicamente por similitud estética a una captura.

## Proof / readiness for implementation

Referenciar AC aplicables de la SPEC en cada EWO y registrar N/A justificado. Gates de WORKFLOW: UX aprobada → Operate antes de JSX → interacción → better-ui/correcciones → proof-ui CDP desktop/móvil sin Playwright → ux-auditor independiente → aceptación humana. Auditoría de un plan no sustituye revisión de UI renderizada.

Capturas previstas: `docs/screenshots/{ewo}_ordenes_{estado}_d1440.png`, variantes `_m390`, `_d1024`, unidades/ficha/visita/mi-trabajo según corte. No generar PNG ni PASS de una implementación futura. Datos representativos y mismos estados/viewport para comparación; límites de fixture/persistencia explícitos.

Antes de aprobar: matriz baseline, láminas exactas con estados, labels/variantes y anatomías, revisión de contraste/accesibilidad y fuentes sin conflicto, disposición de base local051, hallazgos de agentes resueltos. Las composiciones iniciales pendientes quedaron concretadas en las secciones052/053; resultados y capturas posteriores pertenecen a sus archivos de evidencia. No marcar aceptación humana por ese hecho.

## Corte aprobado — Órdenes EWO-052

Autorización posterior del propietario: «Construyelo… respecto a órdenes me gusta la orientación… otra pasada con este nuevo design system». La aprobación del patrón lista→detalle y reglas existentes permite este corte concreto; las propuestas de otras pantallas conservan su estado de diseño pendiente.

Dirección Operate previa a JSX y espécimen textual de composición:

1. **Encabezado:** PageHeader actual, título de cola20px y lede12px sobre consulta/atención. Historial y Nueva orden a la derecha en desktop, wrap móvil; conservar variante condicional de Nueva orden frente a Continuar. Sin cards/KPIs añadidos.
2. **Herramientas:** una región blanca estructural agrupa búsqueda por unidad/placas/chofer y filtro de tipo. Labels12px visibles, Input44 móvil y ListFilter neutro; tipo2×2 móvil. Es toolbar de consulta, no card decorativa con botón duplicado. No prometer búsqueda por folio, ausente del código.
3. **Lista→detalle:** misma orientación, proporciones base y comportamiento móvil actuales. Colas en la cabecera del listado; línea de conteo derivada de `filtered` solo tras lectura y descrita como resultado cargado, sin KPI global. Filas documentales seleccionadas con neutral/navy, divisores/bordes finos y targets44. Sin cambio de tabs a secciones globales.
4. **Detalle:** OrderIdentity + estado textual compacto al principio, unidad como objeto relacionado debajo con acciones existentes. Sustituir banda ancha de un solo estado por Badge neutro semántico, conservando tipo y condición actuales. Captura y metadatos siguen disponibles; fechas12/13, secciones13/14 y separación16. No inventar nueva condición ni cambiar handlers.
5. **Responsive:**1440/1024 lista lateral;≤800 flujo móvil existente. Toolbar en una columna debajo del encabezado a anchos reducidos; sin scroll horizontal de página. En detalle móvil, retorno a Órdenes y título/identidad visibles; barra inferior no tapa acciones.
6. **Estados:** conservar copy y controles de lectura, vacío/reset, error/parcial/reintento; estado loaded cuenta resultados locales, no total remoto. Datos largos y ausencia de foto se manejan por wrap. Overlays/guardados actuales inalterados, cierre/foco de Radix y reduced0.

Patrón/hermano: `/ordenes` actual y anatomía de encabezado/herramientas de Comprobantes; no copiar capacidades de Stitch. Componentes: PageHeader, Field/Input, ListFilter, OrderIdentity, Badge, UnidadMarca y Button. Contrato de color/Roboto/motion vigente. Esta composición es la especificación concreta del primer corte; auditoría del render sigue siendo obligatoria.

## Cortes aprobados — Unidades, visita y Mecánico EWO-053

Tras052 se ejecutan los siguientes cortes autorizados por «Construyelo» del propietario. Dirección Operate previa a JSX: compartir anatomías, conservar tareas distintas y todas las funciones. Esta especificación concreta sus propuestas de composición; aprobación del runtime proviene del propietario, no del auditor.

- **Unidades:** PageHeader como Órdenes (título20, lede12, acciones actuales al lado). Preservar los cuatro indicadores/filtros existentes, con valores16 y ritmo compacto en lugar de énfasis de dashboard. Buscador/estado/limpiar/buscar/filtros móvil dentro de OperationalToolbar; tipos, vista tabla/tarjetas, paginación y datos sin cambios. El texto auxiliar duplicado «Flota de mantenimiento» se integra en el lede, sin retirar información operativa. Sin nuevos KPIs.
- **Ficha:** conservar retorno/acciones arriba e identidad y health debajo. Metadatos agrupados con12/13px y texto largo con wrap, cuerpo16px y título20 sin overrides!important superados. Las cuatro secciones siguen como navegación contextual horizontal, no submódulos de sidebar.
- **Visita:** OrderDocumentHeader (identidad y estado) antes del PageHeader de unidad, usando la anatomía del detalle052. Mantener tipo/km/chofer/últimoKm, Guardar y salir y todo stepper/campos/footer. Lectura cerrada sigue documento existente. No cambiar secuencia ni handlers; estadoTone mantiene la semántica existente del flujo.
- **Mecánico:** PageHeader sin kicker redundante, cola y tipo de orden agrupados en OperationalToolbar. La fila conserva identidad/vehículo/estado/acciones actuales. Sheet de lectura muestra OrderDocumentHeader y luego unidad, tipo, chofer/km y trabajos; al cerrar vuelve al origen válido. No añadir sidebar/bottomnav u otras capacidades.
- **Especímenes compartidos:** OperationalToolbar solo estructura visual con nombre accesible, sin filtrar/consultar. OrderDocumentHeader compone OrderIdentity y Badge con estado entregado por el llamador; no deduce estado del dominio. Consumirlos también en052 para evitar duplicación. No nueva librería.

Densidad: desktop1440/1024 compacto, móvil390 con grupos separados y hits44;320/altura corta alcanzables. Estados y datos largos conservan copys/reglas actuales. Color/tipo/motion del contrato, portales y foco existentes. Overlay de datos usa Radix actual. No anima páginas ni provoca escrituras para hacer proof. Verificar la composición renderizada por rol y comportamiento crítico de pasos tocados; límites de fixture explícitos.
