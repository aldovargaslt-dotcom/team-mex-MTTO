# UX — Supervisor: identidad, sidebar y movimiento v1

## Estado y autoridad
Piloto autorizado por «Construyelo» (2026-10-17). Complementa [SPEC](../specs/SPEC-UI-SUPERVISOR-001.md). Enmienda explícitamente la disposición topbar desktop de DESIGN_SYSTEM para Supervisor/Admin y sus breakpoints: sidebar ≥1024, menú 768–1023; no modifica ADR-003, permisos ni arquitectura de información.

## Screen purpose / Primary user
Supervisor navega entre sus tareas y completa comprobantes/piezas sin perder contexto. Admin comparte el shell con sus destinos. Operate, no landing.

## Questions the screen must answer
Dónde estoy (título y destino activo), qué sigue (acción existente), qué estado tiene (badges semánticos), dónde puedo ir (sidebar/menú), quién opera (rol y sesión).

## Primary action / Secondary actions
Acciones de cada vista intactas. Plegar menú / Expandir menú son controles secundarios neutros; no nuevo CTA naranja. Filtros neutros. Inicio sigue sin CTA sólido ni KPIs añadidos.

## Information hierarchy
P0 título/objeto; P1 acción de tarea; P2 datos/estados; P3 navegación y metadatos. Sidebar clara, texto navy, iconos lucide, indicador naranja para ubicación. Sin fill naranja en todos los enlaces. Pasteles solo en estados y excepción de entrada aprobada.

## Pattern / Clone / Dirección Impeccable Operate
Clonar contenido de Comprobantes actual (lista documental + sheet) y Piezas actual (Card por paso + stepper). Shell es la evolución nueva deliberada: riel lateral, cabecera de utilidad compacta, área de contenido ≤1040 px. Blanco, gris cálido y navy; Roboto, radios 6 px, sin nuevas sombras. Logo Team Mex existente sobre placa navy, sin inventar marca. Tokens por función para sidebar, selección, movimiento y piloto; sin theme oscuro.

## States
Normal expandida 232 px, plegada 72 px, inicialmente expandida. Foco navy visible y tooltip por teclado/puntero. Hover neutro, activo con naranja y texto navy. Botón de plegado sin disabled porque disponible siempre. Loading/error/empty, stock insuficiente y guardado usan copy y componentes actuales. Sin nuevo feedback de guardado ni cambios de reglas.

## Interaction notes
Destinos y sesión conservados; navega enlaces reales, aria-current por ruta exacta o segmento descendiente. Sidebar permite scroll en altura corta; tooltip escapa clipping mediante portal. Transiciones de 200 ms solo para estado; overlays afectados 200 ms. Sin animación de navegación de página, escalas o bounce. Reduced motion: 0 ms. Overlay portal y foco de Radix conservados.

## Mobile / responsive
1440: sidebar y contenido centrado en espacio restante. 1024: sidebar plegable, tablas con scroll local. 768–1023: menú completo, sin sidebar ni enlaces horizontales duplicados. 390: shell compacto y bottom nav original de Supervisor, hits ≥44 px. Wizard sticky no cambia; safe-area conservada. Login, Logística, Mecánico y checks no reciben sidebar.

## Fuera / Don’t
Sin funciones de Stitch, dark mode, cambios API, navegación de dominio nueva, gráficos ni reorganización de vistas. Piloto no es rollout completo.

## Proof
EWO047: sidebar expandida/plegada en d1440, tabla d1024, menú a800, Comprobantes sheet m390, Piezas disabled/enabled m390 y d1440, Admin y movimiento reducido. Screenshots en docs/screenshots/ewo047_*.png; click-through desde role picker, observación de transición real, better-ui y ux-auditor independiente. Hold SD / visual OK humano permanece explícito.


## Revisión del piloto — Inventario móvil (AC-09)
Petición expresa del propietario tras probar/ver el piloto: mejorar navegación superior móvil. Dirección Operate: la fila horizontal oculta destinos y muestra scrollbar compitiendo con el indicador de ubicación. A <768, reemplazar solo esa navegación por un botón compacto de ancho disponible: icono de sección, contexto «Inventario», nombre actual y chevron. Es navegación (no filtro); usa estilo neutro y acento naranja de ubicación, sin nuevo CTA sólido. Mantener H1 de la tarea.

