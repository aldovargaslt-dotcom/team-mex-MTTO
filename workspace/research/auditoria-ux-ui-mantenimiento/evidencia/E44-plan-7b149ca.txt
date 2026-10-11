# Plan de auditoría y mejora UX/UI — Team Mex MTTO

Fecha: 2026-10-10.

Estado: dirección y alcance acordados con el usuario mediante GrillMe; preparación operativa pendiente. Este documento planifica la auditoría y la implementación posterior. No es una SPEC funcional, un ADR ni un Engineering Work Order y no autoriza ejecución de código, migraciones o rediseños.

Evidencia disponible: conversación y lectura documental. No se ha ejecutado la aplicación, observado sus pantallas actuales ni realizado pruebas con usuarios. Los recorridos siguientes son candidatos documentados que deben comprobarse en la versión seleccionada.

## 1. Objetivo y condiciones de éxito

Que cada rol, con su conocimiento del dominio y capacitación habitual, pueda interpretar la información relevante, reconocer qué necesita atención y por qué, descubrir y completar sus tareas, confirmar sus resultados y reconstruir las operaciones que los explican.

La unidad de evaluación será **rol + tarea + recorrido + escenario**. Los hallazgos se vincularán tanto a pantallas concretas como al flujo completo.

### Éxito de la auditoría

- Existe un inventario de pantallas, roles, flujos y estados, con cobertura explícita.
- Cada combinación prevista queda marcada como observada, pendiente, no accesible o no aplicable con justificación.
- Cada hallazgo tiene evidencia, impacto, confianza, recomendación, prioridad y criterio verificable.
- Se distinguen correcciones, hipótesis pendientes y nuevas decisiones de producto.
- Se entrega un mapa de problemas compartidos y un backlog por etapas y dependencias.
- Los límites de evidencia y las verificaciones omitidas quedan visibles.

### Éxito de la mejora posterior

Por tarea se registrarán: resultado correcto y persistido, comprensión del estado y resultado, ayuda necesaria, errores y recuperación, reconstrucción de registros y tiempo de ejecución. El tiempo es secundario frente a corrección y comprensión.

Antes de verificar correcciones, se fijarán criterios y umbrales por tarea usando la línea base y las consecuencias operativas. No se inventan porcentajes de éxito, tiempos aceptables ni SLAs en este documento.

Mantenimiento podrá cerrarse cuando los recorridos prioritarios actuales cumplan sus criterios funcionales y UX, se hayan reevaluado con usuarios y no queden bloqueos ni errores críticos conocidos en ellos. Los problemas residuales deberán tener disposición explícita. Una auditoría terminada no equivale a una mejora verificada.

## 2. Alcance y secuencia

### Cobertura de toda la aplicación

Inventariar vistas y recorridos de los dominios existentes, controles compartidos y adaptación entre dispositivos. La profundidad será gradual; revisar una pantalla no acredita todos sus estados o flujos.

Fijar versión/commit, entorno, permisos, roles efectivos, datos, navegador y viewport. Distinguir documentación, código disponible y capacidad realmente accesible. Las propuestas CHECK u otros objetivos futuros se registrarán aparte; su existencia documental no demuestra despliegue ni habilita su implementación.

### Primera etapa profunda: mantenimiento

Perfiles iniciales acordados: **mecánico** y **supervisor de mantenimiento**. Son perfiles operativos para organizar la auditoría; no se presume que sus nombres coincidan con roles, permisos o capacidades disponibles en runtime. Confirmar las tareas y responsabilidades reales de cada uno, sin asignar aprobación, cierre u otras atribuciones por inferencia.

La documentación describe parte de las capacidades de MECANICO/CHECK como objetivo futuro. La existencia de un rol en código no acredita un flujo usable. Para mecánico, observar las capacidades actualmente accesibles y registrar las carencias; mantener las propuestas futuras en un registro separado, sin incorporarlas automáticamente al primer sprint. El supervisor corresponde al perfil operativo documentado como SUPERVISOR, sujeto a comprobación de sus permisos efectivos.

Recorridos candidatos del módulo, cuya distribución entre los dos perfiles debe confirmarse:

1. Identificar una necesidad de mantenimiento y comprender su origen.
2. Consultar una unidad y encontrar la acción pertinente.
3. Crear o retomar una visita/WO, registrar datos, trabajos, consumos y evidencia según las reglas actuales.
4. Completar el cierre, comprender su resultado y comprobar persistencia.
5. Consultar una visita cerrada y reconstruir trabajos, piezas y evidencia relacionados.
6. Interpretar información de salud/mantenimiento disponible, manteniendo separados los conceptos administrativos, de salud y de operación.

Inventario entra en esta etapa donde sea necesario para explicar o registrar consumos asociados a mantenimiento. Esto no convierte su módulo completo en alcance del primer sprint.

**Límite acordado del primer sprint posterior:** completar y mejorar los recorridos prioritarios actuales de mantenimiento. Incorporar trazabilidad y gráficos sustentados por datos existentes cuando su esfuerzo encaje. Nuevas capacidades de captura histórica o análisis se planifican aparte. Si una carencia impide una tarea prioritaria, resolver explícitamente su alcance antes de comprometer el cierre.

### Segunda etapa profunda: logística

Evaluar registro de movimientos/salida/regreso, situación de unidades, operaciones sin regreso registrado e investigación de sus historiales. Confirmar rutas y permisos en runtime, sin asumir que propuestas de navegación ya están desplegadas.

La profundización de inventario y restantes dominios se ordenará posteriormente según impacto, frecuencia y dependencias.

### Dispositivos

Revisar adaptación básica en desktop y móvil en toda la cobertura. Probar recorridos completos en los dispositivos donde se espere realizar la tarea; confirmar este uso con usuarios. Registrar teclado, foco, nombres accesibles, contraste, ampliación, tamaños de interacción y lectura sin depender solo del color. Estas comprobaciones no equivalen a una certificación integral de accesibilidad.

## 3. Metodología y alternativas

| Método | Qué aporta | Límite |
|---|---|---|
| Heurísticas de Nielsen | Claridad, consistencia, control, estados y prevención/recuperación de errores | Juicio experto; no demuestra comportamiento del usuario |
| Recorrido cognitivo | Descubrimiento de acciones y comprensión de sus resultados | Depende del objetivo y conocimientos atribuidos al rol |
| Evaluación de información y medición | Disponibilidad, relaciones, historia, definiciones y fuentes | Existencia de datos no garantiza calidad, utilidad o comprensión |
| Verificación funcional | Reglas, permisos, persistencia y transiciones | Funcionamiento correcto no demuestra buena UX |
| Pruebas con usuarios | Comprensión, ejecución, errores y recuperación observados | Una muestra pequeña no permite estimar prevalencia poblacional |

Alternativas: una auditoría solo visual omite tareas, reglas y datos; un benchmarking ayuda a explorar patrones pero no acredita adecuación; analítica de uso existente y fiable puede orientar exposición y abandono, pero no explica sus causas por sí sola. No se presupone instrumentación disponible.

Separar los tres pases: revisión experta, verificación funcional y observación con usuarios. Un screenshot, una prueba de API o una opinión estética no sustituye los otros pases. Los mecanismos de verificación técnica y Visual QA del repositorio se aplicarán cuando corresponda, sin sustituir pruebas con usuarios.

## 4. Dimensiones y escenarios

| Dimensión | Pregunta de evaluación |
|---|---|
| Comprensión | ¿Se identifica qué se está viendo, qué significan los datos y qué limita su interpretación? |
| Atención | ¿Se reconoce qué requiere atención y por qué, sin prioridades inventadas? |
| Acción | ¿Se encuentra la acción, se completa la tarea y se entiende su resultado? |
| Análisis | ¿Se puede investigar un caso y reconstruir los registros que lo explican? |
| Medición | ¿Las preguntas tienen fuentes, periodos y definiciones suficientes y fiables? |
| Consistencia y accesibilidad | ¿Los patrones funcionan de forma predecible entre vistas, estados y dispositivos? |

Las dimensiones son etiquetas: un problema tendrá un único registro con múltiples consecuencias, sin duplicación por dimensión.

Preparar casos normales, pendientes, históricos, vacíos y errores. Añadir, según pertinencia, carga, cancelación, regreso a pasos previos, validación, permisos insuficientes, recuperación y persistencia. Comprobar diferencias entre vacío real, filtro sin resultados, falta de acceso, carga y fallo.

