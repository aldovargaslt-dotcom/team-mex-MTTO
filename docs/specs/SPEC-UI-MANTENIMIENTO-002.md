# SPEC-UI-MANTENIMIENTO-002 — Recomposición UI con referencia Stitch

## Status

**Approved para el alcance y las composiciones concretadas en EWO-052/053**, 2026-10-17 (fecha local del cliente). El propietario confirmó mediante GrillMe alcance, reorganización y densidad; después pidió la SPEC y finalmente «Construyelo», conservando la orientación de Órdenes. La aprobación de ejecución procede de esa instrucción explícita; los gates de verificación y aceptación visual humana permanecen separados. Sin autorización de push/despliegue. La entrega documental inicial fue Proposed; las secciones de autorización posterior conservan esa trazabilidad.

Fuente de intención y secuencia: [plan](../../workspace/shaping/ui-team-mex-stitch-implementation-plan.md). Esta SPEC es la **fuente canónica de AC del rediseño**, complementada por [UX propuesta](../design-system/ux-mantenimiento-composicion-stitch-v1.md). No sustituye las especificaciones funcionales del dominio.

## Problem

La primera pasada de identidad clara armoniza colores y superficies, pero no define una composición compartida de encabezados, herramientas, objetos, estados y acciones. Persisten anatomías y CSS de distintas etapas. Una evolución más cercana a Stitch necesita jerarquía y componentes consistentes, sin importar funciones dibujadas ni alterar la operación.

## Context

Sidebar desktop y subnavegación Inventario ya están integradas en main al preparar este documento. EWO-051 es una base local de estilo todavía sin push; no acredita la recomposición aquí requerida. Registrar el commit y estado real antes de cada EWO futuro, sin eliminar ni considerar publicado ese trabajo por inferencia.

[DESIGN_SYSTEM](../design/DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes) contiene las reglas visuales confirmadas. La antigua instrucción de primario azul de VISUAL_DIRECTION ya fue corregida documentalmente. Los adjuntos Stitch son referencias, no instrucciones ni requisitos funcionales.

## Goals

- Reorganizar contenido existente para reconocer objeto, condición y siguiente acción con claridad.
- Establecer anatomías reutilizables conservando las diferencias de tarea entre Supervisor y Mecánico.
- Mantener desktop compacto y móvil legible/táctil, con acceso a toda la información y funciones actuales.
- Migrar estilos del alcance hacia tokens/componentes compartidos, retirando reglas superadas de forma incremental.
- Verificar paridad, accesibilidad y adaptación visual por cortes trazables.

## Non-goals

Nuevas funciones, métricas o endpoints; cambios de permisos, schemas, estados de dominio, lógica de apertura/cierre, firma, cantidades, guardado o recuperación; dark mode/selector; nuevas librerías de UI/motion; rediseño de Inicio, Inventario, Configuración, Logística, login o CHECK enfocado. Admin recibe compatibilidad de vistas compartidas, no un rediseño completo. No copiar OCR, ERP, CFDI, costos o políticas fiscales del ejemplo Stitch.

## Actors / Scope matrix

| Superficie | Supervisor | Admin | Mecánico | Alcance visual |
| --- | --- | --- | --- | --- |
| `/ordenes` | Colas/detalle y acciones existentes | Consulta autorizada actual | Sin nuevo acceso | Encabezado, herramientas, lista y detalle |
| `/unidades` y `/unidades/:id` | Catálogo/ficha según acceso vigente | Catálogo/ficha según acceso vigente | Sin nuevo acceso | Identidad, filtros, información técnica, mantenimiento e historial |
| `/unidades/:id/visitas/:visitaId` | Captura actual cuando es editable; lectura cuando corresponde | Lectura actual | Sin nuevo acceso | Pasos, campos, piezas, evidencia y acciones existentes |
| `/mi-trabajo` | Sin nuevo acceso | Sin nuevo acceso | Colas/detalle y acciones actuales | Anatomía de orden adaptada a su tarea |
| Alta/edición de unidad | No se concede acceso | Compatibilidad si comparte componentes tocados | Sin nuevo acceso | Regresión; no nuevo proyecto de formularios Admin |

