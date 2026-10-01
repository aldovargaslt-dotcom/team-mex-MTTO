# SPEC-ORDENES-FICHA-UNIDAD-001 — Creación de órdenes y expediente de unidad v0

## Status

**Approved.** Aprobada explícitamente por el product owner en Codex el 2026-09-29, junto con UX, ADR-015 y EWO-011–013.

## Problem

Crear una orden obliga hoy al Supervisor a pasar por el catálogo de Unidades y la API crea primero un borrador vacío que se completa después. La ficha de unidad, además, duplica acciones y no permite leer con claridad la mezcla Preventivo/Correctivo ni la cadencia del historial cerrado.

## Context

`/ordenes` es el único panel de trabajo del Supervisor; `/unidades/:id` es el expediente de Mantenimiento y el wizard de visita es la superficie de captura. Solo existen los estados `BORRADOR` y `CERRADO`. El backend conserva el enum `PREDICTIVO`, aunque la UI muestra `Preventivo`.

## Goals

- Iniciar una orden completa desde `/ordenes` y continuarla en el wizard sin pasar por el catálogo.
- Garantizar en servidor un máximo de un borrador por unidad.
- Convertir la ficha de unidad en un expediente con una acción principal contextual, comparación histórica, cadencia y eventos navegables.
- Reutilizar el editor de foto 4:3 actual para reemplazar y recortar nuevamente la foto de unidad.

## Non-goals

- Nuevos estados, prioridad, SLA, vencimiento, asignación de técnicos u ownership individual.
- Costos, productividad, telemetría, GPS, rutas o predicción.
- Flota, patio, Logística o chofer de patio dentro de Mantenimiento.
- Timeline global entre módulos, endpoint analítico nuevo o migración del enum `PREDICTIVO`.
- Metadata de punto focal, crop automático u otro almacenamiento de imágenes.
- Cambios al dual-stack de notify, Inventario o Andon.

## Actors

- `SUPERVISOR`: crea y continúa borradores; lee el expediente.
- `ADMIN_DIRECTIVO`: lee órdenes cerradas, edita datos y reemplaza la foto de unidad; no crea ni ve borradores.
- `LOGISTICA`: fuera de estas superficies.

## Functional Behavior

### Creación desde Órdenes

`Nueva orden` abre un dialog en escritorio y un sheet en móvil dentro de `/ordenes`. El Supervisor busca y selecciona una unidad `ACTIVA`, revisa su identidad y captura chofer, kilometraje y tipo antes de confirmar. `Crear y continuar` persiste los cuatro datos como una sola operación lógica y abre el primer paso pendiente del wizard.

Si ya existe un borrador, la superficie no muestra un segundo formulario: identifica el borrador y ofrece `Continuar orden`. Si otra solicitud gana la carrera durante la confirmación, la respuesta de la API permite el mismo desenlace sin duplicar datos.

El retorno al panel acepta únicamente una ruta interna de `/ordenes` y conserva en URL cola, búsqueda, filtros y orden seleccionada. Back/forward reproduce ese estado.

### Captura dentro de una orden

En órdenes en borrador, piezas y fotos se agrupan bajo `Capturar en esta orden`. `Agregar pieza` y `Subir foto` son controles de disclosure operables con teclado, comunican conteos, límites, guardado y error, y conservan foco al abrir/cerrar. Una orden cerrada presenta esos datos solo en lectura.

### Expediente de unidad

La ficha ofrece cuatro secciones: `Resumen`, `Datos de unidad`, `Mantenimiento` e `Historial`. Muestra como máximo una acción principal:

| Contexto | Acción |
|---|---|
| Supervisor + borrador | `Continuar orden` |
| Supervisor + unidad activa sin borrador | `Nueva orden` |
| Admin | `Editar datos` |
| Unidad inactiva o actor sin permiso | Sin CTA; explicación visible |

`Cambiar foto` es una acción administrativa secundaria que reutiliza el editor 4:3. La imagen se muestra en 4:3 con encuadre centrado y `object-fit: cover`.

