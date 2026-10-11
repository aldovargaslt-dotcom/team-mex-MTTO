# Hallazgos con evidencia

Evidencia y límites preceden a las recomendaciones. El [informe](informe.md) separa sesión local y despliegue público. E01–E43 conservan evidencia histórica; E47–E154 aportan observaciones públicas y pruebas autorizadas. Hay 15 registros (H08/H13 incluyen hipótesis), no 15 defectos de igual impacto. Impacto describe un riesgo razonado, **no daño ni comportamiento de usuarios medidos**. No se propone implementación en esta auditoría.

Se adopta la escala del plan E44: **S4 crítica**, consecuencia operativa grave o pérdida/integridad sustentada; **S3 alta**, bloqueo de tarea prioritaria o resultado incorrecto con recuperación difícil; **S2 media**, confusión/demora/retrabajo recuperables; **S1 baja**, defecto localizado; **S0 observación**, oportunidad sin impacto demostrado. P0 inmediata por consecuencia crítica; P1 necesaria para cerrar recorridos prioritarios; P2 posterior con impacto demostrado; P3 diferida. No hay S4/P0 acreditado. Confianza distingue observado/reproducido de hipótesis; ningún hallazgo está corroborado con usuarios. La prioridad no equivale a aprobación.

H01 y H09 pasan de «alta» en el primer informe a **S2** al aplicar el plan: la confusión/contradicción está acreditada, pero no un resultado operativo incorrecto difícil de recuperar. La API ausente es un bloqueo del entorno, separado de esos defectos. Su P1 de corrección/investigación se mantiene; una consecuencia S3 de H01 sigue siendo hipótesis por contrastar. No se rebaja el riesgo por esfuerzo ni se afirma que el producto haya cambiado.

## Revalidación pública de H01–H09

| Hallazgo | Evidencia nueva y alcance actual |
|---|---|
| H01 | E148: bloqueo de GET Movimientos en navegador público produce 0+0/No hay consumo pese a 1+4 real; E149 recupera. E153 afirma Sin piezas durante carga secundaria y E154 muestra la línea correcta sin escribir. No es pérdida de datos ni caída del servidor |
| H02 | E143/E144 con Roboto público: fallo sólo Andon genera mensaje estrecho, mientras otras filas se muestran normales; E145 recupera FOTON |
| H03 | E143/E148 no ofrecen reintento directo; sólo recarga/navegación recuperan E145/E149. No se probó conservar estado ante escritura fallida |
| H04 | E150 mide Adjuntar ticket público blanco sobre #EA7515, 13px/500, 44px alto: misma combinación 2.977:1 de E29. E130 múltiples filas; no aprobación global de CTA |
| H05 | E97 desktop y E150 móvil: Escape tras espera1200ms cierra y deja BODY. E70 de300ms no se toma como Escape roto |
| H06 | E92: Mecánico seleccionado, badge2, campanita→restricción. Reproducido en multirol; no denegación HTTP de cuenta pura ni propuesta de permiso nuevo |
| H07 | E150: media query reduce true, animation enter0.3s / transition 0.3s permanece. Implementación diferida |
| H08 | Colas/tipo con datos E53/E93/E94 y período E85 muestran gramáticas distintas; sigue S0/P3, semántica/impacto humano por contrastar |
| H09 | E96 acredita OIDC y roles actuales; E90/E91 cola CHECK vacía exitosa, no CHECK completo. Fuente desplegada declarada por usuario. Contradicciones documentales y umbrales siguen sin resolución canónica |

Revalidación no cierra hallazgos ni autoriza implementación. Consecuencias, frecuencia y comprensión humanas siguen sin medir; estimaciones del backlog revisadas por evidencia nueva.

## H01 — Consulta fallida presentada como ausencia de datos

