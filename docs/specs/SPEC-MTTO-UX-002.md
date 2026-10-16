# SPEC-MTTO-UX-002 — Ficha de unidad legible, responsive y consulta de costos

## Status

**Execution authorized:** user request «Now work on the respective changes and build them … push a PR to github as you finish». Covers the consolidated specs and technical contract; no deployment or external migration execution inferred.

**Proposed — especificación solicitada en chat el 2026-10-15 mediante «/spec it».**

La dirección visual y el alcance de costos se acordaron en el chat. Esto autoriza documentarlos; no equivale a aprobar reglas financieras, migraciones o ejecución. No se cambia código en esta entrega.

Dos incrementos separables:

- **A · Ficha:** organización de Resumen, Ficha técnica, Mantenimiento e Historial, conservando permisos y reglas existentes. Dirección/alcance aceptados por el usuario al indicar «Sigamos con tus recomendaciones»: Salud compacta con desglose y kilometraje de consulta. Preparación de ejecución en EWO-039; no se infiere aprobación de código/deploy.
- **B · Costos:** consulta mensual, acumulado del periodo, categorías y órdenes asociadas, dentro de Historial. Diseño acordado; contrato y reglas de datos en Draft. Costeo figura fuera de v0 en PRODUCT; se documenta como ampliación propuesta, no como capacidad actual ni autorización de implementación.

Los mockups son referencias de composición. Esta SPEC y su [UX spec](../design-system/ficha-unidad-v1.md) corrigen sus diferencias con el sistema real. No sustituyen ADRs ni el EWO aprobado que requiere una implementación posterior.

## Problem

La ficha actual dispersa identificación, preventivo, alerta y actividad. Un porcentaje de Salud sin abrir su explicación no indica por sí solo qué acción sigue. Una lectura histórica puede confundirse con kilometraje actual. La navegación y la tabla deben ser utilizables desde celular. El usuario también necesita entender cuánto mantenimiento se ha registrado y qué órdenes explican ese importe.

## Context

Fuentes: conversación y capturas del usuario; código local inspeccionado el 2026-10-15. No se verificó la instancia desplegada.

| Evidencia local | Implicación |
|---|---|
| `web/src/app/unidades/[id]/page.tsx`, `HubFichaNav`, `HubIdentityHeader` | Cuatro vistas; query `vista`; `returnTo`; permisos y flujos existentes |
| `web/src/lib/types.ts`: `UnidadHub`, `UnidadHealth` | Identidad, borradores, cerradas, último km y Salud; no contrato de costos |
| `web/src/components/UnidadForm.tsx` | `marcaModelo` es un campo combinado; existe VIN. No separar marca/modelo en persistencia por el mockup |
| `api/src/visitas/visita.entity.ts`, `visita-pieza.entity.ts` | Inspección dirigida sin importes de mantenimiento ni desglose financiero; cantidad/origen de consumo no son precio |
| `web/src/app/globals.css`, `.history-mix` | Preventivo `var(--navy)` = `#24284D`; Correctivo `#C45D23` |
| PRODUCT y ficha-resumen-v0 | Costos excluido del alcance anterior; Salud y acceso a su desglose vigentes |

La ausencia de importes se afirma para las fuentes inspeccionadas, no para cualquier sistema externo. No inferir precios a partir de cantidad, stock, tipo de trabajo, tickets adjuntos o precios actuales de catálogo.

## Goals

1. Identificar unidad, pendiente principal y siguiente acción en una lectura breve.
2. Diferenciar estado administrativo, condición de mantenimiento, Salud y antigüedad de registros.
3. Hacer las cuatro vistas utilizables en escritorio y celular con las mismas capacidades permitidas.
4. Consultar gasto mensual, total del periodo, categorías y órdenes que lo sustentan, cuando exista una fuente financiera fiable.
5. Mantener los colores existentes de Preventivo/Correctivo y los componentes Team Mex.
6. Alcanzar al menos 8.5/10 en cada dimensión de auditoría definida, además de los gates obligatorios del repositorio.

## Non-goals

