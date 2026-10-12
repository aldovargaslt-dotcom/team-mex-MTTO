# Backlog por etapas, decisiones y condiciones de cierre

**Propuesta revisable, sin implementación autorizada.** Evidencia y límites en informe/ejecución/hallazgos preceden este backlog. Estimaciones en días-persona para alguien familiarizado con proyecto, confianza **baja**; son rangos por componentes inspeccionados, no capacidad/fecha/presupuesto acordados. No reducen severidad. Incluyen verificación pertinente, excluyen espera de usuarios, despliegues/migraciones y reparación de datos no diagnosticada.

## Etapa 0 — estado de validación y dependencias restantes

| ID / estado | Trabajo / dependencia | Esfuerzo restante orientativo | Criterio de salida |
|---|---|---|---|
| B00a completado | Plan leído/ref fijada/contraste E44 | Realizado, sin tiempo humano inventado | Fuente separada de producto, alcance rector documentado |
| B00b completado con límite | Instancia/acceso/API pública y fuente declarada por usuario E46/E96 | Atestación técnica de runtime independiente si se requiere: por acordar | Baseline declarado registrado; no afirmar SHA runtime verificado independientemente |
| B01 parcial | Responsabilidades reales, roles puros, umbrales y H09; personas de mantenimiento/producto y cuentas puras | 0.5–1d + disponibilidad | Matriz aprobada distingue código/runtime/UI/target; ninguna atribución por nombre de rol |
| B02 parcial | Acceso y operaciones nuevos fixtures autorizados, unidad/SKU/visitas ya preparados | Casos representativos adicionales 0.25–0.5d + acceso | No modificar datos previos; perfiles puros, aviso nuevo, conflicto/error escritura/cámara propios |
| B03 parcial | Wizard completo y trazabilidad propia ejecutados; faltan captura embebida completa, borrado/cancelación, recuperación/concurrencia/avisos | 0.5–1.5d según casos habilitados | Completar o disponer cada estado pendiente con evidencia; no contar lectura/captura de error como éxito |
| B04 pendiente | Línea base con mecánicos/supervisores, tareas y dispositivos reales | 1–2d preparación/análisis + sesiones por acordar | Resultado/ayuda/error/recuperación/comprensión/trazabilidad/tiempo por participante; sin umbral poblacional inventado |

No hay bloqueo de login ni plan ausente vigente. Usuarios, roles puros, casos y significado de requisitos permanecen abiertos. Ninguna dependencia autoriza seed, migración, nuevo permiso o scheduler CHECK.

## Primer sprint posterior — mantenimiento actual