Clonar el patrón de Sheet existente del menú móvil, adaptado a panel inferior alcanzable con pulgar. Título «Secciones de Inventario», descripción «Elige la sección que quieres consultar.». Dos grupos de enlaces reales: Operación (Existencias, Refacciones, Análisis, Comprobantes) y Catálogo (Categorías, Proveedores). Actual con aria-current, texto navy e indicador/check naranja; sin semántica de filtro ni role=menu. Portal, scroll vertical contenido, max90dvh, safe-area, hits44, fondo sólido y cierre accesible. No segunda subnav de Catálogo en móvil. El panel enfoca el destino actual al abrir; Escape/cancelación devuelve foco al disparador. Tras navegar, no forzar foco al control anterior; priorizar foco de navegación de Next. Al cruzar768 con panel abierto, cerrar y enfocar enlace desktop actual.

A ≥768 no modificar geometría ni destinos de las pestañas; conservar auto-scroll del activo. No modificar listas, datos, acciones, filtros ni reglas de negocio. Prueba desde role picker para Supervisor/Admin en320/390, navegación por los6 destinos, back/forward, cancelación, teclado, reduced motion y resize; capturar panel y vista cerrada, más regresión desktop1440. Repetir better-ui y pase independiente ux-auditor solo sobre superficies afectadas.


## Ensayo autorizado — Inventario desde barra inferior Supervisor (AC-10)
El propietario aceptó probar la propuesta desde el botón inferior. Supervisor: primer toque desde otro módulo entra a Existencias, botón activo Inventario muestra flecha ascendente y nombre accesible de la sección actual; retocar abre/cierra sus destinos encima de la barra. Eliminar únicamente el selector superior de Supervisor móvil. Inicio, Órdenes y Unidades siguen con acceso directo; no inventar subsecciones ni confundir sus filtros con navegación.

Dirección Operate: reutilizar contenido/links/selección del panel AC-09; extraer componente común para ambos disparadores. Para la barra inferior usar Sheet/Dialog no modal, visualmente anclado encima de58px+safe-area: sin backdrop ni bloqueo de la barra o foco atrapado. Escape y selección actual devuelven foco al botón; navegación a otra sección deja gestión de foco a Next; interacción externa cierra sin secuestrar foco. Los otros módulos siguen operables con un toque desde el panel abierto. Botón anuncia aria-expanded/haspopup, flecha visible se invierte al abrir, targets≥44px, altura disponible con scroll vertical contenido, estados200ms/reduced0. Desktop no cambia; al ampliar cerrar panel y enfocar pestaña visible. Admin mantiene el selector superior AC-09 para conservar acceso a todas las secciones sin añadirle bottom nav.

Prueba: role picker Supervisor → Inicio → Inventario → retocar botón; recorrer seis enlaces, abrir/cerrar desde botón, Escape, seleccionar actual, clic fuera y cambio a otro módulo con panel abierto;320/390 y altura corta; teclado sin trampa modal, back/forward, reduced motion, resize768/1440 y regresión Admin. Capturas separadas AC-10; better-ui y ux-auditor independientes. Es una alternativa en evaluación, no validación comparativa con usuarios.


Detalle de craft AC-10: la fila inferior mide58px más borde de1px y safe-area;
el panel se alinea por encima de esos59px. Su entrada/salida usa fade200ms sin
traslación para no cubrir objetivos táctiles de la barra durante la animación.
El loop heredado de Tab de Dialog se desactiva funcionalmente en los límites
solo para esta variante: Tab sale a Inicio y Shift+Tab al disparador.


## Foco visual solicitado — AC-11
Petición explícita del propietario: dar foco a la navegación y desenfocar el resto. Con panel inferior open y viewport<768: filtrar solo header y main con blur2px y opacity0.5, conservando panel portaled y barra inferior nítidos. Opacity150ms; filtro instantáneo para evitar animación costosa y mareo; reduced motion0. Es feedback de estado funcional solicitado, no blur decorativo por receta externa. Sin backdrop que cubra barra ni trampa modal. Fondo atenuado no recibe acciones de puntero: el toque cae en el contenedor exterior, cierra el panel mediante DismissableLayer y no activa controles subyacentes. Al cerrar, navegar o ampliar se elimina el tratamiento. Scope solo Supervisor/panel inferior; Admin conserva comportamiento existente. Capturar390/320, abierto/cerrado, revisar interacción fuera, cambio de módulo, teclado, reduced motion y resize. Revisión better-ui y auditor UX independiente sobre este delta.

## Integración posterior — EWO-062

La sidebar única aprobada en este chat pasa por
[APPLICATION_NAVIGATION](../design/APPLICATION_NAVIGATION.md). Se conservan las
capacidades de Inventario de este brief, migradas al renderer/catálogo canónico;
la implementación WorkspaceSidebar se retira para no mantener dos shells.