- **Costo por kilómetro y valor de adquisición:** excluidos explícitamente por el usuario; no campos, indicadores, filtros ni gráficas asociados.
- Costos de combustible, depreciación, presupuesto, facturación, pagos, OC formal, valuación de inventario o módulo contable.
- Crear una quinta pestaña principal, nuevos roles o nuevos permisos de edición.
- Cambiar cálculo de Salud, mantenimiento, cierre, firmas, CHECK, consumo de stock o avisos Andon.
- Modificar Flota/Logística, unificar notify, migrar otros listados o recolorear globalmente las órdenes.
- Captura directa de odómetro o de costos sin contrato y autorización específicos.
- Interpretar ACTIVA como aptitud mecánica o permiso para circular.

## Actors

| Actor | Lectura | Acciones |
|---|---|---|
| `SUPERVISOR` | Ficha y visitas según autorización vigente; costos pendiente D-05 | Crear/continuar mantenimiento según capacidades reales; Enterado cuando corresponda |
| `ADMIN_DIRECTIVO` | Ficha y visitas; costos pendiente D-05 | Editar datos por ruta existente; no otorgar creación de visitas por el diseño |
| Otros roles | Sin acceso nuevo por esta SPEC | Conservar autorización efectiva del servidor |

## Functional Behavior

### F-01 · Encabezado y navegación

Encabezado compacto con número interno, placas, tipo y etiqueta **Estado: Activa/Inactiva**. Preferir foto existente; fallback al icono del tipo. No etiquetar estado administrativo como «Estado operativo»: las imágenes se corrigen en implementación.

Mantener cuatro destinos: **Resumen · Ficha técnica · Mantenimiento · Historial**. Conservar IDs `resumen`, `tecnica`, `mantenimiento`, `historial`, parser y `returnTo` seguro. Pestañas visuales horizontales; como son enlaces a URL, usar navegación y `aria-current`, no roles ARIA de tab incompletos. URL desconocida cae en Resumen como hoy.

Sin menú de tres puntos si no hay acciones reales. Editar solo para quien ya tiene autorización. Cada vista mantiene identidad al cambiar de sección.

### F-02 · Resumen

Orden: identidad → pendiente principal y acción → última lectura con fecha/fuente → identificación corta → actividad relevante.

Un único bloque dominante explica el preventivo: estado, causa por tiempo/uso cuando esté disponible, último servicio aplicable, intervalo vigente y límites respaldados por la fuente. No repetir el mismo aviso como segunda tarjeta de alerta, métrica y evento destacado. Alertas distintas y autorizadas siguen accesibles; deduplicar no significa ocultarlas.

Un solo primario de mantenimiento: **Continuar orden** cuando corresponda una orden existente; en otro caso **Crear orden de mantenimiento** si lo permite la capacidad vigente. Decisión GrillMe aceptada: si hay una orden continuable autorizada se abre directamente; si hay varias, **Continuar orden** abre selector con tipo, estado y fecha disponibles. No elegir silenciosamente la primera ni asumir que todo borrador excluye otra orden. El selector solo contiene el alcance que realmente entrega el contrato, sin inventar permisos o afirmar que incluye todas las órdenes del sistema. Abrir el flujo no crea registros hasta la confirmación existente.

Lectura: **Última lectura registrada**, valor, fecha y fuente si vienen del contrato. Sin fecha: **Fecha de lectura no disponible**. La actualización de la ficha no fecha al odómetro. No afirmar kilometraje actual a partir de una lectura antigua. Cuando el dato proviene del cierre, etiquetar **Registrado en orden cerrada el…**; no asegurar que esa sea la fecha física de lectura.

No implementar el botón ilustrado **Actualizar kilometraje** hasta resolver D-03; mientras tanto solo lectura y acceso al flujo existente si este realmente permite registrar una lectura sin inventar un servicio.

### F-03 · Ficha técnica

Agrupar **Identificación**: número interno, placas, VIN si está disponible, tipo y estado. **Características**: marca/modelo combinado y año. No separar campos ni omitir VIN existente por seguir una imagen. Los valores ausentes usan **Sin dato** y no un cero.

