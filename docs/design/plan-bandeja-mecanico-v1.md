# Plan de implementación — Bandeja del mecánico V1

**Estado:** Propuesto a partir de las auditorías de diff, código, UI/UX y diseño.
**Alcance:** navegación del mecánico, separación de Chequeos y Mantenimiento, tarjetas de trabajo, flujo CHECK hasta la firma y seguimiento posterior de las correctivas que genere.
**Fuentes:** referencias Stitch, [UX CHECK operativo](ux-check-operativo-v1.md), [contrato CHK-001](../contracts/CHK-001-contract.md), `DESIGN_SYSTEM.md` y `VISUAL_DIRECTION.md`.

## Objetivo

Dar al mecánico una bandeja móvil con navegación inferior y dos áreas de trabajo claramente distintas:

- **Chequeos:** ABC/checklist operativo antes de permitir la salida del chofer, con el flujo actual de cuatro pasos.
- **Mantenimiento:** órdenes preventivas/correctivas que deben programarse, anticiparse o atenderse, con estado, prioridad y acciones propias.

La UI presenta únicamente datos y acciones que la API autoriza. No crea conteos, horarios, anomalías ni estados ficticios para completar el diseño.

## Estado de partida

Ya están aplicadas en el working tree estas correcciones derivadas de la auditoría:

- La lista de mecánico limita CHECK a estados activos y excluye concluidos/cancelados.
- Un error de carga limpia la cola obsoleta y presenta una acción de reintento.
- El CHECK firmado reconstruye el resumen de hallazgos desde los datos persistidos.

Siguen pendientes los identificadores de correctivas en una sesión nueva, el diseño de navegación inferior, el read model accesible para el mecánico y los cambios de composición descritos abajo. Preservar los cambios existentes; no reiniciar ni reemplazar el diff anterior.

## Fase 0 — Cerrar contrato y decisiones de producto

Resolver antes de ampliar UI:

1. **Destinos de navegación:** confirmar rutas funcionales para *Mi trabajo, Escanear, Mantenimiento y Perfil*. No mostrar un destino como activo hasta que su pantalla o flujo exista.
2. **Mantenimiento para mecánicos:** existe `GET /mantenimiento-ordenes`, pero hoy el servicio autoriza SUPERVISOR/ADMIN_DIRECTIVO. Definir si MECANICO podrá consultarlo, con qué alcance de patio y qué acciones tendrá.
3. **Campos disponibles:** acordar fecha de vencimiento/próxima atención, prioridad, asignación, activo/unidad y CTA para una orden. Mostrar solo campos presentes en la fuente.
4. **Estados de CHECK:** definir visibilidad y acción para `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` y `CANCELLED`; terminales fuera de trabajo activo o en historial.
5. **Prioridad:** acordar el orden por campos de dominio (por ejemplo estado y fecha de salida/atención); evitar usar UUID como prioridad.
6. **Retorno por rol:** definir cómo vuelve un lector de Logística desde `/checks/[id]`; no asumir `/mi-trabajo` para todos los roles.
7. **Política de condición:** confirmar si un mecánico puede leer la condición de un CHECK elegible antes de reclamarlo. La auditoría lo registró como pregunta de política, no como fallo probado.
8. **Sistema visual:** elegir la guía prevalente para shell, color de interacción y CTA, resolviendo diferencias entre `DESIGN_SYSTEM.md`, `VISUAL_DIRECTION.md`, la spec CHECK y Stitch.

**Entregable:** contrato breve de navegación, roles, estados, campos y prioridad, con endpoints existentes y faltantes identificados.

## Fase 1 — Read models, permisos y robustez de API

1. Mantener fuentes separadas para `/checks` y `/mantenimiento-ordenes`, con autorización mecánico/facility definida en Fase 0.
2. Exponer para cada tarjeta solo identidad mínima de unidad y campos necesarios; evitar una petición `/unidades/:id` por tarjeta y no propagar VIN/foto a la bandeja.
3. Incluir progreso CHECK y resumen de anomalía solo si el dato puede derivarse de forma confiable y bajo el mismo scope autorizado.
4. Aplicar el filtro de estados activos a la cola de trabajo del mecánico; conservar vistas terminales para los roles/rutas que las necesiten.
5. Devolver conteos por categoría desde la misma fuente/scope que los elementos. Definir cursor y orden operativo.
6. Hacer que la falla de una fuente no oculte la otra; incluir estados de error/reintento independientes y evitar servir datos obsoletos como actuales.
7. Completar la lectura firmada para rehidratar resultado, hallazgos, correctivas generadas, evidencia y sello sin controles de edición.

