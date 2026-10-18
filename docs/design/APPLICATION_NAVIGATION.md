# Estándar de navegación de aplicación — sidebar

**Aceptado por el usuario,2026-10-18.** La sidebar nueva es el estándar compartido,
no una variante de Unidades. [EWO-061](../engineering-work-orders/EWO-061.md).
Reemplaza variantes anteriores de navegación principal para futuros cambios e
integración con main; no amplía permisos ni modifica contenidos de las páginas.

## Fuentes únicas

- `web/src/components/AppShell.tsx`: composición, marca, sesión, expansión y Sheet.
- `web/src/components/ApplicationNavigation.tsx`: catálogo de rutas/roles/etiquetas/
  iconos, selección por ruta y render de desktop/móvil. Los accesos inferiores
  se derivan del mismo catálogo; no se duplican nombres/iconos en cada pantalla.
- `web/src/app/workspace.css`: layout y estados del shell para todas las secciones.
- [Tokens/primitivas](DESIGN_SYSTEM.md),
  [ADR003](../adr/003-shadcn-tailwind.md).

Una nueva página entra al shell existente. Para agregar/cambiar un destino se
edita el catálogo, respetando permisos de servidor. No crear otro sidebar, menú,
catálogo local ni reglas `.app-sidebar` en CSS de features. La selección nunca
se condiciona a `/unidades` u otro módulo. Subnav/tabs de objetos no son sidebar.

## Contrato visual

- Desktop≥768: riel blanco224px, contraído72px; borde de sistema, radio6px,
  marca navy con logo blanco, sesión y salida al pie. Sin sombras/gradientes.
- Enlace13px, iconoLucide16px, gap12px, objetivo44px.
- Activo: fondo navy `--navy`, texto/icono blanco `--white`, peso600; igual en
  Inicio, Unidades, Inventario, Configuración y demás rutas. No subrayado naranja
  o activo gris por feature. Hover activo conserva contraste; inactivo neutro.
- Colapsado conserva aria-label/title. Navegar conserva estado de expansión
  durante la sesión del shell; no se introduce persistencia entre recargas.
- Topbar blanca contextual64px, contraer/expandir, campanita y rol; mismas fuentes.
- Mobile<768: header existente, menú izquierdo por Sheet/portal, mismo catálogo,
  etiquetas/iconos y estado activo. Escape/cerrar devuelve foco al disparador;
  scroll contenido y44px. Accesos inferiores Supervisor/Logística son subconjuntos
  del catálogo y conservan su comportamiento responsive.
- Selector de rol `/` y flujo concentrado `/checks/*` conservan su excepción sin
  sidebar. No ampliar estas excepciones desde páginas sin un cambio explícito.

## Regla de revisión

Cualquier cambio del shell debe comprobar al menos Inicio + Unidades + otro módulo,
desktop abierto/contraído, móvil y rol afectado. Revisar rutas hijas, selección
única, etiquetas accesibles y que ningún destino cambie por accidente de permisos.
Usar proof-ui y auditor independiente. La aprobación de una pantalla aislada no
cierra cambios de navegación global.

Una nueva propuesta visual debe modificar este estándar antes de crear variantes.
No tomar un screenshot antiguo de main como una segunda fuente de verdad. Integrar
el shell aprobado preservando capacidades vigentes de esa rama; no borrar nuevas
rutas o permisos para hacer coincidir una imagen.