**Completar ficha** / **Editar datos**, solo Admin, abre `/unidades/:id/editar`; no crear editor inline ni otorgar ese permiso al Supervisor. Última lectura y fecha se presentan con la semántica de F-02. `updatedAt` se etiqueta **Última actualización de la ficha**, nunca última actualización de todos los servicios.

### F-04 · Mantenimiento

Mostrar estado del preventivo, umbrales y última intervención aplicable, más las órdenes/borradores que entregue el sistema. «No hay visitas en borrador» solo describe borradores; nunca demuestra cero órdenes abiertas.

No recalcular vencimientos en el cliente ni asumir que cualquier cierre reinicia preventivo. Fecha y uso corresponden a reglas de Andon/Salud y su contrato efectivo. **Marcar como enterado** conserva su permiso y significado: reconocimiento no resuelve el aviso. Crear orden tampoco lo resuelve. CHECK no se muestra como mantenimiento realizado ni reinicia cadencia.

Ante fallos de avisos/umbrales/Salud, no heredar el fallback actual Al corriente por ausencia de driver. Conservar hechos confirmados y mostrar fuente no disponible/datos insuficientes. Una discrepancia entre fuentes se muestra sin recalcular ni resolver alertas en UI.

Sin historial/umbral suficiente: **No hay información suficiente para calcular el próximo servicio**; no inventar «Al corriente».

### F-05 · Historial / Servicios

Subvista inicial **Servicios**. Presentar servicios cerrados con fecha/hora, tipo visible, trabajos, km, responsable disponible y **Ver orden**. Identidad del responsable debe conservar la atribución real; no cambiar chofer por usuario creador o mecánico. El contrato actual proporciona choferNombre: si se usa ese dato, la columna se llama **Chofer**, no Responsable.

Filtros de periodo, tipo y búsqueda por trabajo/responsable; con muy pocos datos pueden agruparse tras **Filtrar**. Conservar selección al abrir/cerrar detalle y usar Atrás. No filtrar solo la primera página como si fuera el universo. Mapeo de tipos mediante adaptador vigente: `PREDICTIVO` legado se etiqueta Preventivo sin renombrar enums. Revisión/CHECK no se cuenta como Preventivo o Correctivo.

No construir tendencias con un servicio ni presentar ausencia de refacciones registradas como ausencia de uso. No mostrar costos ficticios en Servicios.

### F-06 · Historial / Costos (incremento B)

Segunda subvista **Costos** dentro de Historial; no quinta pestaña principal. Solo habilitar cuando exista contrato autorizado, datos con cobertura definida y D-04–D-06 resueltas. Si se decide exponer la sección antes de eso, el único estado admisible es **Los costos de mantenimiento aún no están disponibles**; no tarjetas o gráficas llenas de ceros.

Periodo: últimos 6 meses por defecto, opción últimos 12 y rango personalizado; inicio/fin inclusivos en zona de negocio y límite de consulta explícito en el contrato. Periodo en curso se etiqueta **Hasta [fecha]**, sin extrapolar meses futuros. Moneda visible: MXN, confirmada posteriormente por el usuario. Base de comparación: sin IVA, conservando también IVA y total; la captura de origen permite escoger importe con IVA incluido o sin IVA.

La primera entrega financiera que consume Inventario muestra **Costo de refacciones**, no mantenimiento completo. Usa acumulado neto de refacciones, subtotales Preventivo/Correctivo, gráfica mensual de refacciones y órdenes. Mano de obra/Otros y su distribución quedan para una ampliación con fuentes reales. Esta variante concreta prevalece sobre los títulos y desglose completos de las referencias anteriores.

Contenido objetivo completo futuro, compartiendo unidad, moneda, periodo y base de reconocimiento:

1. **Gasto del periodo**: acumulado del rango elegido; no precio de compra ni gasto de vida completa.
2. **Preventivo** y **Correctivo**: subtotales de ese mismo universo.
3. **Costo de mantenimiento mensual**: barras apiladas por mes, base Preventivo y segmento Correctivo; orden cronológico; leyenda persistente; valores exactos disponibles por selección y tabla alternativa. Escala desde cero. No línea de tendencia ni variaciones porcentuales sin base comparable.
4. **¿En qué se gastó?**: barras horizontales de Refacciones, Mano de obra y Otros, con importes; mismas fechas y cobertura. Categoría ausente no se transforma silenciosamente en Otros.
5. **Órdenes de [mes]**: seleccionar una barra actualiza detalle y total; orden, fecha de reconocimiento definida, tipo, importe y enlace autorizado. El mes más reciente con registros es la selección inicial; mes sin registros confirmados tiene vacío específico. Escritorio: tabla; móvil: tarjetas.