## 5. Trazabilidad, análisis y gráficos

### Preguntas iniciales por dominio

- Mantenimiento: ¿qué requiere atención y por qué?, ¿qué se hizo a una unidad, cuándo, con qué piezas y evidencia?, ¿qué explica su situación actual?
- Inventario: ¿qué movimientos explican las existencias?, ¿qué consumos o compras tienen información pendiente?, ¿cómo se relacionan con una visita?
- Logística: ¿qué salidas tienen regreso registrado?, ¿qué historial explica la situación de una unidad?

Confirmar fuentes y soporte actual para cada pregunta. No inventar costes, productividad, SLAs, reglas operativas ni indicadores que los datos no soporten.

### Trazabilidad como requisito transversal

Evaluar si se puede reconstruir qué ocurrió, sobre qué registro, cuándo y con qué origen, actor, motivo y respaldo, cuando esa información existe y corresponde al rol. Distinguir fecha del evento y del registro si es relevante. Comprobar relaciones con operaciones anteriores/posteriores, correcciones y cancelaciones donde existan.

Separar cuatro clases de gap: dato existente difícil de consultar; relación no disponible; información nunca capturada; acceso restringido. No prometer recuperación histórica de datos inexistentes ni exposición de registros fuera de permisos.

Criterio de tarea: ante un caso conocido, el usuario puede reconstruir la secuencia que explica su estado y localizar registros y evidencia relacionados sin orientación del evaluador. La información ausente o restringida debe indicarse sin sugerir una historia completa.

### Gráficos

Se consideran durante la auditoría, se especifican al planificar mejoras y se implementan posteriormente si sus fuentes lo permiten. Empezar por preguntas de mantenimiento y unidades.

Cada gráfico requiere: pregunta, decisión que informa, fuente, entidades, cálculo, unidad, estados, periodo, zona horaria pertinente, filtros, inclusiones/exclusiones, frescura y limitaciones. Debe permitir consultar los registros de origen, conservar contexto y reconciliar agregados con detalle.

Una distribución actual necesita estados definidos y actualización conocida; una evolución necesita historia de cambios. No inferir evolución desde un snapshot ni mezclar estados administrativos, de salud y logísticos. Evitar dobles conteos y definir el tratamiento de anulaciones, faltantes y cambios de estado antes de implementar.

## 6. Plantillas de auditoría

### Ficha de pantalla

```text
ID / nombre / ruta / versión:
Rol y permisos / dispositivo:
Propósito / tarea y decisión que facilita:
Datos y estado inicial / fuente del resultado esperado:
Jerarquía / acción principal / acciones de consulta:
Estados evaluados y pendientes:
Comprensión / atención / acción / análisis / medición / accesibilidad:
Entrada y salida hacia otros registros o vistas:
Evidencia enlazada:
Hallazgos asociados / dependencias:
Estado de cobertura y límites:
```

### Ficha de flujo

```text
ID / rol / tarea / escenario / dispositivo / versión:
Objetivo / precondiciones / datos / permisos:
Punto de entrada / pasos / pantallas / cambios de estado:
Resultado esperado y fuente / resultado real y persistencia:
Continuidad de unidad/registro/filtros / retorno y recuperación:
Trazabilidad entre registros / evidencia:
Ayuda, errores, comprensión y tiempo observado:
Hallazgos del flujo y de pantallas / puntos no verificados:
Criterios de aceptación y método de reevaluación:
```

### Registro de hallazgo

```text
ID / título:
Versión / rol / tarea / escenario / pantalla y flujo:
Pasos y evidencia / esperado versus observado:
Clasificación: visual | interacción | organización | datos/capacidad:
Dimensiones afectadas:
Impacto concreto / afectados / exposición y frecuencia conocidas:
Confianza: observado | reproducido | corroborado con usuarios | hipótesis:
Severidad / prioridad / justificación:
Recomendación / alternativas pertinentes:
Decisión de producto o validación pendiente:
Criterio verificable / método / evidencia de cierre requerida:
Patrón compartido / dependencias / esfuerzo estimado y confianza:
Responsable por asignar / estado / enlace a SPEC o backlog posterior:
```

Las plantillas son vacías: no representan pantallas o problemas ya observados.

## 7. Evidencia y priorización