**Dependencia:** decisiones de Fase 0. El endpoint de mantenimiento no debe abrirse a MECANICO hasta cerrar scope, autorización y datos visibles.

## Fase 2 — Shell responsive y barra inferior

1. Incorporar una bottom bar para las secciones aprobadas: *Mi trabajo, Escanear, Mantenimiento y Perfil*.
2. Mostrar icono, nombre accesible y sección activa; respetar foco, teclado, targets táctiles y safe area.
3. Mantener el CHECK como flujo enfocado: el header/stepper y footer del wizard no compiten con la navegación global. La barra inferior no debe tapar controles ni CTA.
4. Definir navegación de tablet/escritorio y mantener el shell apropiado para SUPERVISOR, LOGISTICA y ADMIN_DIRECTIVO.
5. Hacer que el retorno de CHECK respete rol y origen autorizado.

**Criterio:** todos los elementos visibles llevan a un destino funcional y autorizado; ninguna ruta se muestra como disponible si no existe.

## Fase 3 — Bandeja con dos colas independientes

1. Añadir selector/secciones de **Chequeos** y **Mantenimiento**, con contador real y estados loading, vacío y error propios.
2. La cola Chequeos contiene solo ABC pre-salida en scope del mecánico y conserva claim/start/continue según estado.
3. La cola Mantenimiento muestra órdenes reales programadas, anticipadas o asignadas conforme al contrato de Fase 0. No usa los cuatro pasos de CHECK.
4. La falla de mantenimiento no borra la lista de chequeos, ni viceversa.
5. Determinar si el selector vive en la bandeja o si cada trabajo tiene una ruta/tab propia, según rutas confirmadas en Fase 0.

## Fase 4 — Tarjetas y jerarquía visual

Crear variantes por significado/estado, compartiendo estructura visual donde corresponda:

- **CHECK en progreso:** unidad y placas, estado, folio legible, tiempo transcurrido, paso actual, anomalía resumida cuando exista y CTA *Continuar chequeo*.
- **CHECK asignado:** unidad, placas, folio, estado y CTA *Iniciar chequeo* solo para el actor autorizado.
- **CHECK pendiente/tomable:** tipo de ABC y contexto de salida/espera solo cuando esté disponible; CTA *Tomar chequeo* según permiso.
- **Mantenimiento:** unidad, tipo/motivo real, próxima fecha o vencimiento, prioridad/estado, asignación y acción propia de mantenimiento.
- **Terminales:** no se presentan como pendientes; si se requiere historial, usar un estado/sección de solo lectura.

Acortar los folios en pantalla manteniendo el valor completo accesible; usar una única acción primaria clara por tarjeta. El paso que muestra una tarjeta debe coincidir con el progreso guardado del wizard.

## Fase 5 — Composición desktop y refinamiento del wizard

1. Definir una bandeja desktop con uso intencional del espacio —lista con detalle o tabla—. Stitch no aporta una referencia desktop del mecánico; usar la UX spec y aprobar el patrón como diseño nuevo.
2. Ajustar Condición para hacer más visibles las decisiones normal/anomalía y los rangos asociados a PSI, respetando los campos y reglas funcionales existentes.
3. Evaluar opciones visibles para Hallazgos; conservar confirmación explícita si clasificar es una transacción guardada.
4. Ordenar Revisión con excepciones y dictamen primero, datos conformes resumidos y detalles desplegables.
5. Capturar evidencia agregada y firma completada antes de cerrar el diseño de esos estados.

## Fase 6 — Continuidad después de firmar un CHECK

Cubrir el paso de un hallazgo clasificado como trabajo requerido al flujo de mantenimiento, sin convertir una observación o algo corregido durante CHECK en una orden.