El acumulado detallado debe reconciliar con subtotales, barras, categorías y órdenes bajo idénticos filtros. No sumar dos veces precio total de orden y sus líneas. Fuente incompleta: mostrar **Registro de costos incompleto** y qué falta; no denominar total a una suma parcial. No estimar un gasto faltante ni reemplazarlo por cero.

Solo si en un incremento posterior se autoriza el indicador en Resumen: usar exactamente la misma fuente y periodo; no añadirlo en A por el mockup.

### F-07 · Colores y diseño existente

Decisión explícita del usuario: reutilizar la correspondencia visual actual.

- Preventivo: `var(--navy)` = **#24284D**, del historial existente.
- Correctivo: **#C45D23**, de `.history-mix .is-correctivo`.
- Acciones primarias: `--cta` **#EA7515**, con texto `--primary-foreground` **#24284D**, según sistema actual.
- Roboto, superficies y primitivas de ADR-003. Los HEX aproximados y gradientes de mockups no son nuevos tokens.

Fuente canónica para las nuevas series: `.history-mix`, no el naranja CTA. El código de lista Órdenes también contiene otro par para etiquetas (`.ordenes-tipo`); no se afirma que hoy todos los componentes sean idénticos ni se autoriza una migración global. En las nuevas series/leyendas se reutiliza el par del historial; cualquier unificación adicional es otro corte.

Etiquetas de tipo mantienen texto; las series cuentan con leyenda y detalle textual. Color nunca es la única forma de distinguir. Categorías de gasto usan un tono neutro común para magnitud, sin reutilizar arbitrariamente los colores de tipos como si Refacciones equivaliera a Correctivo.

## Business Rules

- Datos actuales proceden del servidor; una pantalla no modifica reglas de dominio.
- Salud tiene cálculo y desglose existentes (ADR-010). No se elimina su motor, alertas, API ni permisos. D-01 resuelta: indicador compacto visible con acceso al desglose, dando prioridad al pendiente de mantenimiento.
- La fecha 15 oct 2026 es corte ilustrativo, no constante de producción. `updatedAt` de unidad, lectura y fecha de agregación son conceptos distintos.
- Datos ilustrativos jamás se sirven como registros reales de FOTON. Mockups de costos no prueban que esas órdenes existan.
- No total financiero, distribución o ausencia global durante carga, error, paginación incompleta o fuente sin cobertura suficiente.
- Importes: aritmética decimal o unidades menores según contrato; no sumas con error de coma flotante. Monedas distintas no se suman ni convierten automáticamente.
- Cero solo cuando la fuente confirma un importe cero; falta de captura conserva desconocido. Devoluciones, ajustes y detalles fiscales pendientes requieren D-04, sin reglas inventadas en UI.
- Decisión posterior del usuario: captura de costo en MXN con selector **El importe incluye IVA / El importe no incluye IVA**. Calcular automáticamente subtotal/IVA/total usando tasa conocida cuando falte el desglose; si ya existe, validarlo sin duplicar impuesto. Con IVA: neto = total / (1 + tasa). Sin IVA: total = neto × (1 + tasa). La base neta alimenta promedio ponderado y agregados; conservar impuesto/total y modo de captura. Tasa predeterminada **16%, editable**, con opción **Sin IVA**, confirmada por el usuario. Mostrar tasa y recalcular al cambiar el modo; no confundir Sin IVA con tasa desconocida. Política de redondeo y excepciones fiscales todavía pendientes.
- Totales globales de periodo no se obtienen de las filas de una página. Paginación del detalle no cambia el total del mes.

## Domain Implications

El incremento A compone lecturas existentes y cambia jerarquía. No declara nuevos bounded contexts, cambia ownership ni reescribe schemas.