### Historial

La comparación usa todas y solo las visitas `CERRADO` de la unidad. Presenta una barra horizontal segmentada al 100 %, conteos y porcentajes textuales; nunca depende solo del color. `PREDICTIVO` se rotula `Preventivo` y no se asigna valor moral a ninguno de los tipos.

Con cero cierres se explica la ausencia de historial. Con uno se muestra el dato real sin afirmar tendencia. Con dos o más se muestran comparación y cadencia. Entre cierres consecutivos se presentan `+N km · N días`; cada fila resume fecha, tipo, km, chofer, hasta dos trabajos, cantidad adicional y piezas, y toda la fila abre la orden cerrada. El orden es descendente.

## Business Rules

- Hay `0..1` visita `BORRADOR` por unidad, incluso bajo solicitudes concurrentes.
- Solo `SUPERVISOR` puede crear y la unidad debe estar `ACTIVA`.
- Chofer debe estar `ACTIVO`; km debe ser entero no negativo y no menor que el último km cerrado; tipo debe ser `PREDICTIVO` o `CORRECTIVO`.
- Unidad, chofer, km y tipo se persisten atómicamente al crear; no se deja un borrador vacío ante error.
- El borrador existente se devuelve mediante un resultado estable y accionable definido por ADR-015.
- Admin no recibe acceso a borradores ni capacidad de creación.
- Las comparativas usan todo el historial cerrado; borradores no cuentan.
- La foto pertenece a Kernel y solo Admin la reemplaza conforme a ADR-014.

## Domain Implications

El área provisional afectada es Mantenimiento; la foto permanece en Kernel. No se declara ni redibuja un Bounded Context. No hay escritura ni lectura de Flota/Logística para producir el expediente.

## State Transitions

```text
sin borrador + creación válida  -> BORRADOR completo
con borrador + nuevo intento    -> BORRADOR existente (sin fila nueva)
BORRADOR + cierre válido        -> CERRADO (reglas C1–C4 intactas)
```

## Constraints

### Architecture

- La restricción persistente, transacción y respuesta de carrera siguen ADR-015.
- `VisitaCerrada` y su outbox no cambian.
- El hub actual es la fuente de historial; no se autoriza endpoint analítico nuevo.

### Compatibility

- Se conserva `POST /unidades/:unidadId/visitas`; su body pasa a requerir datos iniciales y su resultado documenta creación o borrador existente.
- `PATCH /visitas/:id` conserva edición posterior del wizard.
- La presentación centraliza `PREDICTIVO` → `Preventivo`; persistencia y API conservan el enum.

### Security

- Se mantienen roles actuales y rutas de retorno mediante allowlist interna.
- La UI no sustituye validación, transacción ni restricción del servidor.

### Performance

- La comparación se calcula con el historial ya entregado por el hub en v0.
- Si el volumen exige paginación/agregación, se detiene y se diseña una lectura de Mantenimiento separada.

### UX / Operational

- Mobile-first a 390 px, objetivos interactivos de al menos 44 px, foco visible y sin overflow horizontal.
- Una sola acción primaria por vista; sin KPI cards ni gráfica en `/inicio`.

## Failure Behavior

- Unidad inactiva, chofer inactivo, km inválido o tipo inválido: `400`, sin fila nueva.
- Actor sin permiso: `403`; sin cabecera de rol: `401`.
- Borrador ya existente o carrera: resultado diferenciable con `visitaId` existente; la UI ofrece continuar.
- Duplicados preexistentes: el despliegue no elimina ni escoge uno; la instalación de la restricción falla de forma explícita con reporte para resolución operativa.
- Error de red: el formulario conserva datos locales y permite reintentar; un reintento no duplica borrador.

## Edge Cases

