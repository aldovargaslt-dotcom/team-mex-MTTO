# Plan de trabajo propuesto — Órdenes + ficha de unidad v0

## Estado

**Shaping consolidado; no autoriza implementación por sí mismo.** Este documento convierte en una secuencia ejecutable las dos revisiones de experiencia aprobadas por producto el 2026-09-29:

1. **Órdenes como centro operativo:** crear una orden sin desviar al usuario al catálogo de Unidades y hacer evidentes las acciones de captura dentro de la orden.
2. **Ficha de unidad como expediente profundo:** una sola acción principal, secciones claras, lectura de mantenimiento con comparación Preventivo/Correctivo, historial narrativo y clickeable, y foto correctamente recortada.

Antes de cambiar código, el alcance debe convertirse en SPEC funcional + UX spec; la regla de un solo borrador por unidad y el contrato de creación deben resolverse en ADR. Después se emiten y aprueban los Engineering Work Orders correspondientes.

Este plan amplía, pero no sustituye, el revamp Supervisor ya documentado en [supervisor-revamp-implementation-plan-v0](supervisor-revamp-implementation-plan-v0.md). Inicio sigue siendo direccional y `/ordenes` sigue siendo el único panel de trabajo.

## Resultado esperado

El Supervisor puede iniciar una orden desde `/ordenes`, seleccionar una unidad activa, capturar sus datos iniciales y continuar el trabajo sin una escala innecesaria por `/unidades`. Si ya existe un borrador para la unidad, la interfaz lo lleva a ese borrador y nunca crea otro.

La ficha `/unidades/:id` funciona como expediente de la unidad: explica el estado actual, ofrece una sola acción contextual, separa datos, mantenimiento e historial, y permite comprender el comportamiento preventivo/correctivo y la cadencia entre servicios antes de abrir una orden concreta.

## Decisiones de producto ya confirmadas

- La etiqueta visible será **Preventivo**; el enum persistido conserva `PREDICTIVO`. No se migra el valor de backend.
- La comparación Preventivo/Correctivo usa **todo el historial cerrado** de la unidad, no un periodo parcial.
- Solo puede existir **un borrador por unidad**.
- Una foto mal encuadrada se **reemplaza y recorta nuevamente** con el editor 4:3 actual; no se agrega metadata de punto focal.
- La ficha sí incorpora una visualización comparativa. Esta decisión reemplaza únicamente el `Don’t: gráficas` del Corte 1 propuesto en `ux-consulta-conducta-cortes-v0`; no autoriza gráficas en `/inicio`, KPI cards ni dashboards adicionales.
- El historial de la ficha es exclusivamente de Mantenimiento. No mezcla Flota, patio, Logística ni chofer de patio.

## Fronteras de las dos superficies

| Superficie | Trabajo que resuelve | No debe convertirse en |
|---|---|---|
| `/ordenes` | Encontrar, crear, continuar y revisar órdenes | Catálogo de unidades, kanban, asignación de técnicos o dashboard de KPI |
| `/unidades/:id` | Comprender y configurar una unidad; revisar su mantenimiento e historial | Segundo wizard, timeline global entre módulos o tablero de Flota |
| Wizard de visita | Capturar y cerrar la orden | Expediente analítico de la unidad |

Los estados continúan siendo solamente `BORRADOR` y `CERRADO`. No se añaden Pausada, En progreso, Hecha, prioridad, SLA, vencimiento ni ownership individual.

## Dependencia crítica

```text
SPEC + UX + decisión ADR
          |
          v
Un borrador por unidad + creación atómica
          |
          +------------------------+
          |                        |
          v                        v
Crear desde Órdenes          Ficha de unidad
+ retorno al panel           + historial narrativo
          |                        |
          +-----------+------------+
                      v
            click-through + Visual QA
```

La regla de un borrador es el único bloqueo común. Una vez disponible su contrato, los dos frentes de UI pueden ejecutarse en cortes separados sin mezclar archivos ni criterios de aceptación.

## Fase 0 — Cerrar contratos y fuentes de verdad

### 0.1 SPEC funcional

Crear una SPEC nueva o una ampliación explícita de `SPEC-SUPERVISOR-EXPERIENCE-001` que vuelva canónicos los criterios candidatos de este plan. Debe definir:

- campos obligatorios al iniciar una orden: unidad, chofer, kilometraje y tipo;
- comportamiento exacto cuando la unidad ya tiene borrador;
- roles y estados de unidad que permiten crear;
- retorno a `/ordenes` con cola, filtros y orden seleccionada preservados;
- matriz de acción principal de la ficha por rol, estado de unidad y existencia de borrador;
- fuente y reglas de la comparación histórica.

### 0.2 UX spec