B requiere decidir fuente financiera y quién captura/corrige sus datos. No asumir que Inventario posee precios históricos ni extender `VisitaCerrada` sin revisar el contrato. Si cambia persistencia, ownership, evento o frontera, documentar la decisión en ADR separado antes de implementación. Nunca JOIN/FK entre schemas por conveniencia del reporte.

## State Transitions

- Navegar sección/subvista/periodo/mes: solo estado de consulta y URL; no escrituras.
- Consultar → loading → ready/empty/error/partial por recurso. Fallo de Costos no borra ficha, Salud o Servicios.
- Cambiar unidad, rol o periodo invalida selección incompatible y descarta respuestas tardías del contexto anterior.
- Crear/continuar/editar/Enterado: delegar al flujo vigente y refrescar solo tras éxito confirmado. No reintentos automáticos de escrituras.
- Cambiar filtros conserva datos anteriores únicamente con aviso de desactualización y sin mezclarlos con el nuevo contexto.

## Constraints

### Architecture

Next.js, shadcn/Tailwind, DTOs y límites actuales. No instalar framework visual nuevo ni elegir una librería de gráficas en esta SPEC. B necesita contrato de agregados y detalle consistente; nombres/rutas de endpoints quedan al diseño de contrato, no se inventan como existentes.

### Compatibility

Preservar enlaces `?vista=...`, retorno seguro y rutas de visita. Query propuesta para B: `seccion=costos`, `desde=YYYY-MM-DD`, `hasta=YYYY-MM-DD`, `mes=YYYY-MM`; parámetros inválidos recuperan defaults con mensaje pertinente, sin cambiar unidad o rol. No cambiar enums o datos históricos para acomodar labels.

### Security

Autorización del servidor en ficha, importes, agregados y detalle. Un enlace Ver orden no revela órdenes fuera del alcance del actor. El permiso de leer una unidad no concede automáticamente leer costos: D-05. No copiar credenciales, tickets ni datos privados en evidencia.

### Performance

No descargar todas las visitas de toda la flota para sumar en navegador. Reutilizar lecturas y agregados del alcance de unidad/periodo. Detalle paginado y rango acotado por contrato; medir tiempos con volumen representativo antes de fijar presupuesto de rendimiento, sin prometer latencia sin datos.

### UX / Operational

Una acción primaria por contexto; controles operables por tacto/teclado; contraste de texto normal ≥4.5:1, controles/foco ≥3:1. No hardcodear cifras de ejemplo ni colores nuevos. Estado siempre acompañado por texto. No subir nota de auditoría para compensar un gate fallido.

## Failure Behavior

| Estado | Presentación y recuperación |
|---|---|
| Carga inicial | Cargando ficha… / Cargando costos…; no cero ni vacío prematuro |
| Error de recurso | No se pudo cargar [recurso] + Reintentar; conservar fuentes sanas |
| Sin fuente de costos | Los costos de mantenimiento aún no están disponibles |
| Fuente disponible, sin registros | Sin costos registrados en este periodo; no $0 si falta captura |
| Filtro sin coincidencias | No hay resultados con estos filtros + Quitar filtros |
| Parcial/incompleto | Registro de costos incompleto; faltantes visibles, total global no afirmado |
| Sin autorización | Estado de permiso del sistema; sin importes ni acciones filtradas por UI solamente |
| Reintento correcto | Conservar contexto, foco y filtros; anunciar resultado sin modal innecesario |
| Registro eliminado/no accesible | Conservar identificador permitido, explicar indisponibilidad; no enlace roto como única respuesta |

## Edge Cases

- Cero, una o muchas visitas; únicamente CHECK; tipo legado/nuevo sin clasificación financiera conocida.
- Lectura sin fecha, valor cero confirmado, lectura reciente de otra fuente, diferencia entre fecha de visita y lectura.
- Unidad inactiva, varios borradores/órdenes, Admin sin permiso de captura.
- Cruce de mes/año y zona horaria; periodo en curso; mes sin registros vs mes sin cobertura.
- Importe cero confirmado, importe ausente, devolución/ajuste según política, categorías incompletas y moneda diferente.
- Filtro o selección de mes cambia durante consulta; Atrás y recarga preservan contexto válido.
- Costos agregados disponibles pero detalle fallido, o viceversa: fallo específico sin inventar reconciliación.

