# SPEC-UI-SUPERVISOR-001 — Identidad y navegación Supervisor, piloto

## Status
Approved para este piloto. Autorización del propietario en esta conversación: «Construyelo», después de cerrar las decisiones de GrillMe. Fecha: 2026-10-17. La instrucción autoriza implementar el alcance descrito; no despliegue.

## Problem / Context
La navegación horizontal limita el espacio y la identidad visual se percibe oscura. Evolucionar el shell compartido de Supervisor/Admin y probar una dirección clara con identidad Team Mex en Comprobantes y Piezas, preservando sus tareas.

## Goals / Functional Behavior
Sidebar clara desktop plegable, contenido legible, navy estructural y naranja como identidad/acción. Mantener rutas y capacidades por rol. Pilotar un lenguaje de movimiento funcional consistente.

## Non-goals
API, datos, permisos, nuevas funciones de Stitch, dark mode/selector, reorganizar contenidos o rediseñar otras áreas. Sin despliegue. Logística/Mecánico conservan su shell; Admin comparte el nuevo shell para no duplicar navegación.

## Actors / Business Rules / Domain Implications
SUPERVISOR y ADMIN_DIRECTIVO. Reutilizar NAV_ITEMS y restricciones existentes. Área provisional shared; no nuevas reglas ni Bounded Context. Estado documental, costos y reglas de stock permanecen independientes e intactos.

## State Transitions / Failure Behavior
Sidebar expandida ↔ plegada, estado local de sesión del componente; sin persistencia entre recargas. Navegación conserva selección por ruta. Estado de sesión fallido conserva manejo actual. No ocultar contenido por fallo de animación.

## Constraints
CSS variables y primitivas existentes, sin dependencias nuevas. Roboto, #EA7515 y #24284D de ADR-003. Sidebar a partir de 1024 px, menú adaptable por debajo; bottom nav Supervisor conserva umbral 768 px. Pantallas enfocadas /checks/* conservan tratamiento existente sin añadir sidebar. Nombres accesibles y etiquetas visibles por foco/puntero cuando plegada. Movimiento reducido elimina animación del alcance.