Crear una UX spec con dos pantallas y sus estados en 390, 1024 y 1440 px. Debe fijar copy, jerarquía, patrón dialog/sheet, interacción del historial, gráfico accesible, estados vacíos y comportamiento de la fotografía.

### 0.3 ADR de creación e invariante

Registrar una decisión de Mantenimiento para:

- hacer autoritativa en servidor la regla `0..1 BORRADOR` por unidad;
- auditar duplicados existentes antes de crear una restricción persistente;
- definir la estrategia de migración o resolución de duplicados, sin borrar datos en silencio;
- crear el borrador y persistir unidad + chofer + km + tipo como una sola operación lógica;
- definir una respuesta estable para la carrera de dos solicitudes sobre la misma unidad, incluyendo el identificador del borrador existente o un mecanismo equivalente especificado;
- mantener `SUPERVISOR` + unidad `ACTIVA` como requisito de creación.

La UI puede detectar anticipadamente un borrador para mejorar el flujo, pero la API debe proteger la carrera. La secuencia cliente `POST vacío` seguida de `PATCH` no cumple la atomicidad porque puede dejar borradores huérfanos.

## Fase 1 — Base de dominio y contrato API

1. Incorporar un DTO de creación con los datos iniciales definidos en la SPEC, reutilizando las validaciones existentes de chofer activo, kilometraje persistible y tipo de visita.
2. Ejecutar creación e invariante dentro de una transacción. La protección persistente debe ser compatible con PostgreSQL y con la estrategia de migraciones vigente del repositorio.
3. Responder de forma diferenciable cuando ya existe un borrador para que ambas superficies ofrezcan `Continuar orden` sin crear duplicados.
4. Conservar `PREDICTIVO`/`CORRECTIVO` en API y persistencia. Centralizar en web el mapeo de presentación `PREDICTIVO` → `Preventivo` para evitar que sobreviva `Predictivo` en vistas distintas.
5. Añadir pruebas de servicio y e2e para creación válida, unidad inactiva, chofer inactivo, kilometraje inválido, borrador existente y solicitudes concurrentes.
6. Caracterizar creación, edición, eliminación y cierre existentes para evitar regresiones en C1–C4 y en el outbox de `VisitaCerrada`.

No se requiere para v0 un endpoint analítico nuevo: `GET /unidades/:id/hub` ya entrega tipo, fecha de cierre, km, chofer, trabajos y piezas para construir comparación, cadencia y timeline en cliente.

## Fase 2 — Flujo contextual de creación en Órdenes

### Entrada y selección

1. Cambiar `+ Nueva orden` para abrir un dialog en escritorio y un sheet en móvil, sin navegar primero a `/unidades`.
2. Permitir buscar unidades activas por número interno, placas y tipo usando la lectura existente del catálogo.
3. Al seleccionar una unidad, mostrar identidad suficiente —foto/icono, número, placas, tipo y último km disponible— antes de confirmar.
4. Si la unidad ya tiene borrador, reemplazar el formulario por una explicación breve y la acción `Continuar orden`.

### Datos iniciales y confirmación

1. Capturar unidad, chofer, kilometraje y tipo en el mismo flujo.
2. Usar `Crear y continuar` como acción principal. Al completar, abrir el wizard en su primer paso pendiente y conservar un retorno validado a `/ordenes`.
3. Mantener el estado de la cola en URL: abiertas/cerradas, búsqueda, filtros y `orden` seleccionada. Back/forward y el regreso desde el wizard no deben reiniciar el panel.
4. Resolver loading, sin coincidencias, sin choferes activos, datos inválidos, borrador detectado, carrera con otro cliente y error de red.

### Captura en la ficha de orden

1. Reagrupar piezas y fotos bajo el encabezado operativo `Capturar en esta orden`.
2. Presentar `Agregar pieza` y `Subir foto` como botones `outline` o `secondary`, no como texto plano. Cada uno muestra icono, conteo/estado y affordance de apertura.
3. Cambiar `aria-pressed` por semántica de disclosure (`aria-expanded` + `aria-controls`) cuando la acción despliega un panel; mover el foco al contenido abierto y devolverlo al disparador al cerrar.
4. Comunicar límites y resultado cerca del control: piezas capturadas, `n de 8` fotos, guardado, error y máximo alcanzado.
5. Mantener cerradas las órdenes cerradas: las mismas secciones son lectura y no simulan controles editables.

## Fase 3 — Ficha de unidad como expediente

### Cabecera, acción y navegación

1. Renombrar el rail `Acciones` a `Secciones` y conservar solo **Resumen**, **Datos de unidad**, **Mantenimiento** e **Historial**.
2. En móvil, mantener visible la sección activa mediante auto-scroll de tabs o un selector compacto; ningún destino activo puede quedar fuera de pantalla.
3. Mostrar exactamente una acción principal según esta matriz:

