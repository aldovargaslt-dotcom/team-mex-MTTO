# UX spec — Ficha de unidad v1 y consulta de costos

Estado: **Proposed** para la especificación completa; dirección de A aceptada mediante «Sigamos con tus recomendaciones». Acompaña [SPEC-MTTO-UX-002](../specs/SPEC-MTTO-UX-002.md). Documentación solicitada, sin aprobación de ejecución. Los AC canónicos viven en esa SPEC.

## GrillMe — precisiones del recorrido

Una orden continuable autorizada: acceso directo. Varias: selector con tipo, estado y fecha disponibles, sin escoger automáticamente la primera; decisión aceptada por el usuario. Respetar alcance y capacidades actuales.

Si historial aporta choferNombre, usar label Chofer. El registro de km en orden cerrada no prueba fecha de lectura física. Fallos de fuente no significan Al corriente. Primera entrega de costos futura se etiqueta Costo de refacciones; Mano de obra/Otros esperan fuente real.

## Screen purpose

Ayudar a mantenimiento a identificar la unidad, entender el pendiente y actuar; permitir reconstruir servicios y, con fuente autorizada, consultar su gasto.

## Primary user

`SUPERVISOR`, mobile y desktop; `ADMIN_DIRECTIVO` consulta y edita solo lo permitido. Costos requiere decisión explícita de acceso. No se amplía acceso a Logística ni otros roles.

## Questions the screen must answer

1. ¿Qué estoy viendo? Unidad, placas, tipo, sección y periodo en costos.
2. ¿Hay algo mal? Pendiente concreto y datos insuficientes/antiguos.
3. ¿Debo actuar? Continuar o crear orden según capacidad; edición solo Admin.
4. ¿Cuál es el estado ahora? Estado administrativo, condición preventiva y fechas/fuentes reales; Salud según decisión D-01.
5. ¿Qué apoyo hay? Ficha, servicios, desglose y órdenes que explican costos.

## Primary action

| Contexto | Acción |
|---|---|
| Supervisor con orden continuable | Continuar orden, `default` |
| Supervisor con creación permitida y contexto pertinente | Crear orden de mantenimiento, `default` |
| Admin / ficha en lectura | Sin primario de mantenimiento; Editar datos `secondary` |
| Historial / Costos | Seleccionar mes y Ver orden; no añadir CTA naranja de creación por decoración |

Un fill naranja máximo; no duplicarlo entre encabezado y panel principal. Las acciones siguen las capacidades reales, no un `hub.borradores[0]` asumido como regla universal nueva.

## Secondary actions

Editar datos / Completar ficha `secondary` solo Admin; Ver mantenimiento, Ver historial, Ver orden y Volver a unidades como enlaces. Marcar como enterado `outline` con permiso vigente. Sin menú vacío, sin captura directa de odómetro en A.

## Information hierarchy

| Vista | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| Resumen | Identidad y excepción única | Acción pertinente | Lectura con fecha/fuente, estado | Identificación corta y actividad sin duplicar aviso |
| Ficha técnica | Identidad y datos agrupados | Editar solo autorizado | Identificación, marca/modelo y año | VIN, timestamps y campos faltantes |
| Mantenimiento | Condición y causa | Continuar/crear según capacidad | Intervalos, límites y órdenes reales | Detalle de último servicio |
| Historial/Servicios | Servicio/trabajo/fecha | Ver orden | Filtros y km/responsable | Refacciones y conteos útiles |
| Historial/Costos | Periodo, moneda y gasto confirmado | Mes seleccionado → órdenes | Serie mensual y categorías | Aclaraciones de cobertura y fecha de actualización |

No se pinta: costo/km, adquisición, gráficos decorativos, métricas inferidas, cero ante error, quinta pestaña. No repetir misma alerta como actividad destacada. Salud se mantiene compacta y visible con acceso a su desglose, por recomendación aceptada. El pendiente conserva prioridad. Captura independiente de kilometraje diferida; solo lectura con fecha disponible.

## Pattern

Patrón **5, hub/ficha de objeto**, con patrón **3** para detalle histórico filtrable. No dashboard de Inicio o Flota. Costos es contenido del objeto dentro de Historial, no nueva home financiera.

## Clone

Hermano: `/unidades/:id`, `HubIdentityHeader` + `HubFichaNav` + lectura actual de servicios. Reutilizar shell, Button, FormAlert, campos y tabla; contraste y recuperación de SPEC-MTTO-UX-001. El cambio propuesto de riel a pestañas horizontales mantiene los cuatro destinos/URLs y requiere aprobación del corte, no reescritura silenciosa del brief vigente.

## Color y tipografía

Roboto y tokens Team Mex de ADR-003, sin los HEX aproximados de las imágenes. Preventivo #24284D y Correctivo #C45D23, fuente `.history-mix`. CTA #EA7515 y texto navy. Categorías de gasto en tono neutro común con etiquetas/importes; no sugerir que una categoría corresponde a un tipo de servicio.

Reutilizar escala del sistema: H1 compacto, no el título sobredimensionado del mockup. Texto de datos legible, secundario ≥12px y mínimo de contraste 4.5:1; preferir 14–16px en lectura móvil. Espaciado coherente, radio 6–8px, sin gradientes ni sombras nuevas. Badges solo para estado útil; selección de periodo/subvista usa estilo de navegación existente y no naranja sólido de CTA.