| ID / propuesta | Evidencia / tarea / prioridad | Dependencias | Esfuerzo orientativo / criterio verificable |
|---|---|---|---|
| B10 Disponibilidad fiel, incluidos datos secundarios | H01, F01/F03/F05; P1 | Contrato carga/error/parcial, casos E148/E153 y prueba de regresión | 1–2d; fallo no imprime cero/No hay, catálogo cargando no afirma Sin piezas; datos/vacío genuino correctos |
| B11 Legibilidad de Inicio | H02/F02; P1 | Patrón fila normal/parcial observado | 0.25–0.5d; texto usa su región, mantiene filas normales en tamaños previstos/Roboto |
| B12 Recuperación de lecturas con contexto | H03/F01–F05; P2, puede integrarse con B10 si necesario | B10, datos/error/recuperación conocidos | 1–2d; reintento→éxito conservando filtro/selección, sin repetir escritura |
| B13 Contraste CTA compartido | H04/F01/F03/F04; P1 | Estados/tokens actuales, E29/E150 | 0.5–1d; texto normal ≥4.5:1 y foco/hover/disabled apropiados, navy/naranja/Roboto conservados |
| B14 Retorno de foco al cerrar overlay | H05/F07; P2 | Radix y disparadores en ambos layouts | 0.5–1d; Escape/Cancelar/Cerrar restauran foco visible, trap funciona |
| B15 Navegación acorde a capacidad actual | H06/F06; P2 | B01/rol puro, sin nuevo permiso | 0.5–1d; Mecánico no recibe destino accionable incompatible; copy/permisos/retorno coherentes |
| B16a Cierre con firmas accesibles | H12/S07/F04/F07; S3/P1 | D-A04, requisito/vía equivalente aprobados, lector/teclado | Diagnóstico/decisión 0.5–1d; implementación candidata 2–4d después de acuerdo. Sólo teclado permite aportar/revisar/corregir ambas firmas y cerrar según reglas; tabindex solo insuficiente |
| B16b Vacío contextual y recuperación del filtro | H10/S03/F01; P1 | Filtro/colas existentes | 0.5–1d; cero coincidencias explica filtro, quitarlo recupera borradores y no promueve duplicado |
| B16c Semántica de comprobante | H14/S09/F03; P2 | D-A08: recepción/evidencia y recuperación | Diagnóstico 0.25–0.5d; copy/confirmación 0.5–1d después de decisión. Estado/acción/stock describen mismo hecho. Nueva capacidad de adjunto posterior, si requerida, por estimar aparte |
| B16d Jerarquía de acciones de fila | H15/S09/P15; P2 | Variantes Button actuales y B13 | 0.25–0.5d; no varios primarios sólidos por vista, acciones visibles/operables/contrastadas |
| B17a Diagnosticar relaciones 404 y presentar su disponibilidad | H11/S09/F03; P1 investigación | Responsable del dato/entorno, IDs E96, respuesta real | Diagnóstico 0.5–1d; presentación/reparación por estimar según causa. Relación válida llega a origen; inexistente/restringida/fallida se explica, sin restaurar historia inventada |
| B17b Aclarar base de Último servicio | H13/P07/F05; P2 | D-A09 y fuente de cálculo vigente | Validación 0.25–0.5d; cambio final por estimar. Se reconoce tipo/referencia usada sin cambiar umbral/regla silenciosamente |
| B17c Trazabilidad/representación de preguntas soportadas | A01/A03/A05/A06; condicionado al objetivo del sprint | Fuente/definición/UOM/rango/exclusiones/frescura/detalle, capacidad del equipo | Por estimar después del acuerdo de alcance; no nuevo gráfico obligatorio. Agregado reconcilia y permite origen; datos históricos nuevos y permisos aparte |

El paquete original B10–B15 suma **3.75–7.5 días-persona**; sigue siendo un subconjunto, no todo el sprint. Núcleo candidato de corrección **B10+B11+B13+B16a implementación+B16b = 4.25–8.5 días-persona**, más diagnóstico/decisión de firmas 0.5–1d. Son alternativas de composición que comparten B10/B11/B13: **no sumar ambos paquetes**. No incluye investigación de 404, usuarios ni ramas restantes. Confirmar capacidad y consecuencia por tarea antes de comprometer sprint; si H12 exige capacidad nueva en vez de vía equivalente al requisito actual, decidir esa separación explícitamente antes de prometer cierre.

Orden sugerido: definir criterio accesible de firma y causa/alcance de 404; corregir fidelidad/Inicio/contraste/filtro; integrar recovery/foco/rol según recorrido y capacidad; corregir jerarquía/copy sustentados. El primer sprint mejora encontrar→reanudar→capturar→revisar→cerrar y reconstruir mantenimiento actual. No incorporar CHECK, nuevas asignaciones, captura histórica, costos o reglas analíticas por defecto.

## Etapas posteriores y dependencias

| Etapa | Trabajo | Dependencias / esfuerzo |
|---|---|---|
| Reevaluación de operación | Pruebas con usuarios antes/después, roles puros, móvil/teclado/lector, errores y ramas restantes | B01–B04, cambios autorizados; 1–2d preparación/análisis + sesiones. No sustituir humanos por experto |
| Consolidar design kit | Contratos de estados, fila, acción, foco, rol, relación/evidencia; variantes y semántica tabs/filtros | Hallazgos contrastados, D-A05; 1–2d documentación/diagnóstico, ejecución por estimar |
| Carga/skeleton/transición/animación diferida | Oportunidades por componente, H07, reduced-motion, estabilidad/anuncios | Medición de espera/CLS y criterios locales; diagnóstico 1–2d si se autoriza, implementación por estimar. No añadir demora ni animar todo |
| Análisis posterior | Disponer preguntas/carencias y decidir fuentes/historia; B17c puede entrar antes sólo si soportado y cabe | Responsable del dato/producto; 1–2d diagnóstico, desarrollo no estimable sin contrato |
| Capacidades nuevas, carril separado | MECANICO/CHECK completos, asignación/claim/scheduler/storage/permisos, tiempos físicos/costos/historia | Decisiones/entorno propios; sin estimación de ejecución ni autorización por esta auditoría |
| Siguiente módulo | Auditoría de Logística | Después de mantenimiento profundo; baseline, roles/tareas/casos/dispositivos específicos. No parte de cobertura actual |