| Contexto | Acción principal |
|---|---|
| Supervisor + borrador | `Continuar orden` |
| Supervisor + unidad activa sin borrador | `Nueva orden` |
| Admin | `Editar datos` |
| Unidad inactiva o sin permiso | Sin CTA deshabilitado; explicar por qué no hay acción |

4. Retirar duplicados como `Continuar` y `Registrar mantenimiento` que hoy llevan al mismo flujo o crean otro borrador.
5. Mantener `Cambiar foto` como acción administrativa secundaria que abre la edición/recorte existente.

### Contenido por sección

- **Resumen:** salud y explicación principal, próximo mantenimiento o atraso, Andon actual, estado administrativo, último kilometraje, último evento de mantenimiento y una siguiente acción.
- **Datos de unidad:** identidad y datos técnicos; edición solo Admin.
- **Mantenimiento:** intervalo configurado, situación frente al umbral y orden abierta. No repetir aquí el historial cerrado completo.
- **Historial:** comparación, cadencia, timeline y piezas usadas, en ese orden.

### Comparación Preventivo/Correctivo

1. Usar una barra horizontal segmentada al 100 %, acompañada siempre de etiquetas, conteos y porcentajes textuales; el color no puede ser el único medio de lectura.
2. Calcular sobre todas las visitas cerradas de la unidad. Los borradores no cuentan.
3. No presentar Correctivo como “malo” ni Preventivo como “bueno” sin una regla de producto adicional.
4. Estado con cero cierres: explicar que todavía no hay historial para comparar. Con un cierre: mostrar el dato real y aclarar que aún no hay tendencia. Con dos o más: mostrar comparación y cadencia.
5. Mantener el gráfico en la ficha; la prohibición de gráficas en `/inicio` continúa intacta.

### Cadencia y timeline narrativo

1. Entre cierres consecutivos mostrar el intervalo `+N km · N días`, comparado con los umbrales ya disponibles del tipo cuando aplique.
2. Hacer clickeable la fila completa de cada visita, con objetivo mínimo de 44 px, focus visible, hover/pressed, chevron y etiqueta `Ver orden`.
3. Cada evento muestra fecha, `Preventivo`/`Correctivo`, km, chofer, hasta dos nombres de trabajos + `N más`, y cantidad de piezas.
4. Fotos, firmas y observaciones completas permanecen en el detalle de la orden; no inflar el DTO del hub solo para repetirlas.
5. Mantener el orden cronológico descendente y una lectura visual que conecte cada servicio con el intervalo anterior.

### Fotografía

1. Renderizar en 4:3, `object-fit: cover`, centrado explícito y sin estiramiento; objetivo aproximado 112×84 en escritorio y 96×72 en móvil, sujeto a la UX spec.
2. Alinear la imagen con la identidad textual, no con el contenedor completo de acciones.
3. Reutilizar el editor 4:3 para `Cambiar foto`. Si el recorte guardado es incorrecto, el Admin reemplaza y recorta de nuevo.
4. No añadir crop automático inteligente, focal point persistido ni edición para Supervisor en este corte.

## Cortes de ejecución recomendados

Después de aprobar SPEC, UX y ADR, emitir tres Engineering Work Orders. No convertir este documento directamente en uno solo:

| Corte | Alcance | Depende de | Puede avanzar en paralelo |
|---|---|---|---|
| A — Contrato e invariante | un borrador, creación atómica, migración y pruebas API | SPEC + ADR | No |
| B — Órdenes | creación contextual, retorno, affordances de piezas/fotos | A | Sí, con C después de A |
| C — Ficha de unidad | IA, CTA contextual, gráfico, cadencia, timeline y foto | A | Sí, con B después de A |

Esta división mantiene el riesgo de datos aislado, reduce conflictos entre `/ordenes` y `/unidades/:id`, y permite entregar valor por superficie sin un PR transversal difícil de revisar.

## Criterios candidatos para la SPEC

### Órdenes

- **O-01:** `Nueva orden` abre el flujo contextual en `/ordenes`; no navega al catálogo de Unidades.
- **O-02:** solo se pueden seleccionar unidades activas y choferes activos.
- **O-03:** unidad + chofer + km + tipo se persisten atómicamente al crear.
- **O-04:** dos intentos concurrentes dejan a lo más un borrador por unidad y ambos clientes reciben una salida accionable.
- **O-05:** si ya existe borrador, la UI ofrece continuarlo y no crea otro.
- **O-06:** regresar del wizard restaura cola, búsqueda, filtros y orden seleccionada.
- **O-07:** agregar pieza y subir foto son identificables, operables con teclado y comunican estado, límites y errores.

### Ficha de unidad