## Acceptance Criteria
- **AC-01:** Con Supervisor o Admin autenticado, a ≥1024 px aparece sidebar con sus destinos autorizados, sesión y campanita accesibles; la cabecera no duplica navegación.
- **AC-02:** Al plegar/desplegar, un botón de nombre español anuncia aria-expanded; se conserva foco y los destinos siguen utilizables mediante teclado. Plegada muestra iconos con etiquetas por foco/puntero y nombres accesibles.
- **AC-03:** Al navegar, la ubicación activa se distingue por indicador naranja y aria-current; filtros mantienen selección neutra. No aparecen capacidades adicionales por cambiar presentación.
- **AC-04:** A 390 px permanece la navegación inferior Supervisor y el menú adicional; a 768–1023 px el menú da acceso a todos los destinos. No hay superposición ni overflow de página por el shell; tablas mantienen su scroll interno existente.
- **AC-05:** Comprobantes y Piezas conservan datos, búsqueda, filtros, overlays y reglas de acción actuales; Piezas conserva Continuar disabled ante stock insuficiente y enabled con compra externa válida.
- **AC-06:** Las vistas piloto usan superficies claras, navy, acentos naranja y estados pastel semánticos. Conservan un único CTA sólido naranja por vista cuando procede, Roboto y contraste AA de controles nuevos.
- **AC-07:** Plegado y overlays afectados comunican estado en 150–250 ms sin coreografía de carga; el plegado es reversible y los controles son utilizables durante transición; prefers-reduced-motion elimina su animación. Guardado/error conserva texto y no depende de movimiento.
- **AC-08:** Logística, Mecánico, login y flujos /checks/* no adquieren sidebar; los destinos de Admin y Supervisor siguen accesibles, incluyendo secundarios y sesión.

### Revisión solicitada — navegación móvil de Inventario
Autorizada en esta conversación por «la navegación superior no se ve bien… revisar cómo optimizarla». Se incluye como corrección del piloto, sin nuevas secciones ni permisos.

- **AC-09:** A <768 px Inventario muestra un control de navegación con nombre de sección actual completo y affordance de apertura. Al activarlo, un Sheet inferior muestra las cuatro vistas operativas y Categorías/Proveedores sin scroll horizontal. Son enlaces reales, con sección actual anunciada, objetivos ≥44px, foco contenido y retorno al control al cancelar. Seleccionar una sección cierra el panel; back/forward actualiza el nombre. A ≥768 se conservan las pestañas y se cierra el panel móvil si estaba abierto. A320/390 y con altura corta no hay overflow de página ni destinos inaccesibles; motion200ms/reduced0 y filtros neutros se conservan.

### Ensayo desde barra inferior — AC-10
El propietario autorizó probar la propuesta de navegación desde el botón inferior («tratemosla»), después de acordar entrada directa a un módulo distinto y apertura de subsecciones al retocar el módulo activo.

- **AC-10:** En Supervisor móvil, tocar Inventario desde otro módulo navega directamente a Existencias. Dentro de Inventario, el botón inferior activo muestra flecha y abre/cierra un panel de navegación inmediatamente encima de la barra. No hay selector superior duplicado. El panel contiene las mismas seis secciones, anuncia sección actual, permite Escape/cancelación con retorno al botón, selección sin redirección previa a Stock, y acceso directo a los otros módulos. Es un panel no modal: no bloquea la barra ni oscurece la página; al tocar fuera se cierra. Sin nuevas subsecciones de Órdenes/Unidades/Inicio. En320/390 y altura corta todos los destinos son alcanzables; teclado, movimiento reducido y cambio a desktop funcionan. Admin conserva el selector superior AC-09 porque no tiene barra inferior; desktop conserva pestañas.

AC-10 sustituye la ubicación/semántica modal del selector AC-09 exclusivamente para Supervisor móvil. El resto de AC-09 permanece, incluida navegación real por seis destinos y rutas Atrás/Adelante. Probar como hipótesis del piloto, no declarar superioridad por estética.

### Foco visual de la navegación — AC-11
El propietario pidió «desenfocar un poco lo demás» para centrar atención en la navegación. Esta revisión sustituye únicamente la ausencia de atenuación de AC-10; conserva panel no modal, barra operable y destinos.

- **AC-11:** Con el panel inferior de Supervisor abierto en móvil, cabecera y contenido de la página se desenfocan suavemente (2px) y atenúan (opacidad0.5); panel y barra conservan nitidez, contraste y operación. No se anima el filtro: solo opacidad150ms, o0 con reduced motion. Tocar el contenido atenuado cierra el panel sin activar acciones de fondo. Escape, retocar Inventario, seleccionar sección y cambiar de módulo restablecen presentación sin foco visual residual; al ampliar a desktop también. No aplicar este tratamiento al selector modal de Admin ni a vistas sin panel abierto. Sin cambios de layout, API o permisos.

## Dependencies / Related ADRs
ADR-003; UX enlazada; shaping acordado. La UX de este incremento sustituye exclusivamente la geometría topbar desktop para estos dos roles y el breakpoint del shell nuevo, no los tokens ni reglas del ADR. La frase de primario azul en VISUAL_DIRECTION no aplica: rigen ADR-003 y DESIGN_SYSTEM (naranja).

## Open Questions / Edge Cases
Sin decisión material pendiente para el piloto. Sidebar clara, anchos 232/72 px y plegado sin persistencia son decisiones reversibles de implementación. Validar zoom, altura corta, cambios de viewport, rutas anidadas y regreso de overlays.

## Traceability and impact
PRD no aplica: evolución visual sin proceso nuevo. [Shaping](../../workspace/shaping/supervisor-identidad-sidebar-motion-grillme.md). [UX](../design-system/ux-supervisor-identidad-sidebar-v1.md). Fuente técnica: AppShell.tsx, globals.css, pendientes/page.tsx y PiezasStep.tsx. Sin migración ni contrato API.

## Negative cases and UI states / AC-to-test plan
AC-01–04,08: click-through de roles, destinos, plegado, teclado, 1440/1024/800/390 y zoom. AC-05: búsqueda/filtro, sheet y stock insuficiente → compra externa. AC-06: inspección render y contraste. AC-07: observación dinámica CDP y movimiento reducido. Loading/empty/error/disabled existentes se preservan y se comprueban en fixture descartable. Resultados en evidencia EWO-047, nunca pruebas planeadas como PASS.

## Risks and assumptions
Shell compartido requiere regresión Admin, ancho útil menor con sidebar, overlays y footers del wizard. El piloto no implica aprobación visual humana final ni rollout a todas las superficies.