## Acceptance Criteria

| ID | Dado / cuando / entonces |
|---|---|
| AC-01 | Dada una unidad autorizada, al abrir/cambiar entre las cuatro vistas, se preservan identidad, rutas y retorno seguro; no aparece quinta pestaña. |
| AC-02 | Dado un preventivo vencido, al abrir Resumen se identifica una sola causa dominante y una acción pertinente sin repetir la misma alerta como métrica. |
| AC-03 | Dados Supervisor/Admin y capacidades reales, se muestran únicamente acciones autorizadas; un mockup no concede edición, creación ni lectura financiera. |
| AC-04 | Dada una lectura, se muestra valor con fecha/fuente disponibles; ausencia de fecha, error o lectura antigua no afirma kilometraje actual ni usa updatedAt como fecha de lectura. |
| AC-05 | Dados campos de ficha vacíos, se muestra Sin dato; marcaModelo continúa combinado, VIN existente accesible y edición usa ruta autorizada. |
| AC-06 | Dado aviso/borrador/cierre/CHECK, las reglas de mantenimiento, Enterado y Salud permanecen; no se calcula un vencimiento alternativo en cliente. La presentación de Salud corresponde a D-01 resuelta. |
| AC-07 | Dado historial filtrado y/o paginado, se conserva alcance y contexto al abrir una orden; CHECK no cuenta como mantenimiento; falta de refacciones registradas no se describe como falta de uso. |
| AC-08 | Dada una gráfica/leyenda/etiqueta nueva de tipo, Preventivo usa #24284D y Correctivo #C45D23 con texto; el naranja CTA no sustituye Correctivo. |
| AC-09 | Dadas todas las vistas a 390px y zoom 200%, son legibles y operables; tarjetas sustituyen tabla cuando esta no cabe, sin scroll horizontal de toda la página ni pérdida de acciones; targets ≥44px en móvil. |
| AC-10 | Dados teclado/lector, navegación y filtros tienen nombres, foco y estado; cada valor de gráfica tiene alternativa textual y la selección de mes no depende de hover/color. |
| AC-11 | Dada carga/error/parcial/vacío, se distinguen con mensajes y recuperación propios; no aparece cero, ausencia o total global ficticio. |
| AC-12 | Dada B habilitada y fuente íntegra, periodo/moneda/base son comunes a acumulado, tipos, meses, categorías y órdenes; todos reconcilian con el conjunto completo, no solo una página. |
| AC-13 | Dado un mes seleccionado por clic/tacto/teclado, se actualizan detalle, subtotal y URL; Atrás/restauración recuperan contexto; mes sin registros tiene vacío específico. |
| AC-14 | Dados costos no disponibles/incompletos/multimoneda, se muestra el estado correcto sin mezclar monedas ni convertir desconocido a cero. |
| AC-15 | Dado el alcance, ninguna vista incluye costo por km o valor de adquisición; datos ilustrativos permanecen fuera de consultas reales. |
| AC-16 | Dada la entrega implementada, hay click-through y capturas por rol/viewport, auditoría independiente ≥8.5 por dimensión y sin fallos de gates; pendientes no se marcan PASS. |

### Criterio añadido tras GrillMe

| ID | Dado / cuando / entonces |
|---|---|
| AC-17 | Dado el alcance autorizado con una orden continuable, acceso directo; con varias, selector con datos disponibles y foco accesible, sin selección silenciosa de la primera ni permisos nuevos. |

## Dependencies

- [Contrato técnico INV-001](../contracts/INV-001-costos.md) y [ADR-026 propuesto](../adr/026-inventario-costos-historicos.md): integración financiera de refacciones con revisión/asOf, cobertura y permisos; conservar fuera de A.