- Cero, uno y dos o más cierres.
- Conteo 100/0 y porcentajes con redondeo que deben seguir sumando 100 visualmente.
- Visitas consecutivas con mismo día o mismo km.
- Historial con trabajos faltantes o más de dos trabajos.
- Sin choferes activos, búsqueda sin coincidencias y unidad que se inactiva antes de confirmar.
- Foto ausente, reemplazo cancelado y recorte confirmado.

## Acceptance Criteria

### Órdenes

- **AC-O01:** `Nueva orden` abre el flujo contextual en `/ordenes` y no navega al catálogo de Unidades.
- **AC-O02:** solo se ofrecen unidades activas y choferes activos; una inactivación concurrente es rechazada por servidor sin crear fila.
- **AC-O03:** unidad, chofer, km y tipo válidos se persisten en una sola transacción y el resultado abre el primer paso pendiente.
- **AC-O04:** dos solicitudes concurrentes para una unidad dejan a lo más un borrador; ambos clientes reciben un `visitaId` accionable.
- **AC-O05:** con borrador existente, la UI ofrece `Continuar orden` y no crea otro.
- **AC-O06:** volver del wizard restaura cola, búsqueda, filtros y orden seleccionada; rutas externas son rechazadas.
- **AC-O07:** piezas y fotos usan disclosure accesible, foco correcto, conteos/límites y estados de guardado/error; cerradas quedan en lectura.
- **AC-O08:** `PREDICTIVO` se muestra como `Preventivo` en las superficies tocadas sin cambiar el enum persistido.

### Ficha de unidad

- **AC-U01:** cada combinación documentada de rol, estado y borrador muestra como máximo una acción principal conforme a la matriz.
- **AC-U02:** las cuatro secciones son accesibles y la sección activa permanece visible a 390, 1024 y 1440 px.
- **AC-U03:** la comparación cuenta todas y solo las visitas cerradas, con conteos y porcentajes comprensibles sin color.
- **AC-U04:** los estados de 0, 1 y 2+ cierres usan el copy y profundidad definidos en la UX spec sin afirmar una tendencia inexistente.
- **AC-U05:** con dos cierres consecutivos se lee el intervalo en km y días sin abrir las órdenes.
- **AC-U06:** toda fila histórica abre la orden cerrada y resume tipo, km, chofer, hasta dos trabajos, `N más` y piezas.
- **AC-U07:** la foto conserva 4:3, crop centrado y legible; solo Admin puede reemplazarla y vuelve a usar el editor actual.
- **AC-U08:** no aparecen datos, acciones, estados ni métricas de Flota/Logística.

### Compatibilidad y datos

- **AC-D01:** antes de instalar la restricción se auditan duplicados; si existen, no se borra ni modifica información y el proceso informa las unidades afectadas.
- **AC-D02:** creación, actualización, eliminación y cierre existentes conservan C1–C4 y el envelope `VisitaCerrada` intacto.

## Dependencies

- ADR-015 aceptado.
- UX spec `ux-ordenes-ficha-unidad-v0.md` aprobada.
- Corte A completo antes de ejecutar los cortes B y C.

## Related ADRs

- [ADR-000](../adr/000-thin-kernel.md)
- [ADR-001](../adr/001-visita-cerrada-outbox.md)
- [ADR-002](../adr/002-schema-per-module.md)
- [ADR-003](../adr/003-shadcn-tailwind.md)
- [ADR-004](../adr/ADR-004-tdd-test-bar-andon-v0.md)
- [ADR-014](../adr/014-foto-unidad.md)
- [ADR-015](../adr/015-borrador-unico-creacion-atomica-visita.md) (propuesto)

## Open Questions

Ninguna decisión material de producto abierta.

## Proposed amendment — feedback de incompletitud y carga

**Estado:** pendiente de aprobación de producto. No autoriza implementación.

Las superficies de este alcance (`/ordenes`, `/unidades/:id`, detalle/wizard de visita y `Nueva orden`) deben hacer visibles tanto la información obligatoria pendiente como las cargas asíncronas.