## States

- loading: **Cargando ficha de la unidad…**, **Cargando costos…**; no ceros.
- empty servicios: **No hay servicios cerrados registrados**.
- empty filtros: **No hay resultados con estos filtros** + **Quitar filtros**.
- empty costos con fuente disponible: **Sin costos registrados en este periodo**.
- unavailable costos: **Los costos de mantenimiento aún no están disponibles**.
- error: **No se pudo cargar [recurso]** + **Reintentar**, conservando fuentes sanas.
- normal: hechos confirmados, lectura fechada y importes reconciliados.
- warning: lectura antigua solo con política definida; sin fecha, **Fecha de lectura no disponible**; **Registro de costos incompleto** sin falso total.
- critical: magnitud del mantenimiento vencido con texto, no página teñida de rojo.
- success: refresco confirmado y anuncio accesible; no modal de éxito innecesario.
- disabled: controles ocupados con estado y etiqueta; navegación sana no bloqueada por fallo de Costos.

## Interaction notes

- Secciones principales son enlaces a URL con `aria-current`. No usar roles tab sin interacción ARIA completa.
- Mantener `returnTo` seguro, contexto y filtros; Atrás funciona.
- En Costos, barras seleccionables con tacto, teclado y foco. El valor no depende de hover. Anunciar mes seleccionado y cambio de detalle con región de estado discreta.
- Detalle textual/tabla accesible para cada mes: Preventivo, Correctivo y total; categorías también disponibles como lista textual.
- Filtrar periodos actualiza todas las visualizaciones bajo el mismo alcance; estados de carga por recurso y respuestas tardías descartadas.
- Se selecciona un mes con registros por defecto; vacío de otro mes confirmado explica ausencia sin inferir cobertura global.
- Overlay por portal; nuevos controles con hover, foco visible y disabled; respetar movimiento reducido y patrones existentes.
- No sticky CTA que tape filas/campos. Preferir acción dentro de su bloque; si se fija en móvil, reservar espacio y respetar safe area.

## Mobile / responsive

- **1440:** identidad compacta; navegación horizontal; pendiente y lectura en columnas cuando cabe; Historial tabla; Costos gráfica mensual y categorías en columnas, órdenes debajo.
- **1024:** reducir columnas según ancho del contenido; gráfica nunca estrecha al punto de perder labels. Evitar card + card + borde de tabla redundantes.
- **768:** una columna si los datos/controles no caben. Orden de DOM coincide con lectura, sin CSS que invierta foco.
- **390 y 360:** una columna, hits ≥44px, pestañas desplazables con nombre completo y selección visible. No abreviar Mantenimiento a Mantto. como única etiqueta. La navegación puede desplazar horizontalmente, el cuerpo de página no.
- Móvil: identidad → pendiente/acción → lectura → apoyo. Servicios en tarjetas con los mismos campos. Costos: periodo → acumulado/subtotales → gráfica → detalle del mes → categorías, o categorías antes de detalle si no oculta la relación selección→órdenes. Fijar el orden en prototipo y verificarlo.
- Gráfica móvil: seis meses por defecto, etiquetas cortas de mes con año en contexto. Para 12 meses, usar región de gráfica desplazable identificada o rango visible reducido con acceso a todos los meses; no reducir texto para encajar.
- Zoom 200%: reflow, sin cortar valores ni acciones. No depender de orientación horizontal del teléfono.

## Fuera / Don’t

No modificar runtime/API en esta entrega. No eliminar Salud, otorgar permisos de edición, crear flujo de odómetro, calcular preventivo en UI, cambiar enums ni financiar datos de inventario. No mezclar Flota, CHECK o notify. Costos tiene decisiones pendientes; no hardcodear mockups como datos de la unidad.

Los mockups de costos contienen sumas/alturas inconsistentes y colores aproximados. **Dataset corregido y semántica de colores en SPEC** prevalecen; regenerar gráficas desde datos reales del prototipo, no copiarlas como imagen de producto.

## Proof

Referencias ilustrativas en [índice de mockups](../design/references/ficha-unidad-v1/README.md); no son evidencia de UI implementada.

Prueba futura: entrar desde `/`, rol autorizado, abrir unidad y recorrer cuatro vistas; B añade periodo, selección de mes, orden y Atrás. Capturar normal, incompleto/error y permiso pertinente. Viewports 1440×900, 1024×768, 768×1024 y 390×844, más comprobación 360px y zoom.

Nombres sugeridos: `mtto_ficha_v1_{resumen|tecnica|mantenimiento|historial}_{d1440|m390}.png`, `mtto_costos_v1_{normal|mes|empty|error|partial}_{d1440|m390}.png`, bajo `docs/screenshots/`. Según proof-ui, sin DevTools ni Playwright.

Auditoría independiente por `ux-auditor`: jerarquía, legibilidad/contraste, utilidad/fidelidad de datos, acciones, consistencia y responsive/accesibilidad. Cada dimensión ≥8.5/10, cada vista y viewport afectado; gates de VISUAL_QA obligatorios y sin P0/P1 abiertos. Un fallo obligatorio da **no OK** aunque el promedio supere 8.5. Corregir, recapturar y repetir aspectos afectados. Registrar notas/evidencia en EWO/evidence, no autoaprobar imágenes ni declarar un 10 sin pruebas de uso.