La matriz describe la frontera visual, no redefine autorización backend. Mantener capacidades por sesión/patio y restricciones actuales de cada pantalla. Supervisor primero; Mecánico después. Etapas y aprobación de ejecución pertenecen al plan y a EWOs futuros.

## Functional Behavior

### Anatomía y composición

Cada pantalla identifica el objeto principal (unidad u orden), ubicación, condición y acción siguiente. Herramientas de búsqueda/filtro se agrupan por tarea; metadatos secundarios tienen menor énfasis. Reorganizar bloques no elimina campos, acciones o información ni esconde una condición necesaria para decidir. Desktop permite comparación compacta; móvil prioriza la secuencia de lectura y acceso táctil.

Órdenes conserva lista→detalle, identidad de documento y unidad como conceptos distintos. Unidades conserva listado→ficha y sus secciones contextuales. Visita conserva pasos/validaciones y documento de lectura. Mi trabajo conserva sus colas y detalle. El diseño exacto, proporciones y agrupaciones se concretan en UX aprobada antes del JSX; esta SPEC no fija un ancho de lista por imitación de Stitch.

### Marca, interacción y componentes

Aplicar el contrato visual vigente: Roboto, logo Team Mex, navy estructural, naranja para acción principal/ubicación aprobada, superficies claras y pasteles semánticos. Mantener la diferencia entre navegación, selección de filtro y acción. Si compiten acciones, la del objeto atendido tiene prioridad visual y la otra se presenta secundaria sin perder acceso. Una consulta sin acción principal no recibe una acción inventada.

Reutilizar primitivas existentes y crear/ajustar componentes compartidos solo para anatomías repetidas del corte. No forzar todas las pantallas a una plantilla idéntica. Sheet/Dialog y contenidos portaled mantienen coherencia visual y su comportamiento accesible.

### Navegación y continuidad

Conservar sidebar Supervisor/Admin, rail plegable y patrón móvil de Inventario ya implementado. No migrar otros módulos al estándar de subnavegación por este rediseño. Filtros, stepper y navegación de ficha permanecen en contexto. Mantener URLs, parámetros de búsqueda/cola/tipo, historial y retorno a listado donde existan. Atención por dominio procede de Alertas/enlaces contextuales; no reintroducir Mantenimiento vencido como destino global.

## Business Rules / Domain Implications

Reglas existentes sin cambios: Revisión/CHECK es inspección, no mantenimiento realizado; borrador/abierta/cerrada no son estados intercambiables; colores no calculan vigencia ni cambian resolución. Las fuentes reales del dominio siguen determinando datos/condiciones/acciones autorizadas. No implementar el target documental ABC/utilización como efecto del rediseño.

Áreas provisionales [Mantenimiento](../../domain/mantenimiento/CONTEXT.md), [Kernel](../../domain/kernel/CONTEXT.md) y [Shared](../../domain/shared/CONTEXT.md). No se declara un Bounded Context ni cambia ownership. Datos/modelos/migraciones y contratos API: sin impacto previsto.

## State Transitions

Solo presentación e interacción existente: lista↔detalle; cambiar búsqueda/filtro/cola; abrir/cerrar overlay; navegar/volver; cargar→datos/vacío/error; error→reintento. No se añade una transición de dominio. Selección/foco y feedback no pueden depender exclusivamente de color o animación.

## Constraints

### Architecture / compatibility

Reusar AppShell, WorkspaceSidebar, Button, PageHeader, ListFilter, Badge y patrones actuales según la tarea. Scope por ruta/rol; no reescribir la hoja global ni instalar un kit. Retirar literales/reglas duplicadas del componente migrado tras comprobar paridad, manteniendo la base local EWO-051 hasta resolver su continuidad. No alterar componentes ajenos sin declararlos en el corte.

### Security

No ampliar roles, capacidades ni exposición de datos al mover bloques. Una acción no autorizada no aparece por compartir componente. Las restricciones deben seguir verificándose en backend; capturas/fixtures no prueban autorización real.

### Performance