- [UX spec de este corte](../design-system/ficha-unidad-v1.md).
- [SPEC-MTTO-UX-001](SPEC-MTTO-UX-001.md): estados, recuperación y contraste; no duplicar ni revertir ese núcleo.
- [Ficha Resumen v0](../design-system/ficha-unidad-resumen-v0.md) y [unify chrome](../design-system/ui-unify-chrome-v0.md): contratos actuales; registrar cambios de presentación al aprobar A.
- [Salud v0](unit-health-v0.md), [tipos de órdenes](../design/ux-orders-type-filter-v1.md) y adaptadores efectivos: preservar semántica de mantenimiento/CHECK.
- Fuente, política, contrato y permisos de costos antes de B; no deducirlos del diseño aprobado.
- Decisiones GrillMe de Inventario: solo total por refacción/operación, proveedor obligatorio en compra nueva, documento pendiente permitido; ajustes/retornos conservan costo y trazabilidad según SPEC-INV-001. No inferir campos de descuento/flete para el reporte. Recepción sin costo permitida y promedio incompleto hasta regularización; preservar costos históricos conocidos. Primera entrega excluye devolución a proveedor/cambios/garantías, sin ocultar ajustes o costos pendientes en la cobertura.
- [SPEC-INV-001](SPEC-INV-001.md): fuente propuesta de costos históricos de refacciones y tratamiento de IVA; no habilitar total de mantenimiento completo si solo se dispone de piezas. Sus decisiones pendientes de stock inicial, permisos, redondeo y correcciones condicionan la integración.
- [Discovery de Inventario y costos](../../workspace/discovery/inventario-flujo-estandar-y-costos-v1.md): el usuario eligió promedio ponderado móvil para salidas de almacén en este chat el 2026-10-15. Último costo de compra es referencia; el consumo debe conservar el costo histórico aplicado. También se acordó MXN y captura con IVA incluido o sin IVA a elección, con cálculo automático del desglose y base neta para costos. Se confirmó tasa predeterminada 16% editable y opción Sin IVA. Quedan pendientes redondeo, excepciones fiscales, stock inicial, permisos e implementación.
- EWO posterior aprobado para cada incremento ejecutable; no creado por esta solicitud de SPEC.

## Related ADRs

ADR-000/001/002 (ownership, cierre y schemas), ADR-003 (sistema visual), ADR-010 (Salud). No se reescriben. Cualquier impacto del contrato financiero se decide aparte.

## Open Questions

| ID | Decisión pendiente | Tratamiento hasta resolver |
|---|---|---|
| D-01 · Resuelta | Salud compacta visible con acceso al desglose; prioridad al pendiente de mantenimiento. | Usuario aceptó la recomendación en este chat; conservar cálculo/API/permisos. |
| D-02 · Acotada para A | Mostrar lectura/fecha/fuente únicamente cuando existan; si falta fecha, declararlo. | No requiere umbral nuevo de lectura antigua ni endpoint nuevo en A. Confirmar mapeo del contrato al implementar. |
| D-03 · Diferida | Captura independiente de odómetro pospuesta por recomendación aceptada. | A solo consulta; sin botón Actualizar kilometraje ni nueva escritura. |
| D-04 | Fuente del gasto, captura/corrección, fecha de reconocimiento, excepciones fiscales, precisión/redondeo, contratos de ajustes, categorías y universo (cerradas u otro). Modo con/sin IVA y cálculo automático ya acordados. | B no Ready; no inferir que cerrado equivale a pagado ni usar fecha de creación por defecto. |
| D-05 · Dirección aceptada | Supervisor captura/consulta; Admin consulta, valida y autoriza correcciones posteriores, con trazabilidad. | Aplicación de capacidades/alcance a contrato vigente pendiente en B; no cambiar auth en A. |
| D-06 | Cobertura histórica y política de periodos incompletos; moneda MXN ya confirmada. | No mezcla/conversión; cobertura aún pendiente. |

El acuerdo de interfaz del usuario no resuelve estas decisiones de datos. Ninguna pregunta material puede permanecer cuando el incremento se marque Approved/Ready.

## Traceability and impact