Una captura acredita un estado visible. Una secuencia reproducible acredita comportamiento en sus condiciones. Una sesión acredita lo ocurrido a ese participante. Un antecedente documental o heurística fundamenta una hipótesis que debe contrastarse. Ausencia de observación no equivale a ausencia de problema.

| Severidad | Criterio |
|---|---|
| S4 crítica | Consecuencia operativa grave o pérdida/integridad de datos sustentada por evidencia |
| S3 alta | Bloquea una tarea prioritaria o produce resultado incorrecto con recuperación difícil |
| S2 media | Confusión, demora o retrabajo recuperables |
| S1 baja | Defecto localizado con impacto limitado |
| S0 observación | Preferencia u oportunidad sin impacto demostrado |

Prioridad separada de severidad: P0 atención inmediata por consecuencia crítica; P1 necesaria para cerrar recorridos prioritarios; P2 mejora posterior con impacto demostrado; P3 oportunidad diferida. Justificar según impacto, exposición, tarea y dependencias. Confianza baja en una consecuencia potencialmente grave prioriza investigación, sin convertir automáticamente la hipótesis en una solución.

El esfuerzo ayuda a secuenciar trabajos comparables; no reduce severidad. No sumar números ordinales para aparentar precisión. Estimar esfuerzo solo después de inspeccionar alcance y dependencias; registrar estimación y confianza. Al fijar el sprint, mapear tamaños pequeños/medianos/grandes al equipo y capacidad reales.

## 8. Referencias visuales y design kit

SAP/Fiori es referencia **visual, de componentes y de trazabilidad**, no un modelo predeterminado de flujos. Estudiar jerarquía, legibilidad, densidad, estados, tablas, filtros, fichas, historiales y navegación entre registros relacionados. Los flujos de Team Mex se definen por tareas, roles y reglas propias.

