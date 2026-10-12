# UX — prioridad operacional de Órdenes

Petición de usuario (sesión2026-10-11 cliente): mecánico ve primero abiertas;
borradores con jerarquía secundaria y cerradas por acceso discreto de historial.
Tipos Correctivo/Preventivo/Revisión visibles como ListFilter de Inicio.

Parte autorizada independiente: sustituir Dialog de tipos por ListFilter inline,
icono+texto+selección neutral, grid2columnas móvil/fila desktop, URL existente.
Ocultar filtros al entrar en detalle móvil, conservar retorno y acceso a registros.
Hermano /inicio. Sin filtros naranja ni menús escondidos para los tipos.

Decisión de dominio pendiente: qué convierte BORRADOR de mantenimiento a abierta.
Estado actual sólo BORRADOR/CERRADO en legacy, con PENDING hasta cerrar. No inventar
DRAFT/emitida, no reinterpretar flags de compatibilidad como aprobación. Pregunta:
Abrir orden explícitamente / asignarla / iniciar trabajo.

Destino del mecánico: /mi-trabajo hoy sólo CHECK; /ordenes admite Supervisor/Admin.
Diseño posterior debe integrar mantenimiento de su patio y distinguir acceso de
consulta frente a ejecución. Fuentes plan/validacion-bandeja-mecanico-v1 y CHK-001.
No declarar completa la jerarquía o bandeja mecánico mientras falte transición.

## Definición confirmada

Usuario selecciona «Confirmar Abrir orden». Apertura de mantenimiento explícita:
marca fecha/actor; no equivale a iniciar/asignar/realizar trabajo. Borradores son
mantenimiento no terminal sin marca; Abiertas con marca. CHECK activo abierto
sin paso de borrador. Legacy BORRADOR sigue compatibilidad, no UI fase real.

Mi trabajo de Mecánico: título Órdenes abiertas; selector Abiertas predominante,
Borradores secondary y Cerradas en botón quiet Historial. Tipos ListFilter iconos,
texto y conteos como Inicio. Mantener acciones CHECK claim/start/continue actuales.
Mantenimiento en consulta con Abrir orden sólo en borradores; sin escritores nuevos
para ejecutar/cerrar. Lectura dentro de patio; historial CHECK sólo propio.
Supervisor Órdenes adopta misma jerarquía y apertura. Admin conserva lectura de
cerradas. Sin nuevos campos/estados de programación/asignación ficticios.

AC02 apertura idempotente/actor/scope/terminal/CHECK protegidos sin efectos mantenimiento;
AC03 abiertos default, borradores secundarios, historial quiet y filtros claros;
AC04 mecánico consulta mantenimiento scope/CHK own-eligible e historial propio;
AC05 unit/E2E/migración/build/lint/CDP/QA independientes.

## Ajuste visual autorizado — fotos y tipo

Usuario solicita foto de unidad y color del tipo de paro/orden. Etiquetas: Correctivo
rojo (Badge danger), Preventivo azul (info), Revisión navy (secondary), usando tokens
existentes. Color identifica tipo, no urgencia; texto siempre visible. Filtros neutros.
UnidadMarca presenta fotoDataUrl registrada y fallback de vehículo si no existe.
Proyección canónica añade sólo foto de unidad, con mismos filtros/scope; no consulta
catálogo global ni crea fotos ficticias. Mantenimiento/estado/lifecycle intactos.

Ajuste solicitado: miniatura de unidad usa tamaño lg existente (foto88x66px, fallback88x64), conservando identidad y etiqueta a su lado.

## Referencia aprobada — identidad de orden y menos botones

Usuario autoriza construir desde el mockup aprobado. Patrón3 listado filtrado,
hermano /inicio para filtros y /mi-trabajo para cola; mantener desk de Supervisor.
Cada registro es una orden, no una unidad: encabezado documental FileText para
mantenimiento / ClipboardCheck para revisión, título y referencia real compacta
(OT o CHK + primeros8 caracteres del ID, misma receta numeroOrden existente).
No crear numeración secuencial ficticia. Foto88x66, unidad, placas, tipo y estado debajo.
Correctivo Wrench; Preventivo CalendarCheck; Revisión ClipboardCheck; Todos List.
Iconos decorativos con texto. Encabezado documental es identificador de fuente
solicitado explícitamente, excepción acotada al default sin iconos por fila.
Tarjeta navegable por teclado: identidad abre consulta, chevron indica navegación;
CTA CHECK separado para tomar/iniciar/continuar, sin controles anidados. Borrador
abre detalle y ofrece Abrir orden dentro de éste. Historial secundario junto al título;
Abiertas/Borradores selector neutral. Supervisor mantiene captura/consulta existentes.
AC06 identidad + referencias reales + fotos/fallback y colores, sin folios ficticios;
AC07 navegación teclado, filtros/colas, detalle y apertura accesibles sin Ver orden;
AC08 lint/build, click-through m390/d1440 y QA independiente.