- Un formulario no puede limitarse a deshabilitar su acción cuando faltan datos. Después del primer intento de avanzar o guardar, muestra un resumen específico, marca cada control afectado con `aria-invalid`, asocia el mensaje mediante `aria-describedby` y lleva el foco al primer campo inválido.
- El color rojo identifica un bloqueo concreto, nunca el estado normal `BORRADOR`. El mensaje nombra qué falta y cómo corregirlo; no usa únicamente color ni el texto genérico `Error`.
- Al corregir un campo, desaparece su mensaje individual. El resumen se actualiza y se retira cuando ya no quedan bloqueos.
- La carga inicial y el cambio de una orden/ficha conservan la geometría de la vista mediante skeletons estáticos, sin shimmer. Se mantiene un nombre accesible de carga y no se anuncian repetidamente bloques decorativos.
- Error, vacío y carga son estados mutuamente distinguibles. Un error reemplaza el skeleton y ofrece recuperación cuando la solicitud puede repetirse.
- Los skeletons no sustituyen medición de latencia ni autorizan un endpoint nuevo; este corte conserva los contratos existentes.

### Acceptance Criteria — claridad y carga

- **AC-L01:** tras intentar continuar con datos obligatorios ausentes, `Nueva orden` y los pasos editables del wizard muestran resumen con cantidad/lista de faltantes, mensajes junto a cada campo y foco en el primero; el botón no queda silenciosamente deshabilitado.
- **AC-L02:** los campos inválidos exponen semántica accesible (`aria-invalid` y descripción asociada), y su estado se limpia al corregirse sin borrar los demás datos capturados.
- **AC-L03:** `BORRADOR` conserva su significado neutral; rojo se reserva para faltantes que bloquean la acción o errores de solicitud.
- **AC-L04:** `/ordenes`, el detalle de orden, `/unidades/:id`, el wizard y el selector de `Nueva orden` muestran skeletons que reservan aproximadamente el layout final durante carga inicial o cambio de entidad, sin shimmer ni salto estructural evitable.
- **AC-L05:** cada carga tiene texto accesible contextual (`Cargando órdenes`, `Cargando orden`, `Cargando unidad` o equivalente); al fallar, el skeleton desaparece y se muestra el error recuperable correspondiente.
- **AC-L06:** con red rápida no queda contenido de carga superpuesto después de resolver; con latencia simulada los controles aún no disponibles no parecen interactivos.

## Traceability and impact

PRD: no aplica; extiende flujos v0 ya aceptados sin ampliar producto.  
Affected domain card: `domain/mantenimiento/CONTEXT.md`; foto: `domain/kernel/CONTEXT.md`.  
Current behavior and source evidence: `VisitasService.createDraft` crea vacío y la ficha puede listar varios borradores.  
Data model / migration impact: índice único parcial en `public.visitas(unidad_id)` para `estado='BORRADOR'`, con auditoría previa.  
API contract impact: body requerido y resultado estable para creación/idempotencia por unidad.  
UI impact: `/ordenes`, ficha/detalle de orden y `/unidades/:id`; ver UX spec.

## Negative cases and UI states

La UX spec define loading, empty, error, warning, carrera, sin choferes, cero historial, permiso insuficiente y orden cerrada. No hay estado disabled como sustituto de permisos: se omite la acción y se explica la causa.

## AC-to-test plan

| AC | Planned verification |
|---|---|
| O02–O05, D01–D02 | unit/service + PostgreSQL e2e, incluida concurrencia |
| O01, O06–O08 | click-through Supervisor 390/1440 + lint/build |
| U01–U08 | click-through Supervisor/Admin 390/1024/1440 + screenshots + Visual QA |

Los resultados vivirán en `docs/evidence/EWO-011.md`, `EWO-012.md` y `EWO-013.md`.

## Risks and assumptions

- La política de despliegue/migraciones de producción no está documentada; ADR-015 evita inferirla y exige una operación explícita y recuperable.
- El historial completo ya está disponible en el hub; si el tamaño real contradice este supuesto, no se pagina silenciosamente porque alteraría la semántica de “todo el historial”.