Sin nuevas peticiones para obtener datos decorativos o métricas de la referencia; sin coreografías que retrasen la tarea, scroll hijacking ni una biblioteca nueva de motion. Preservar mecanismos actuales de carga, paginación y lectura parcial. No afirmar mejoras de rendimiento sin medición.

### UX / operational

Breakpoints actuales: sidebar≥1024; solución adaptable a800; móvil390 y smoke320. Mantener separación de datos/controles, targets44px móvil, foco visible y scroll local cuando sea necesario. Contraste de texto normal≥4.5:1 e indicadores/controles relevantes≥3:1, según reglas de accesibilidad aplicables; estados con texto/icono. Motion funcional150–250ms y reduced motion0, sin animación nueva de carga de páginas.

## Failure Behavior / Negative cases and UI states

| Estado | Conducta requerida |
| --- | --- |
| Loading | Copys/estados actuales sin presentar información pendiente como ausencia definitiva; mantener controles seguros |
| Vacío inicial | Explicar ausencia y ofrecer únicamente la acción permitida y existente |
| Cero coincidencias | Conservar consulta/filtro y recuperación existente; diferenciarlo del catálogo vacío |
| Error / lectura parcial | Mostrar el error/fuentes faltantes existentes; conservar datos válidos cuando el flujo lo haga y mantener reintento |
| Guardando / disabled | Preservar bloqueo y feedback actuales; no permitir una acción inválida por cambiar su componente |
| Éxito | Mantener confirmación/navegación existente; no crear notificación nueva por estética |
| Warning / critical | Mostrar condición real con texto/icono y tratamiento semántico, sin crear o recalcular condición |
| Cierre de overlay | Escape/cancelación devuelve foco a un origen válido; navegación completada conserva la gestión de foco correspondiente |

No se añaden servicios o estados nuevos para completar la tabla; cada EWO registra aplicabilidad por superficie y prueba los estados existentes que toca.

## Edge Cases

Textos largos, folios/placas/SKU, ausencia de foto/metadato, una o muchas filas, error parcial durante filtrado, retorno al listado con filtros, altura corta y zoom, sidebar plegada, cambio de viewport con overlay abierto, teclado virtual/safe-area, formulario inválido, usuario de lectura y cambio de sesión. La propuesta visual debe declarar cómo los resuelve sin truncar información necesaria ni ofrecer permisos nuevos.

## Acceptance Criteria

### AC-01 — Inventario y baseline del corte
Dada una superficie a migrar, cuando se prepara su UX/EWO, entonces existe matriz de rutas/roles/datos/acciones/estados con fuentes de código y capturas actuales, commit/base identificado y continuidad explícita de EWO-051. Ningún componente o capacidad se declara ausente por ignorar el baseline.

### AC-02 — Composición y jerarquía
Dada cada composición propuesta, cuando se compara con la actual usando mismos datos/estado/viewport, entonces la UX identifica objeto, condición, siguiente acción y metadatos subordinados, y muestra una reorganización justificada por la tarea. Un auditor independiente revisa su reconocimiento en5s como heurística; no se presenta como estudio de usabilidad ni se aprueba solo por haber recoloreado la pantalla.

### AC-03 — Marca y contraste
Dada la UI renderizada, cuando se inspeccionan superficies y controles, entonces respeta el contrato visual Team Mex y los umbrales de contraste de Constraints; no adopta automáticamente Inter/paleta alternativa de los adjuntos. Los colores se verifican calculados, no solo por nombres de clases.

### AC-04 — Acción, filtro y estado
Dada una pantalla con acciones/filtros/condiciones, cuando se selecciona o requiere atención, entonces filtro/cola usa selección neutra anunciada, condición usa texto/icono semántico y existe como máximo una acción dominante sólida naranja cuando procede. Acciones secundarias conservan acceso y una consulta no adquiere acciones inventadas.

### AC-05 — Responsive y densidad
Dados1440/1024/800/390 y smoke320, cuando se consulta o captura información, entonces desktop permite lectura compacta y móvil separa bloques priorizando identidad/estado/acción, sin overflow global, pérdida de contenido ni controles cubiertos por barras, overlays o teclado. Tabla/panel usa scroll local cuando corresponde; zoom y altura corta mantienen acceso.