- PRD: A es mejora de recorrido existente; esta SPEC registra problema/alcance. B, por ampliación fuera de v0, requiere shaping/PRD proporcional antes de aprobar ejecución.
- Domain card afectada: Mantenimiento y contratos de lectura de unidad/Salud; no se modifica ninguna card ni se declara un BC nuevo.
- Actual: evidencia en Context. Deseado: F-01–F-07.
- Modelo/migración: A ninguna prevista; D-02 puede requerir contrato de lectura. B desconocido hasta decisiones, no «sin impacto».
- API: A reutiliza capacidades, nunca nueva escritura de km; B necesita contrato posterior, sin endpoints financieros aprobados aquí.
- UI: cuatro vistas responsive y subvista Costos condicionada a B.
- Referencias: [índice de mockups](../design/references/ficha-unidad-v1/README.md). Importes ilustrativos identificados.

## Negative cases and UI states

Canónicos en Failure Behavior y Edge Cases. Éxito de lectura muestra datos confirmados; disabled durante acción conserva explicación y previene duplicados según flujo existente. Guardado/cierre no se implementa aquí, pero accesos no deben perder captura ni repetir escrituras. Carga, parcial, vacío verdadero, error, permiso y recuperación se verifican por recurso.

## AC-to-test plan

| AC ID | Escenario positivo / negativo | Prueba planeada | Evidencia tras ejecución |
|---|---|---|---|
| 01,03 | Navegación, retorno, roles y acciones prohibidas | Click-through Supervisor/Admin y pruebas de autorización pertinentes | Pendiente |
| 02,05,07 | Vencido/normal, ficha incompleta, historial 0/1/muchos | Revisión de datos + screenshots desktop/móvil | Pendiente |
| 04,06 | Lecturas sin fecha/antiguas, ACK, CHECK y Salud | Pruebas focalizadas de mapeo si cambia lógica; click-through con fixtures | Pendiente |
| 08 | Paleta en series, leyenda y etiquetas; estados | Estilos computados y capturas comparadas con historial | Pendiente |
| 09,10 | 390/768/1024/1440, zoom 200%, teclado/lector y gráfica | Revisión manual accesible + proof-ui; sin Playwright | Pendiente |
| 11,14 | Carga/503/parcial/403/fuente ausente/multimoneda | Casos de contrato y estados UI cuando existan | Pendiente |
| 12 | Meses/tipos/categorías/órdenes, paginación y redondeo | Pruebas de agregación tras definir contrato B; dataset de referencia | Pendiente |
| 13 | Tacto/teclado, mes vacío, URL, Atrás y respuesta tardía | Click-through y prueba focalizada de selección/contexto | Pendiente |
| 15 | Exclusiones y separación de datos ilustrativos | Revisión de alcance/diff y consultas reales | Pendiente |
| 16 | Puntajes y gates por cada vista/viewport | ux-auditor independiente + evidencia enlazada por EWO | Pendiente |

No se ejecutaron pruebas de producto por una entrega documental. No se afirman aprobadas las auditorías de UI funcional.

## Risks and assumptions

- Mockups generados son raster, no componentes probados. La nota previa fue autoauditoría heurística; no reemplaza Visual QA independiente del repo.
- El valor 39% tiene fórmula existente, aunque no era visible en las capturas. Suprimir protagonismo visual no autoriza eliminar Salud.
- Datos de costos de ejemplo: May 3,000; Jun 9,600; Jul 3,000; Ago 15,000; Sep 3,000; Oct 12,000 = 45,600, **no 48,600 como quedó en las imágenes**. Los mocks de costos contienen además segmentos fuera de escala. No usarlos como especificación numérica.
- Dataset corregido para implementación/pruebas: Preventivo [3,000; 3,600; 3,000; 3,000; 3,000; 3,000] = 18,600; Correctivo [0; 6,000; 0; 12,000; 0; 9,000] = 27,000; total 45,600. Categorías ilustrativas corregidas: Refacciones 26,000; Mano de obra 16,000; Otros 3,600 = 45,600. Octubre conserva 12,000 y dos órdenes ficticias de 3,000/9,000.
- Los tonos naranjas y labels abreviados de móvil en las imágenes no prevalecen sobre esta SPEC. También «Estado operativo» se corrige a Estado administrativo.
- No resolver silenciosamente preguntas financieras ni ampliar permisos para completar una imagen. Las dependencias pendientes condicionan la ejecución, no impiden entregar esta especificación.