- **Evidencia:** E03/E15 Órdenes: error 503 + «No hay órdenes en borrador»; E06/E16 Nueva orden: error + «No hay unidades activas que coincidan»; E09 Consumo: error + 0 pza por origen + «No hay consumo en este periodo»; E12 Andon «No hay alertas pendientes»; E13/E14 Alertas «Sin alertas»; E37 Movimientos «Aún no hay movimientos». PNG y respuestas 503 en JSON pareados. Código de estas rutas vacía arrays tras error y luego renderiza empty/totales. En Campanita el error se omite y el contador inicial es 0; no se verificó un contador previamente cargado.
- **Impacto:** una indisponibilidad podría interpretarse como inexistencia de órdenes, avisos o consumo y conducir a desatención o duplicación de trabajo.
- **Clasificación:** datos/capacidad e interacción; dimensiones comprensión, atención y medición. Defecto UX/funcional del cliente en fallo; no prueba de pérdida de datos.
- **Confianza:** reproducido en estados observados; impacto humano sin probar. **Severidad:** S2 media; consecuencia S3 hipotética. **Prioridad:** P1 por fidelidad necesaria para decidir y reanudar tareas de mantenimiento.
- **Recomendación:** distinguir carga, éxito vacío, éxito con datos, error y resultado parcial. Valores desconocidos deben permanecer explícitos; conservar contexto de filtro. Reusar primitivas de mensaje/listado existentes.
- **Criterio verificable:** ante respuesta fallida o fuente parcial, la UI identifica qué no está disponible y no afirma «No hay», cero o «sin alertas» para esa fuente. Sólo una respuesta exitosa vacía produce el mensaje de ausencia. Revalidar con datos y error controlado en entorno de prueba, incluida campanita.

## H02 — Inicio coloca mensajes de error en una columna de icono

- **Evidencia:** E02 d1440 y E17 m390: mensajes se parten artificialmente palabra por línea. `inicio/page.tsx` aplica `inbox-row` a un párrafo con un solo hijo; `globals.css` define la fila con columnas `36px 1fr auto`. Captura revisada también por ux-auditor.
- **Impacto:** dificulta escanear las cuatro fuentes que faltan y agranda innecesariamente la cola de atención.
- **Clasificación:** visual y organización; dimensiones comprensión y atención. **Confianza:** reproducido. **Severidad:** S2 media. **Prioridad:** P1 por afectar la entrada prevista de mantenimiento; frecuencia diaria real no medida.
- **Recomendación:** adaptar el estado de fallo al ancho de texto de la fila, manteniendo el patrón de Inicio, marca y componentes propios.
- **Criterio verificable:** mensajes legibles en su región de texto a 1440/1024/390, sin reservarles la columna de icono ni cortar cada palabra; verificar también filas normales y fallos parciales.

## H03 — «Intenta de nuevo» no tiene acción de recuperación consistente

- **Evidencia:** E02/E03/E06/E07/E09/E10/E12/E13/E34/E35 reciben la instrucción sin un botón explícito de reintento en el estado observado. E20/E22 sí ofrecen Reintentar; E21 demuestra nuevo intento, aunque la API permanece ausente.
- **Impacto:** el Supervisor debe descubrir recarga/navegación; puede perder contexto o repetir pasos antes de volver a trabajar.
- **Clasificación:** interacción; dimensiones acción y consistencia. **Confianza:** observado en las rutas citadas; recuperación completa no comprobada. **Severidad:** S2 media. **Prioridad:** P2; candidata a integrar el paquete P1 de disponibilidad si se confirma necesaria para cerrar el recorrido.
- **Recomendación:** usar un patrón explícito de recuperación para consultas recuperables, con acción que repita la lectura pertinente y conserve selección/filtros. Diferenciar fallo de autenticación, permiso y servicio según respuesta real.
- **Criterio verificable:** recuperar una lectura sin abandonar pantalla ni perder el contexto; mostrar estado de intento y resultado real; no duplicar operaciones de escritura. No basta el texto de un botón sin respuesta exitosa verificada.

## H04 — Contraste insuficiente del CTA blanco sobre naranja