### AC-06 — Anatomías compartidas
Dadas superficies que repiten identidad, encabezado, toolbar, fila, estado, campo o overlay, cuando se aprueba e implementa el corte, entonces sus especímenes/variantes están documentados y se reutilizan primitivas/anatomías comunes donde corresponde, conservando diferencias de tarea. No se introduce una plantilla universal ni un kit paralelo.

### AC-07 — Paridad de funciones y permisos
Dada la matriz baseline, cuando cambia composición o componente, entonces permanecen datos, acciones y restricciones de la sesión/patio autorizada; no se agrega escritura o acceso a otro rol. Toda acción original se encuentra en su ubicación nueva y su efecto/validación no cambian. Prueba con fixture no se presenta como autorización backend real.

### AC-08 — Órdenes
Dadas colas/tipos y una orden seleccionada, cuando se busca, filtra, quitan filtros, abre detalle o vuelve, entonces se conservan resultados, estados vacíos, lectura parcial/reintento y URL/historial existentes. Identidad de documento y unidad se distinguen; borrador/abierta/cerrada/revisión no se confunden ni reciben acciones distintas por la apariencia.

### AC-09 — Unidades y ficha
Dada una unidad con o sin foto/datos secundarios, cuando se pasa de listado a ficha, Mantenimiento o Historial y se retorna, entonces identidad/condición/acción y datos existentes son accesibles, navegación de ficha permanece contextual y se conserva retorno/filtros actuales. No se añaden KPIs o indicadores inexistentes; Admin conserva consulta/edición que ya tenía, sin ampliar permisos Supervisor.

### AC-10 — Visita y superficies críticas
Dada una visita editable o de lectura, cuando se recorre la UI reorganizada, entonces se conservan pasos, campos, validación, acciones permitidas, evidencia y documento cerrado. Si se toca Piezas/fotos/firmas/confirmación, la verificación cubre sus invariantes y recuperación existentes; mover un control no puede habilitar guardado, cantidades, firma o cierre inválidos. Admin no adquiere edición de visita.

### AC-11 — Mecánico
Dada la sesión Mecánico, cuando se abre Mi trabajo, cambia cola/tipo, consulta detalle/historial y cierra, entonces la identidad visual es coherente con Supervisor y mantiene su tarea/capacidades propias, foco y lectura/acciones actuales. No recibe sidebar o destinos Supervisor por reutilizar estilos/componentes.

### AC-12 — Estados y recuperación
Dado loading, vacío inicial, cero coincidencias, error/lectura parcial o guardado existente, cuando aparece el estado, entonces cumple Failure Behavior, distingue causas y mantiene recuperación/controles seguros. Tras reintentar no pierde datos válidos que el flujo conservaba; no redefine semántica de guardado parcial o reintento del dominio.

### AC-13 — Teclado, foco y tacto
Dado teclado o pantalla táctil, cuando se recorre la vista, rail y overlays afectados, entonces controles tienen nombres y estado accesibles, orden lógico, foco visible y targets44px móvil. Al cancelar/cerrar se recupera un foco válido, sin trampas no previstas ni información necesaria disponible solo por hover.

### AC-14 — Portales y motion
Dado un overlay/plegado/transición afectado, cuando abre, cierra, se revierte o cambia viewport, entonces conserva tokens, scroll, foco y controles sin recorte. Motion funcional usa150–250ms y comunica estado junto a otra señal; con prefers-reduced-motion se elimina. No hay espera por animación para escribir/filtrar ni entradas nuevas de página.

### AC-15 — Navegación y superficies excluidas
Dados módulos y roles fuera del corte, cuando se usan componentes compartidos o se cambia viewport, entonces conservan su acceso/presentación vigente. No reaparece Mantenimiento vencido global; Inventario conserva Refacciones en Catálogo y su navegación desktop/móvil; fichas/stepper no se convierten en menús globales. Login/Logística/CHECK enfocado y otros módulos no se rediseñan.