## Decisiones pendientes de producto

| ID / pregunta | Evidencia / opciones a contrastar | Responsable por asignar / condición de decisión |
|---|---|---|
| D-A01 ¿Qué hace Mecánico hoy y quién registra trabajo? | Cola CHECK vacía, permiso legacy de Supervisor; entrevistar/observar turno. No atribuir aprobación/cierre por nombre | Mantenimiento+producto con ambos perfiles; tareas/responsabilidades acordadas y cuentas puras |
| D-A02 ¿Qué versión/casos son evaluación actual? | Dominio/fuente declarados y autorización de fixtures **resueltos**; representatividad/cuentas/avisos/concurrencia pendientes | Técnico+producto; confirmar runtime si necesario, disponer casos nuevos sin tocar previos |
| D-A03 ¿Quién administra umbrales? | README vs decorator; responsabilidad y permiso puro no probados | Producto+mantenimiento; resolver descripción actual, cambios de permiso aparte |
| D-A04 ¿Qué significa firma y cómo se aporta con acceso equivalente? | H12 y requisitos actuales; imagen de trazo no identifica humano automáticamente | Producto+mantenimiento+UX; preservar requisito, definir vía accesible y validarla, sin sustituir por identidad sin acuerdo |
| D-A05 ¿Colas son navegación o filtro? | Selección con datos/H08; probar tarea/retorno/teclado | Producto+UX; función antes de uniformar kit |
| D-A06 ¿Qué pregunta cambia una decisión y qué fuente basta? | Mapa A01–A12 y contratos; historia sintética/404/fuentes físicas faltantes | Dueño de datos+producto+mantenimiento; UOM/rango/zona/exclusiones/detalle/criterio sin KPI inventado |
| D-A07 ¿Cómo expresar carga/motion ya acordados? | Preferencia diferida resuelta por plan; falta latencia/CLS, reduce incumple | UX+sistema visual; medir y especificar etapa futura, no reconfirmar preferencia ni bloquear por Taste |
| D-A08 ¿RECIBIDA expresa cierre documental o recepción y qué evidencia se necesita después? | H14 cierra sin ticket; stock intacto; adjunto antes persistente, después invisible | Producto+inventario+mantenimiento; definir estado/acción/evidencia opcional y mecanismo de recuperación, sin entrada automática inferida |
| D-A09 ¿Cómo explicar el último cierre usado bajo Servicio preventivo? | H13 incluye último correctivo; regla no declarada errónea | Producto+mantenimiento; etiqueta/relación trazable coherentes con cálculo, regla nueva aparte |

No se reabren decisiones CHECK R01–R05/D01–D14 ya registradas. Responsables nominales, participantes, plazos, demoras tolerables y umbrales de éxito UX no están asignados por esta auditoría.

## Condiciones de cierre separadas

**Entrega documental:** recorridos accesibles ejecutados, evidencia/fixtures/limitaciones y entregables verificables; no aceptación de producto. Este encargo termina sin implementación.

**Evaluación de campo de primera etapa:** confirmar responsabilidades/tareas/dispositivos con personas, cuentas puras y permisos, cubrir/disponer estados pendientes con casos propios, explicar relaciones 404 y límites de historia, acordar prioridades/criterios y realizar línea base con usuarios/accesibilidad. Si se difiere alguna prueba, conservar alcance parcial explícito; no llamar a eso validación humana.

**Mejora posterior de mantenimiento:** cambios autorizados aparte, resultado correcto/persistido por tarea, cierre accesible según requisito acordado, comprensión/recuperación/trazabilidad comprobadas, criterios funcionales/UX acordados desde línea base y reevaluación con usuarios. No bloqueos/errores críticos conocidos en recorridos prioritarios sin disposición explícita. Build verde, screenshot/login, rol en código, GET o experto favorable no bastan. Motion/capacidades nuevas/historia/Logística siguen sus etapas propias.

Siguiente paso de producto: asignar responsables para firma/acceso, 404 y comprobantes, confirmar tareas con ambos perfiles y seleccionar capacidad del primer sprint sobre este backlog concreto. No hace falta volver a pedir credenciales ni autorización para las pruebas nuevas ya ejecutadas.