1. Confirmar en el contrato/API que firmar un CHECK con `REQUIRES_WORK` crea y vincula la orden correctiva de manera idempotente; la respuesta perdida/reintento no debe duplicarla.
2. Rehidratar el CHECK firmado con resultado, hallazgos, evidencia, sello y referencias de las órdenes realmente creadas.
3. Mostrar la relación desde ambos lados: el CHECK completado identifica su correctiva; la orden conserva la referencia al CHECK y al hallazgo de origen.
4. Definir estados y responsable de la correctiva: pendiente de programar, programada, asignada, en ejecución, terminada o cancelada, según los estados soportados por el dominio.
5. Establecer qué rol programa/asigna, cuál ejecuta y cómo regresa el resultado al historial de unidad/torre. Cada CTA debe ser válido para ese rol.
6. Mantener separadas observaciones, arreglos hechos durante CHECK y correctivas: solo hallazgos que requieren trabajo generan seguimiento correctivo.

**Entregable:** mapa de transición CHECK firmado → correctiva vinculada → programación/asignación → ejecución/cierre, con actor, fuente y referencia de auditoría para cada transición.

## Fase 7 — Verificación antes de liberar

### Preview de la rama

- Verificar shell, jerarquía, densidad y tarjetas con datos representativos.
- Capturar a 390×844 y 1440 px. En desktop, revisar el patrón aprobado aunque no exista una referencia Stitch equivalente.
- Comprobar que barra inferior y footer del wizard no se enciman y que el contenido final puede alcanzarse con scroll.

### Staging

- Validar datos/permisos reales de ambas colas, estados, conteos y acciones por rol.
- Recorrer claim, start, continuar, carga de evidencia, clasificación, revisión, firma y vínculo/seguimiento de una correctiva.
- Cubrir carga, vacío, error, reintento, CHECK concluido/cancelado y acceso denegado.
- Repetir revisión independiente de diff, código y UI/UX; comparar capturas con Stitch por vista y breakpoint.

No presentar la revisión visual como aprobada hasta resolver hallazgos P1/P2 y guardar capturas finales con estado/breakpoint identificados.

## Criterios de aceptación

### Funcionales y de datos

- Chequeos ABC y Mantenimiento tienen fuente, contador, estados y acciones claramente separados.
- Conteos y tarjetas corresponden al scope y al rol autenticado; no se fabrican datos.
- `COMPLETED` y `CANCELLED` no aparecen como trabajo accionable de la cola activa.
- Cada CTA corresponde al estado y a una autorización del servidor.
- Una falla parcial no oculta la otra cola ni deja contenido obsoleto como vigente.
- Un CHECK firmado se reabre como snapshot de solo lectura con dictamen, hallazgos, evidencia y correctivas que realmente consten en el servidor.
- Una correctiva generada queda ligada al CHECK y al hallazgo de origen; los reintentos no duplican órdenes y las transiciones posteriores respetan rol/estado.

### Visuales y responsive

- La bottom bar aparece en rutas funcionales del mecánico, indica selección y respeta safe area.
- El wizard conserva navegación enfocada y CTA fijo legible sin solapamiento.
- La tarjeta de CHECK en progreso muestra paso, tiempo y anomalía cuando esos datos existen.
- Mantenimiento se reconoce como trabajo programado/anticipado, no como otro checklist ABC.
- Móvil es escaneable a 390×844; desktop usa el espacio según un patrón aprobado y no deja la lista reducida a una esquina.
- Loading, vacío, error, pendiente, en progreso y terminal cuentan con capturas verificables.

## Orden de ejecución recomendado

1. Aprobar las decisiones de Fase 0.
2. Cerrar permisos/read model de las dos fuentes y rehidratación firmada (Fase 1).
3. Implementar shell y rutas (Fase 2).
4. Implementar las dos colas (Fase 3) y sus tarjetas (Fase 4).
5. Refinar escritorio y wizard (Fase 5).
6. Cerrar el ciclo de correctivas generadas por el CHECK (Fase 6).
7. Hacer preview, staging, revisiones independientes y corregir hallazgos (Fase 7).

## Trabajo paralelizable después de Fase 0

- **API/read model:** endpoints, scope, estados, contadores e identidad mínima.
- **Shell:** bottom bar y rutas/retorno por rol.
- **Diseño de tarjeta/bandeja:** variantes y composición responsive, con datos del contrato acordado.
- **Wizard CHECK:** rehidratación firmada y fidelidad de Condición/Hallazgos/Revisión.
- **Continuidad correctiva:** vínculo CHECK–hallazgo–orden y estados de planificación/ejecución, coordinado con los responsables de mantenimiento.

Evitar editar simultáneamente `AppShell.tsx` o `mi-trabajo/page.tsx` en más de un frente; asignar un responsable integrador para esos archivos.