### AC-16 — Migración de estilos
Dado un componente dentro del EWO, cuando se migra su presentación, entonces usa tokens/primitivas aprobados y retira las reglas superadas y literales equivalentes del alcance tras comprobar paridad. El diff no resuelve cada pantalla añadiendo otra capa general de overrides, ni borra estilos ajenos o incorpora dark mode/dependencias nuevas.

### AC-17 — Límites de la referencia
Dada una propuesta basada en Stitch, cuando se revisa su contenido, entonces su matriz conservar/adaptar/excluir distingue decisiones visuales de funciones/datos no autorizados. No aparecen endpoints, métricas, estados o información inventada por copiar el ejemplo.

### AC-18 — Gate y evidencia de aceptación
Dado cada corte, cuando se propone aceptarlo, entonces dispone de SPEC/UX/EWO aprobados correspondientes, dirección Operate previa a JSX, interacción verificada, better-ui/correcciones, proof-ui click-through CDP sin Playwright, capturas desktop/móvil por rol e inspección independiente ux-auditor. Lint/build y pruebas apropiadas tienen resultados PASS/FAIL/SKIPPED; pendientes y límites son explícitos. No quedan HIGH aplicables sin resolver; aceptación humana e integración/despliegue requieren su autorización correspondiente.

## Dependencies / Related ADRs

[ADR-003](../adr/003-shadcn-tailwind.md), [DESIGN_SYSTEM](../design/DESIGN_SYSTEM.md), [navegación de módulos](../design-system/ux-sidebar-module-navigation-v1.md), [WORKFLOW](../WORKFLOW.md), [testing strategy](../testing/TESTING_STRATEGY.md), [reglas externas](../design/EXTERNAL_SKILLS.md), plan/UX enlazados y especificaciones funcionales existentes de la superficie tocada. Piezas/stock/guardado mantienen sus fuentes; [SPEC-INV-ALERT-001](SPEC-INV-ALERT-001.md) solo aplica como regresión si el editor compartido es afectado, sin meterlo en alcance de rediseño.

No se requiere ADR nuevo: no cambia arquitectura ni ownership. Si diseño exige otro proceso, información o permiso, volver a shaping antes de alterar esta SPEC.

## Open Questions / Design review

Sin preguntas materiales abiertas para los cortes EWO-052/053. La orientación de Órdenes fue confirmada por el propietario; las composiciones concretas de todas las superficies del alcance se registraron en UX antes de JSX y se revisaron documentalmente por ux-auditor. La revisión de render y evidencia de cada corte no equivale a aceptación humana final. Una modificación funcional o ampliación posterior vuelve a shaping; nuevos layouts fuera de esas composiciones requieren su definición/aprobación propia.

## Traceability and impact

PRD no aplica: evolución de presentación sin proceso/capacidad nuevos. Intención: plan GrillMe y respuestas confirmadas de profundidad/densidad. Esta SPEC002 introduce recomposición; SPEC001/EWO051 conservan su alcance y evidencia de primera pasada de estilo, no se reescriben como prueba del nuevo diseño.

Fuentes técnicas: `web/src/components/AppShell.tsx`, `WorkspaceSidebar.tsx`, `InventorySectionMenu.tsx`, `web/src/app/globals.css`, `web/src/app/ordenes/page.tsx`, `web/src/components/UnidadesCatalogo.tsx`, `HubIdentityHeader.tsx`, `HubFichaNav.tsx`, `web/src/app/unidades/[id]/page.tsx`, `web/src/app/unidades/[id]/visitas/[visitaId]/page.tsx` y componentes de pasos, `web/src/app/mi-trabajo/page.tsx`. Son superficies candidatas, no autorización para editarlas todas en un corte.

## AC-to-test plan

Todo lo siguiente está **PLANNED**, sin nueva ejecución ni evidencia de PASS. El EWO del corte seleccionará AC aplicables y justificará N/A; los resultados futuros viven en su archivo de evidencia, no en esta tabla.