- **U-01:** cada combinación de rol/estado/borrador muestra como máximo una acción principal conforme a la matriz.
- **U-02:** las cuatro secciones son accesibles y la activa permanece visible a 390 px.
- **U-03:** la comparación cuenta todas y solo las visitas cerradas, con `PREDICTIVO` rotulado `Preventivo`.
- **U-04:** la comparación sigue siendo comprensible sin color y maneja 0, 1 y 2+ cierres.
- **U-05:** con dos cierres consecutivos se lee el intervalo en km y días sin abrir las órdenes.
- **U-06:** cada evento del historial abre la orden cerrada mediante toda la fila y resume trabajos y piezas.
- **U-07:** la foto conserva 4:3, encuadre centrado y recorte legible en 390 y 1440 px; solo Admin puede reemplazarla.
- **U-08:** la ficha no muestra actividad de Flota ni crea estados o métricas no persistidas.

## Datos de prueba y estados obligatorios

Preparar datos deterministas que incluyan:

- unidad activa sin borrador y con al menos dos Preventivos y un Correctivo cerrados;
- unidad activa con un borrador parcialmente capturado;
- unidad sin historial;
- unidad con un único cierre;
- unidad inactiva;
- unidad con fotografía correctamente recortada y una fotografía de prueba que exija reemplazo/recorte;
- chofer activo e inactivo;
- dos cierres con km y fechas suficientes para comprobar cadencia.

La migración debe auditar bases donde ya existan dos o más borradores para una unidad. La política de conservación se decide en ADR/operación; no se elige “el más reciente” ni se elimina el resto implícitamente.

## Verificación y evidencia

### API

- Pruebas focales de dominio/servicio para el invariante y validaciones.
- `cd api && npm test`
- `cd api && npm run test:e2e`
- Evidencia explícita de la carrera concurrente y del tratamiento de duplicados preexistentes.

### Web

- `cd web && npm run lint`
- `cd web && npm run build`
- Click-through sin Playwright como Supervisor y Admin en 390×844 y 1440×900.
- Teclado: crear orden, abrir/cerrar panel de pieza/foto, recorrer secciones y abrir una visita del historial.
- Comprobar focus visible, lectores de estado, controles de 44 px, contraste y ausencia de overflow horizontal.

### Capturas mínimas

- `ordenes_nueva_sheet_m390.png`
- `ordenes_nueva_dialog_d1440.png`
- `ordenes_borrador_existente.png`
- `ordenes_captura_pieza_foto.png`
- `unidad_resumen_accion_contextual.png`
- `unidad_historial_comparativa_d1440.png`
- `unidad_historial_timeline_m390.png`
- `unidad_foto_recorte.png`

Cada EWO registra comandos como `PASS`, `FAIL` o `SKIPPED`, conserva evidencia en `docs/evidence/` y pasa un Visual QA independiente con `ux-auditor` después del click-through.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Duplicados existentes bloquean la restricción | auditoría previa + política explícita en ADR/migración |
| Dos clientes crean a la vez | invariante persistente + transacción + respuesta estable; no confiar en precheck UI |
| Queda `Predictivo` en alguna vista | helper compartido de etiqueta + pruebas/`rg` de copy |
| El retorno acepta una URL externa | allowlist de rutas internas para `/ordenes` y `/unidades`; nunca URL arbitraria |
| La gráfica oculta cantidades pequeñas | conteos y porcentajes visibles, no solo segmentos de color |
| Historial largo degrada el hub | v0 usa el historial ya cargado; si el volumen obliga paginación, diseñar agregación de Mantenimiento antes de paginar |
| La ficha vuelve a duplicar el wizard | una sola CTA; captura permanece en el wizard o la ficha de orden |
| Foto base64 pesada empeora carga | no ampliar payload ni calidad en este corte; medir y escalar optimización de almacenamiento por separado |

## Fuera de alcance

- Costos, mano de obra, tiempos muertos, productividad o rentabilidad.
- Predicción, ML, telemetría, GPS, rutas o “próximo fallo”.
- Nuevos estados de visita, asignación a técnicos, prioridad, SLA o vencimiento.
- Timeline global de Mantenimiento + Flota + Inventario + Andon.
- Cambios de ownership o JOINs entre schemas.
- Endpoint global de Órdenes paginado; el N+1 actual merece shaping independiente si se aborda.
- Metadata de focal point o migración del enum `PREDICTIVO`.
- Cambios al dual-stack de notify.

## Condición de cierre del programa

El trabajo se considera terminado cuando los tres cortes aprobados están implementados, la base protege un único borrador por unidad, los recorridos de Órdenes y ficha funcionan para roles y estados documentados, la comparación coincide con todo el historial cerrado, la evidencia API/web está registrada y Visual QA no conserva hallazgos Must/Don’t abiertos.
