# UX — Subnavegación de módulo en sidebar desktop

## Autoridad / propósito
Petición expresa del propietario 2026-10-17: reemplazar navegación superior de sección por subnavegación dentro del módulo en sidebar desktop. Complementa [shell](ux-supervisor-identidad-sidebar-v1.md); sustituye su conservación de pestañas desktop para módulos alcanzados. No cambia ADR-003 ni permisos.

## Usuarios / alcance
Supervisor y Admin, sidebar ≥1024px. Implementación actual: solo Inventario (confirmado por propietario). Configuración se conserva como está; no inferir subsecciones para Órdenes o Unidades. No mover filtros, stepper ni navegación de una ficha de unidad. Móvil y tablet sin sidebar conservan navegación actual.

## Jerarquía / patrón / dirección Operate previa a JSX
P0 título/objeto y tarea; P1 acción de la vista; P3 módulo, sububicación y enlaces. Clonar WorkspaceSidebar actual: neutros navy/gris, indicador naranja solo ubicación, sin nuevos tokens, cards o animaciones. Eliminar duplicación horizontal únicamente donde exista sidebar. Inventario contiene Existencias, Análisis, Comprobantes y grupo Catálogo con Refacciones, Categorías, Proveedores. URLs y orden aprobados EWO-049 intactos.

Módulo con botón disclosure y chevron, aria-expanded/controls; seleccionarlo abre/cierra su subnavegación. Entrar en URL del módulo revela sus enlaces automáticamente. Una sububicación aria-current=page; padre contextual marcado visualmente. En rail plegado, pulsar icono del módulo expande sidebar y revela secciones, conservando página actual; no se ocultan destinos sin alternativa. Otros módulos siguen como enlaces. Foco visible, hover neutro, controles44px, scroll vertical de sidebar en altura corta; sin overlays nuevos. Subnav usa enlaces reales, sin role=menu ni filtros simulados.

## Estados / responsive
Normal, módulo expandido/contraído, sidebar expandida/rail, foco, hover y actual. Estados de datos/loading/error/empty siguen en sus vistas. ≥1024 esconder navegación superior duplicada; 768–1023 conservar pestañas; <768 conservar panel y bottom nav Supervisor/selector Admin. Reduced motion0 por regla existente; navegación sin nueva animación. Cambiar ruta/historial actualiza selección y revela módulo.

## Estándar aprobado para módulos
El propietario confirmó: «Solo inventario por ahora; Pero quiero que esto sea nuestro estándar para la navegación, para desktop este, y para teléfono, será la que tenemos en inventario». Para próximos módulos, desktop concentra las secciones dentro del módulo en sidebar; teléfono usa acceso directo al módulo desde bottom nav y, al estar activo, el mismo botón despliega sus secciones encima de la barra con foco visual y cierre del patrón Inventario. Si un módulo no tiene subsecciones, conserva enlace directo: no inventar destinos. La adopción de otros módulos/roles requiere su corte acotado; no implica migrarlos ahora ni añadir barra inferior Admin en este EWO. Filtros de datos, steppers y navegación de objeto permanecen en contexto. A800 se conserva solución intermedia hasta un corte explícito.

## Proof / exclusiones
1440 y1024, Sup/Admin: abrir módulo desde Inicio, seis enlaces, Catálogo jerárquico, contraer/reabrir, rail→abrir módulo, historial y scroll altura corta. Regresión800/390 con navegación disponible; teclado Enter/Tab y reduced motion. Lint/build, better-ui, CDP sin Playwright, ux-auditor independiente. No API, permisos, rutas nuevas ni CRUD.


## Corrección aprobada de navegación móvil — EWO-055
La corrección explícita del propietario sustituye la excepción anterior de Admin: Supervisor y Admin usan barra inferior en teléfono (<768), con el botón Inventario activo desplegando sus seis secciones. Se retira el selector superior de Inventario para ambos. Los cuatro módulos reutilizan la barra existente; funciones adicionales Admin permanecen en menú global. Desktop/sidebar y tablet768–1023 no cambian. La evidencia054 describe el estado anterior y no acredita esta corrección; ver [EWO-055](../engineering-work-orders/EWO-055.md).