| AC | Escenario positivo / negativo | Verificación prevista | Evidencia futura |
| --- | --- | --- | --- |
| AC-01 | Base publicada/local y alcance real | Inspección de rutas/roles y matriz baseline | EWO del corte |
| AC-02 | Composición actual/propuesta con estado idéntico | Láminas comparativas desktop/móvil + revisión UX | EWO del corte |
| AC-03 | Colores/tipo/contraste, control disabled | Estilos calculados y contraste | EWO del corte |
| AC-04 | Acción contextual frente a Nueva orden, filtro/alerta | Click-through y semántica/selección renderizada | EWO del corte |
| AC-05 | Viewports, zoom, altura corta y contenido largo |1440/1024/800/390, smoke320 y scroll | EWO del corte |
| AC-06 | Patrón compartido y variante necesaria | Especímenes, diff y comparación renderizada | EWO del corte |
| AC-07 | Roles consulta/edición y sesión sin permiso | Matriz de paridad + pruebas apropiadas existentes; límites fixture explícitos | EWO del corte |
| AC-08 | Buscar/filtrar/reset/seleccionar/volver, parcial | CDP desde role picker, URL/historial y recuperación | EWO del corte |
| AC-09 | Sin foto, retorno filtrado, ficha/Mantenimiento/Historial | CDP Sup/Admin desktop/móvil | EWO del corte |
| AC-10 | Borrador/lectura, inválido/disabled y recuperación | Recorrido pasos y pruebas existentes del comportamiento afectado | EWO del corte |
| AC-11 | Mecánico cola/detalle/cierre/historial | CDP con rol real y recuperación de foco | EWO del corte |
| AC-12 | Loading/vacío/error/parcial/reintentar | Fixture descartable para UI; pruebas apropiadas si cambia interacción | EWO del corte |
| AC-13 | Tab/Enter/Escape, rail, foco y touch | Interacción y geometría de targets | EWO del corte |
| AC-14 | Overlay/resize/reduced motion | Observación CDP dinámica y tokens portaled | EWO del corte |
| AC-15 | Excluidos y navegación Inventario | Smoke de rutas/roles afectados por componentes compartidos | EWO del corte |
| AC-16 | CSS superado/literales, diff ajeno | Inspección de diff, lint/build y regresión visual | EWO del corte |
| AC-17 | Referencia con capacidad o dato inexistente | Matriz conservar/adaptar/excluir y fuente de datos | EWO del corte |
| AC-18 | Gate completo o verificación omitida | Registro de comandos, PNG y auditoría independiente | EWO del corte |

## Risks and assumptions

Riesgos: composición que oculte condiciones/datos, ampliación accidental de permisos, especificidad CSS, portales sin tokens, barra/pie que tape controles y scopes que alteren rutas ajenas. Mitigación: baseline, componentes incrementales, matrices por rol, diseño de estados antes de JSX y validación del corte. No prometer semejanza de píxeles, usabilidad o rendimiento medidos sin evidencia. Referencias Stitch conservan carácter de material externo.

## Autorización posterior de ejecución — Órdenes

El propietario indicó «Construyelo» y confirmó conservar la orientación de Órdenes, dándole otra pasada con el nuevo design system. Queda aprobado el primer corte delimitado en [EWO-052](../engineering-work-orders/EWO-052.md) y la sección concreta de [UX](../design-system/ux-mantenimiento-composicion-stitch-v1.md#corte-aprobado--órdenes-ewo-052). La restricción documental inicial queda sustituida solo para ese corte. Composiciones de otras etapas siguen Proposed hasta concretarse; no se eleva toda la SPEC a Approved con sus propuestas aún abiertas. Sin permiso de push/despliegue.

## Autorización posterior de cortes restantes

La petición «Construyelo» sobre el plan también autoriza continuar, después de Órdenes, con los cortes existentes de Unidades/ficha, visita y Mecánico. [EWO-053](../engineering-work-orders/EWO-053.md) y la [composición concreta053](../design-system/ux-mantenimiento-composicion-stitch-v1.md#cortes-aprobados--unidades-visita-y-mecánico-ewo-053) delimitan esa ejecución sin nuevos procesos/funciones. Las composiciones allí concretadas quedan dentro del alcance autorizado; revisiones y pruebas del gate siguen obligatorias. No autoriza push/despliegue ni módulos excluidos.