Fuentes candidatas: [SAP Fiori](https://experience.sap.com/fiori-design-web/), [Carbon](https://carbondesignsystem.com/) y [Material](https://m3.material.io/). Aún no se ha realizado un análisis de estas referencias para la aplicación. Registrar para cada ejemplo fuente, patrón, problema que aborda, adaptación y limitaciones.

Taste conectado queda como apoyo opcional de preferencias/referencias; el acceso fallido no bloquea el plan. No se confunde con tasteskill.dev ni se instala una dependencia alternativa. No se ha usado Taste.

Conservar azul marino, naranja, Roboto y componentes adecuados. La conservación de un componente no impide cuestionar su utilidad o accesibilidad. La preferencia SAP actual complementa la dirección documental existente; no reescribe silenciosamente briefs o decisiones previas. Las SPEC UX posteriores deberán reconciliar referencias y restricciones vigentes.

Compactar reduciendo contenido innecesario, no texto ni controles. En colas de alertas pueden bastar identidad, brief y acción si permiten decidir; fichas, formularios e historiales deben conservar detalle relevante.

Mapa compartido: agrupar hallazgos por navegación, jerarquía, acciones, estados, formularios, tablas, historiales, gráficos y adaptación. Cada patrón enlazará apariciones, variantes necesarias y criterio común. Resolver semántica, acciones, permisos y necesidades de detalle antes de consolidar componentes. Un kit uniforme no corrige por sí solo una organización confusa.

## 9. Carga, skeletons y movimiento

Preferencia transversal acordada, con implementación diferida. La falta de claridad de una carga puede tener prioridad alta por impacto; la mejora estética de movimiento no hereda esa prioridad.

| Situación | Patrón candidato |
|---|---|
| Carga inicial de página, ficha o listado | Skeleton acorde con la estructura y dimensiones esperadas |
| Refresco o cambio de filtros | Conservar contexto/contenido cuando sea válido y comunicar actualización |
| Guardado o acción | Progreso en el control, prevención de duplicación y resultado explícito |
| Panel o transición de vista | Movimiento breve que ayude a entender el cambio |
| Carga prolongada o fallo | Mensaje, recuperación y estado explícito; skeleton insuficiente |

Evaluar estabilidad de layout, rendimiento, foco, accesibilidad, anuncios de estado y movimiento reducido. No añadir animación a todo ni demoras artificiales. En la auditoría registrar oportunidades, componentes afectados, dependencias y esfuerzo por inspeccionar; no se asigna una estimación ficticia ahora.

## 10. Plan de ejecución y entregables

| Etapa | Trabajo | Entregable / condición de avance |
|---|---|---|
| A. Preparar | Seleccionar baseline, roles, dispositivos, escenarios, participantes y prioridades | Matriz de cobertura y tareas; incertidumbres explícitas |
| B. Auditar mantenimiento | Revisión experta y evaluación de información con evidencia | Fichas de pantalla/flujo, gaps y mapa de preguntas/datos |
| C. Contrastar | Verificación funcional y sesiones por perfil prioritario | Línea base; hallazgos corroborados o hipótesis; limitaciones |
| D. Consolidar | Severidad, prioridad, patrones, referencias y dependencias | Backlog dimensionado, mapa del kit y decisiones de producto |
| E. Especificar mejoras | Definir aceptación y alternativas por recorrido | SPEC/UX y artefactos exigidos por el repositorio para ejecución posterior |
| F. Implementar posteriormente | Bloqueos/errores, organización, trazabilidad soportada, patrones; gráficos cuando corresponda | Cambios autorizados y evidencia técnica/visual |
| G. Reevaluar | Repetir tareas y contrastar criterios, sin exigir la misma ruta si cambió | Cierre verificable de mantenimiento y problemas residuales |
| H. Continuar | Profundizar logística y después restantes dominios | Aplicar el mismo marco y reutilizar patrones probados |

Participantes iniciales de mantenimiento: mecánicos y supervisores de mantenimiento que realmente ejecutan las tareas, con experiencia y permisos pertinentes. Si un perfil no dispone de acceso o de un recorrido en la aplicación actual, registrar esa condición y contrastar sus necesidades sin presentar la entrevista como una prueba de un flujo existente. Sesiones breves con tareas expresadas como objetivos, sin indicar controles. Registrar intervención del evaluador, éxito parcial, errores, recuperación y explicación del resultado. Muestra inicial diagnóstica; ampliar si hay variaciones relevantes. No convertir sus resultados en porcentajes representativos de toda la población.

Datos reales anonimizados o casos representativos con origen conocido; los fixtures no prueban calidad de producción. Si no hay usuarios disponibles, revisión experta y funcional pueden avanzar, pero la validación de comprensión queda pendiente y el cierre UX no se afirma.

## 11. Decisiones nuevas y pendientes operativos

Abrir decisión de producto cuando falten datos/eventos, se requieran nuevos permisos, reglas, indicadores, conceptos o capacidades; cuando haya conflicto con SPEC/ADR; o cuando una corrección amplíe el alcance vigente. Registrar pregunta, evidencia, impacto, opciones y responsable. No crear automáticamente un dashboard, indicador, evento histórico ni regla.

Antes del trabajo de campo confirmar: versión utilizada, acceso de roles, tareas reales por dispositivo, participantes, disponibilidad de casos, plazos, consecuencias y demoras tolerables. Antes de comprometer el sprint confirmar: umbrales por tarea, esfuerzo, dependencias, capacidad y criterios de cierre.

La dirección está acordada; estos pendientes no se consideran resueltos por aceptación general de recomendaciones. No hay fecha de entrega, muestra, SLA ni esfuerzo comprometidos.

## 12. Fuentes y límites

- [AGENTS](../../AGENTS.md) e [ICM](../../ICM.md): alcance documental, rutas y condiciones de ejecución.
- [Producto](../../context/PRODUCT.md) y [Mantenimiento](../../domain/mantenimiento/CONTEXT.md): capacidades documentadas, límites y separación del objetivo CHECK.
- [Sistema de diseño](../../docs/design/README.md): especificación UX, patrones y verificación visual existentes.
- [Auditoría previa de Supervisor](../discovery/auditoria-supervisor-experiencia-v0.md): antecedente, no evidencia actual; sus observaciones deben reproducirse.
- Conversación de planificación con el usuario: objetivos, prioridades, SAP, trazabilidad, gráficos, Taste opcional y movimiento diferido.

Este plan no modifica fuentes de verdad de producto, decisiones arquitectónicas, componentes ni comportamiento. La auditoría deberá producir evidencia nueva antes de afirmar problemas o mejoras en la aplicación.