- **Evidencia:** E03/E15 y sus DOM: Nueva orden, texto blanco `#FFFFFF` sobre `#EA7515`, 14px. E29 calcula contraste sRGB **2.977:1**, inferior a 4.5:1 para texto normal. La combinación procede de Button/primary compartido.
- **Impacto:** reduce legibilidad de la acción que inicia mantenimiento; puede propagarse a otros CTA, cuya apariencia debe verificarse por pantalla.
- **Clasificación:** visual; dimensión accesibilidad. **Confianza:** observado y medido en el control citado. **Severidad:** S2 media. **Prioridad:** P1 por legibilidad de la acción prioritaria y criterio objetivo; alcance restante del componente por verificar.
- **Recomendación:** resolver contraste conservando navy, naranja y Roboto. Evaluar foreground navy existente (contraste calculado sobre ese naranja 4.75:1) y estados asociados; no cambiar toda la paleta ni asumir que ese cálculo aprueba todos los botones.
- **Criterio verificable:** texto normal del CTA observado ≥4.5:1, incluidos estados pertinentes; conservar diferenciación de acciones y revisar disabled/focus/hover. Referencia [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## H05 — Escape cierra Nueva orden sin restaurar foco al disparador

- **Evidencia:** E24 y prueba E28: seis Tab permanecen dentro del diálogo; Escape elimina el diálogo y `document.activeElement` queda en BODY. Se reprodujo en móvil; el pase anterior de escritorio también terminó fuera del disparador. No se inspeccionó lector de pantalla.
- **Impacto:** dificulta retomar teclado en el lugar donde se abrió la acción y puede obligar a recorrer nuevamente el shell.
- **Clasificación:** interacción; dimensión accesibilidad. **Confianza:** reproducido para esta ruta. **Severidad:** S2 media. **Prioridad:** P2 por retorno recuperable de teclado; incluir en el primer paquete si teclado es dispositivo prioritario confirmado.
- **Recomendación:** conservar/restaurar foco en el control que abre el overlay, respetando el patrón Radix propio.
- **Criterio verificable:** al cerrar por Escape, Cancelar y Cerrar, foco visible retorna al disparador válido; Tab sigue contenido durante apertura. Verificar en las dos presentaciones, con y sin datos.

## H06 — Campanita de Mecánico dirige a una vista fuera de permiso

- **Evidencia:** E20 muestra campanita; F06 la pulsa y E41 llega a `/notificaciones` con «Esta vista es para logística y administración» y retorno a Mi trabajo. RoleGate y `NotificationsController` excluyen MECANICO, pero también admiten SUPERVISOR (omitido por el mensaje). E23, entrada directa a Órdenes, dice «Acceso restringido al administrador directivo» aunque admite Supervisor/Admin.
- **Impacto:** un control compartido promete una tarea que ese perfil no puede realizar y comunica mal quién sí tiene acceso.
- **Clasificación:** organización e interacción; dimensiones comprensión, acción y consistencia. **Confianza:** observado en UI y contrastado con permisos declarados; denegación HTTP de cuenta pura no ejecutada (otras operaciones de dominio sí se probaron). **Severidad:** S2 media. **Prioridad:** P2 por destino recuperable; aplicar a capacidades existentes, sin ampliar CHECK.
- **Recomendación:** alinear affordances y mensajes con permisos existentes y explicar el retorno. No ampliar MECANICO ni conceder acceso como solución implícita.
- **Criterio verificable:** cada control visible para el perfil puro conduce a una capacidad autorizada o explica previamente la limitación; las restricciones describen correctamente los perfiles permitidos y permiten volver. Corroborar permisos HTTP en entorno habilitado.

## H07 — Reduced-motion no elimina la animación del sheet

- **Evidencia:** E27 y E28, media query reduce true: `sheet-overlay` animation 0.15s, `sheet-content` animation/transition 0.3s. `OPERATE_CRAFT.md` exige cero/sin animación con reduce y 150–250ms para transición habitual.
- **Impacto:** no respeta la preferencia del usuario ni el criterio local de motion; efectos de otros overlays no comprobados.
- **Clasificación:** interacción; dimensiones accesibilidad y consistencia. **Confianza:** reproducido para este sheet. **Severidad:** S1 baja en evidencia disponible. **Prioridad:** P3, implementación diferida por alcance explícito.
- **Recomendación:** registrar la excepción y resolver el comportamiento compartido cuando se autorice la etapa motion.
- **Criterio verificable:** con reduce, no animación/transition en apertura/cierre; sin reduce, duración conforme al criterio acordado. No se afirma incumplimiento global de WCAG a partir de esta prueba aislada.

## H08 — Selecciones de Órdenes y Consumo tienen gramáticas distintas

- **Evidencia:** E03/E15: Borradores activo usa azul `rgb(37,99,235)` y subrayado; E09 usa filtros de período de otro patrón. Marca base/nav permanecen navy/naranja. Hay `role=tablist/tab` en colas, pero su operación completa por teclado con datos está pendiente.
- **Impacto:** puede dificultar reconocer navegación, filtro y acción como categorías consistentes; no demuestra confusión de usuarios.
- **Clasificación:** visual y organización; dimensión consistencia. **Confianza:** diferencia observada; confusión/semántica son hipótesis. **Severidad:** S0 observación mientras no se pruebe impacto. **Prioridad:** P3.
- **Recomendación:** confirmar si cola es navegación o filtro y documentar patrón; conservar componentes útiles y evitar normalizar mecánicamente controles de distinta función.
- **Criterio verificable:** estado elegido reconocible por información adicional al color, comportamiento de teclado coherente y representación documentada para pantallas hermanas.

## H09 — Contexto y tablas de permisos documentales desfasados

- **Evidencia:** E40 contrasta AGENTS/ICM/PRODUCT «CHECK/TrustedActor no implementados» con código actual y selector/bandeja observados. README dice que Supervisor no puede cambiar umbrales; el decorator actual lo permite. El código no acredita despliegue ni usabilidad.
- **Impacto:** preparar una auditoría/sprint desde esos textos puede atribuir o descartar capacidades incorrectamente.
- **Clasificación:** datos/capacidad y organización; dimensión comprensión. Hallazgo documental, distinto de un defecto UI observado. **Confianza:** contradicción documental reproducible, CHECK completo no comprobado en la instancia, aunque acceso OIDC y cola vacía sí lo están. **Severidad:** S2 media por riesgo recuperable de planificación. **Prioridad:** P1 de validación previa; evitar comprometer tareas sobre capacidades sin comprobar.
- **Recomendación:** contrastar versión desplegada y permisos con responsables, registrar as-is separado de target y luego proponer corrección documental específica. No reabrir decisiones aceptadas ni modificar el contexto canónico en esta auditoría.
- **Criterio verificable:** una matriz aprobada distingue permiso declarado, permiso efectivo, flujo observado y target; cada discrepancia tiene resolución/versionado, sin marcar CHECK como operativo por un build o enum.

## Vinculación, exposición y cierre de cada registro

Estado común: **abierto para validación/corrección posterior**; responsable nominal **por asignar**; no hay SPEC/EWO de ejecución creada por esta auditoría. El backlog es el enlace de trabajo posterior. Exposición sólo indica las apariciones vistas; frecuencia en operación y prevalencia entre usuarios **desconocidas**. Los esfuerzos son rangos preliminares del backlog, de confianza baja por faltar solución acordada/casos completos/equipo; no reducen severidad. La confianza en evidencia se describe arriba y es distinta de la confianza de esfuerzo.

| Hallazgo | Rol / tarea / pantalla / flujo / escenario | Apariciones y afectados acreditados | Patrón / dependencia / esfuerzo orientativo | Validación o decisión; evidencia de cierre requerida |
|---|---|---|---|---|
| H01 | Supervisor; S01/S03/S04/S09/S10; P03/P05/P09/P10/P13/P14; F01–F04; 503 | Estados citados en desktop/mobile según E03–E38; riesgo humano sin medir | Disponibilidad; B10, B01–B03; 1–2 d, baja | Error/parcial/vacío real/datos con red y PNG actuales; comprensión con usuarios. No cerrar sólo porque desaparece el texto |
| H02 | Supervisor; S01; P02; F01/F02; consultas fallidas | Inicio d1440/m390; filas normales públicas E51/E52/E145 | Fila de atención; B11; 0.25–0.5 d, baja | PNG con Roboto, filas normales/fallidas, d1440/d1024/m390 y ampliación; escaneo con usuario pendiente |
| H03 | Supervisor; S01–S04/S08–S10; P02–P15 citadas; F01–F05; error recuperable | Instrucción sin acción en rutas listadas; contraste con Mecánico P17 | Recuperación; B12, B10/B02; 1–2 d, baja | Error→reintento→éxito sin pérdida de contexto ni escritura duplicada; distinguir permiso/sesión/servicio. Vincular P1 sólo si necesario para tarea |
| H04 | Supervisor; S03/S04; P03→P05; F01/F04; CTA disponible antes del error | Nueva orden local y Adjuntar ticket público medidos; resto de Button sin aprobación | CTA; B13; 0.5–1 d, baja | Medición de colores/estados, foco y PNG con Roboto; mantener marca. No extrapolar la aprobación a CTA no revisados |
| H05 | Supervisor; S04/X01; P05; F07; Escape | Nueva orden en dos tamaños; otras salidas por verificar | Overlay/foco; B14/B03; 0.5–1 d, baja | Registro de activeElement al abrir/cerrar/Escape/Cancelar, foco visible y trap, ambos layouts; sesión de teclado pertinente |
| H06 | Mecánico; M02/X01; P10/P16/P18; F06; destino restringido | Clic campanita m390 y acceso directo Órdenes d1440; mensajes omiten Supervisor | Navegación por rol; B15/B01; 0.5–1 d, baja | Matriz de controles/permisos HTTP por perfiles efectivos y PNG de retorno; decisión D-A01, sin nuevo permiso implícito |
| H07 | Supervisor; X03; P05; F08; reduce | Un sheet m390; no otros componentes ni efecto humano acreditados | Motion; etapa 3; implementación por estimar | CSS/media query + apertura/cierre con y sin reduce, capturas actuales; preferencia acordada y criterio local reconciliados |
| H08 | Supervisor; S03/S09; P03/P04/P13; F01/F03; selección sin filas | Dos gramáticas visibles; confusión hipotética | Selección; kit/D-A05; incluye diagnóstico de kit, ejecución por estimar | Resolver semántica con datos/usuarios, estados adicionales al color y teclado; documentar patrón y variantes útiles |
| H09 | Ambos; confirmar capacidad/permiso; informe/E40; preparación de F01/F06; contradicción documental | Fuentes/código/OIDC/cola pública vacía; ningún daño operativo acreditado | Contexto; B01; 0.5–1 d más disponibilidad, baja | Versión desplegada y permisos probados, matriz revisada por responsables; disposición de cada discrepancia. E44 resuelve plan ausente, no CHECK ni umbrales |

Para cerrar un hallazgo técnico se conserva evidencia de su criterio y de las regresiones pertinentes. Para declarar mejora de comprensión/éxito de tarea se añade observación con usuarios; una medición de contraste o un GET exitoso no acredita esa mejora humana.


## H10 — Cero coincidencias filtradas se presenta como inexistencia de borradores

- **Evidencia:** E53/E73 muestran tres borradores Correctivo. Se selecciona Preventivo en Filtros E93 y E94 muestra «No hay órdenes en borrador. Crea una orden aquí…». E95 conserva filtro y sí muestra cerradas preventivas. GETs previos exitosos y filtrado cliente; no fallo del servicio. En el vacío no aparece una acción contextual para quitar filtros.
- **Impacto:** podría hacer creer que falta trabajo o inducir creación innecesaria; frecuencia/duplicaciones humanas no medidas. La prevención de borrador duplicado E69 reduce ese riesgo, no corrige el mensaje.
- **Clasificación:** interacción/datos presentados; comprensión y acción; distinto de H01 (consulta exitosa).
- **Confianza:** alta para estado y copy; consecuencia humana hipotética. **Severidad:** S2. **Prioridad:** P1 por fidelidad al encontrar/reanudar mantenimiento actual; no por daño crítico acreditado.
- **Recomendación:** diferenciar cola vacía de cero coincidencias y hacer visible recuperación del filtro existente, conservando controles Team Mex.
- **Criterio verificable:** con tres correctivos y filtro Preventivo, el mensaje describe cero coincidencias y permite quitar filtros; al hacerlo reaparecen los tres. Sin filtro y sin filas, sí describe ausencia real. No duplicar una orden existente.
- **Vinculación:** Supervisor S03/P03–P04/F01; exposición un caso desktop; B16b, 0.5–1d confianza baja; responsable UX/producto por asignar. Validar interpretación con usuario.

## H11 — Pendientes antiguos no explican una relación de visita no disponible

- **Evidencia:** E83/E84 muestran PAST-FR-01 qty 4 y FIL-ACEITE-01 qty 11 con OT corta sin enlace. Sus visitas `f1c4ef48-04cf-4f4e-adeb-ae3a7b0bae2f` y `106f7dce-f53c-424a-ab9c-6e1676a31164` devuelven404 en la red E83; IDs de pendiente en E96. `OtLink/useOtLabels` captura errores y cae a texto sin explicar por qué. Nuevos casos sí enlazan unidad/visita E130/E137/E152.
- **Impacto:** esos dos registros no permiten reconstruir unidad/trabajo de origen desde esta pantalla/cuenta. No se acredita causa, borrado, pérdida de integridad general ni derecho a recuperar historia inexistente.
- **Clasificación:** dato/relación/acceso e interacción; trazabilidad y análisis.
- **Confianza:** alta para404/enlace ausente; baja para causa. **Severidad:** S2. **Prioridad:** P1 de investigación y presentación veraz en costura actual.
- **Recomendación:** diagnosticar el origen por responsables de datos/entorno; distinguir relación cargando/fallida/restringida/no disponible, manteniendo IDs y contenido accesible. Si la historia no existe, registrar carencia explícita sin rellenarla.
- **Criterio verificable:** caso disponible enlaza visita/unidad correctas; caso404 informa origen no disponible, permite conservar identificador y no promete detalle; error temporal y permiso se distinguen según respuesta efectiva. Disponer cada caso antiguo con evidencia de causa o límite persistente; no cerrar por agregar un enlace a404.
- **Vinculación:** Supervisor S09/P15/F03; dos pendientes preexistentes, desktop/móvil. B17a diagnóstico0.5–1d, reparación por estimar después de causa; responsable técnico/datos por asignar. Ninguna corrección de datos autorizada aquí.

## H12 — Firmas obligatorias sin vía equivalente operable por teclado

- **Evidencia:** E112 exige dos firmas, E113 impide Cerrar si faltan. E114 registra dos canvas con tabIndex −1, sin role/nombre; UI sólo muestra lienzos y Borrar firma. `SignaturePad.tsx` tiene mouse/touch, sin mecanismo de captura por teclado/alternativa visible. Trazos con puntero habilitan E115/E116 y persisten E140.
- **Impacto:** el requisito bloquea completar el cierre de mantenimiento usando sólo teclado mediante la interfaz observada. No se ejecutó lector ni se identificó un participante afectado; no demuestra prevalencia o violación legal global.
- **Clasificación:** accesibilidad/interacción; acción y comprensión de requisito.
- **Confianza:** alta para ausencia de acceso/alternativa y dependencia de puntero; prueba con tecnología asistiva pendiente. **Severidad:** S3 alta por barrera en requisito obligatorio. **Prioridad:** P1 del recorrido actual, separado de motion.
- **Recomendación:** acordar una vía accesible equivalente que conserve el requisito y significado de firma vigente; identificar cada captura, estado y acción. Añadir tabindex por sí solo no permite firmar. No sustituir firma por identidad autenticada sin decisión de producto.
- **Criterio verificable:** usuario sólo teclado puede aportar/revisar ambas firmas por mecanismo aprobado, corregirlas, conocer faltantes y cerrar; nombres/estados comprensibles con lector; captura por puntero actual sigue funcionando. El cierre inválido sigue bloqueado según reglas acordadas.
- **Vinculación:** Supervisor S07/P08d/F04/F07; dos canvas, ambos tamaños en revisión experta. B16a decisión/diagnóstico0.5–1d, ejecución candidata 2–4d tras acuerdo, baja confianza; producto/mantenimiento/UX por asignar. [WCAG2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) y [4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html) como criterios de contraste, sin certificación.

## H13 — «Servicio preventivo» no aclara que la referencia mostrada es el último cierre de cualquier tipo

- **Evidencia:** E119 después de preventivo muestra Último servicio100km. E128 después del correctivo de calibración muestra101km bajo Servicio preventivo. E129 confirma tipos distintos. `HubResumen` toma `historialCerrado[0]` y `ficha.ultimoKm`, no filtra tipo. No se afirma que Andon deba filtrar preventivos ni que su regla actual sea errónea.
- **Impacto:** puede atribuirse al preventivo una visita correctiva que sólo hizo calibración. Interpretación/confusión humana no comprobada; dato del último cierre es correcto en caso observado.
- **Clasificación:** organización/copy/definición analítica; comprensión y medición.
- **Confianza:** alta para fuente visible; media para ambigüedad. **Severidad:** S1. **Prioridad:** P2 tras confirmar significado con mantenimiento.
- **Recomendación:** explicitar el hecho y tipo que alimentan la referencia y separar definición del cálculo de su presentación; conservar regla vigente hasta decisión aparte.
- **Criterio verificable:** con preventivo100 y correctivo101 se reconoce cuál visita se usa y de qué tipo, con fuente trazable; no cambia regla/umbral por una corrección de copy. Producto resuelve si la etiqueta comunica la regla actual.
- **Vinculación:** Supervisor S02/S08/P07/F05; secuencia controlada nueva. B17b validación0.25–0.5d, ejecución por estimar según decisión; producto/mantenimiento por asignar.

## H14 — Cierre de comprobante se presenta como «Recibida» y retira el adjunto posterior

- **Evidencia:** E130 ofrece Adjuntar ticket y Cerrar comprobante. En registro nuevo sin ticket, cerrar devuelve éxito y RECIBIDA E131; no quedan acciones de adjunto. E140 confirma hasTicket false. En otra prueba, adjuntar antes conserva imagen y luego RECIBIDA E138/E139/E140. Stock sigue1. Lede «aún sin entrar al almacén» y «Cerrar el comprobante no cambia existencias».
- **Impacto:** puede confundirse cierre documental con recepción física y dificulta añadir evidencia si se cerró antes. No se supone ticket obligatorio, no se demuestra recepción física ni que toda API de recuperación esté ausente.
- **Clasificación:** comprensión/interacción/trazabilidad de evidencia.
- **Confianza:** alta para estado/controles/stock; media para consecuencia operativa. **Severidad:** S2. **Prioridad:** P2; decidir significado antes de cambiar regla.
- **Recomendación:** acordar qué hecho representa estado/acción/lede, si evidencia es opcional y qué recuperación necesita la tarea. Aplicar luego copy/confirmación/recuperación coherentes con permiso existente; no inventar entrada automática al almacén.
- **Criterio verificable:** con/sin ticket, estado y acción describen el mismo hecho y stock permanece conforme a regla. Recuperación de evidencia se ejecuta por mecanismo autorizado o la limitación se explica antes del cierre; no imponer obligatoriedad por esta auditoría.
- **Vinculación:** Supervisor S09/P15/F03; dos comprobantes sintéticos; B16c diagnóstico0.25–0.5d, copy0.5–1d después de decisión, nueva capacidad de recuperación por estimar/separar si requerida; producto/inventario/mantenimiento por asignar.

## H15 — Primarios naranja repetidos en acciones de fila

- **Evidencia:** E130 muestra tres Adjuntar ticket naranja sólido; E131 conserva dos, E150 acredita estilo primary. Visual QA/OPERATE_CRAFT/DESIGN_SYSTEM exigen un primario sólido por vista y acciones de fila secundarias. Coincide segundo pase independiente E155.
- **Impacto:** compiten por atención en costura de comprobantes; no hay error de negocio ni demora humana medida. Contraste de estos mismos controles se trata en H04, sin duplicar su estimación.
- **Clasificación:** visual/jerarquía/consistencia.
- **Confianza:** alta para repetición y criterio local. **Severidad:** S1. **Prioridad:** P2 de kit actual.
- **Recomendación:** usar variantes secundarias existentes en filas, conservando el primario pertinente por tarea y marca.
- **Criterio verificable:** vista con múltiples pendientes no presenta múltiples primarios sólidos y cada adjunto sigue visible/operable con foco/contraste adecuados; no cambiar permisos ni modelo.
- **Vinculación:** Supervisor S09/P15/F03; tres→dos filas; B16 d0.25–0.5d, baja confianza; UX por asignar. No revisar filas no observadas como si fueran defecto confirmado.

H10–H15 quedan **abiertos**, responsables nominales y aceptación por asignar. La exposición es sólo la muestra observada; no hay frecuencia/población operativa. Revisión independiente apoya hechos, no sustituye usuarios. H13/H14 requieren decisión semántica; H11 diagnóstico de relación antes de intervención. Ninguna ficha autoriza implementar.
