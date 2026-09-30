# UX — Experiencia Supervisor mobile-first v0

## Estado

**Aprobada por producto el 2026-09-29.** Complementa [SPEC-SUPERVISOR-EXPERIENCE-001](../specs/supervisor-experience-v0.md); sus criterios de aceptación son la única fuente canónica.

## Screen purpose

Permitir que el Supervisor identifique la siguiente excepción u orden abierta desde Inicio, entre a Órdenes para trabajarla y vuelva a la unidad o al catálogo sin perder orientación.

## Primary user

`SUPERVISOR`; móvil primero a 390 y escritorio 1440 como ampliación. No Logística.

## Arquitectura operativa

Las únicas vistas principales del Supervisor son **Inicio**, **Órdenes**, **Unidades** e **Inventario**. Alertas, notificaciones, la ficha/hub de unidad y el wizard de orden son destinos contextuales; Configuración es secundaria y no compite con el trabajo diario. Costos y excepciones financieras pertenecen al perfil administrativo autorizado, no al Supervisor.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Inicio, cola de órdenes o ficha de una unidad.
2. ¿Hay algo mal? — Excepciones Andon, stock, evidencia pendiente de compra externa y Salud donde ya existan.
3. ¿Debo actuar? — Continuar una visita, revisar una excepción o registrar mantenimiento si las reglas lo permiten.
4. ¿Cuál es el estado ahora? — Borrador/Cerrada, Activa/Inactiva, Health y alerta fuente sin mezclarlos.
5. ¿Qué apoyo hay? — Búsqueda, filtros, historial y retorno conservado.

## Primary action

- Inicio: las filas son la acción; no CTA naranja.
- Orden/hub con borrador: `Continuar` (`default`).
- Hub sin borrador y con `puedeCrearVisita`: `Registrar mantenimiento` (`default`).

## Information hierarchy

- **P0:** `Requiere atención` y `Órdenes abiertas` como resúmenes direccionales en Inicio.
- **P1:** excepción con fuente y consecuencia; evidencia pendiente de compra externa; conteo de órdenes abiertas; en Órdenes, fila con unidad, tipo y fecha de actualización.
- **P2:** búsqueda/filtros, estado de unidad, km e historial.
- **P3:** metadatos que no determinan la siguiente acción.

No mostrar: KPI, gráfica, prioridad inventada, SLA, asignado a, estados de Logística, «mis órdenes» ni estados de orden inexistentes (Pausada/En progreso/Hecha).

## Pattern

Inicio conserva el patrón 2 (cola de excepciones) y añade solo el resumen/enlace de órdenes abiertas; Órdenes usa patrón 3 (listado + ficha); Unidad usa patrón 5 (hub). No se crea dashboard nuevo.

## States

- **loading:** `Cargando excepciones…`, `Cargando órdenes…`, `Cargando ficha de la unidad…`.
- **empty órdenes abiertas:** Inicio omite el resumen; Órdenes conserva su estado vacío actual.
- **empty alertas:** `Sin alertas.`
- **error:** fuente fallida con nombre y mensaje; no ocultar otras fuentes disponibles.
- **warning:** Andon o stock bajo, sin teñir toda la pantalla.
- **critical:** agotado/Health crítico según datos existentes, con siguiente destino explícito.

## Interaction notes

- `Enterado` incluye la nota «la alerta sigue activa hasta cerrar una visita».
- Una alerta vista no se anuncia como resuelta ni se oculta mientras la condición fuente siga abierta.
- La evidencia pendiente dirige a Pendientes; no se etiqueta como Orden de Compra sin una decisión de dominio.
- Unidades serializa filtros en URL o utiliza `returnTo` interno validado; el retorno nunca sale del catálogo.

## Mobile-first / responsive

- **390 (referencia):** cada vista se resuelve en una columna; la navegación secundaria no oculta la acción actual; `Continuar` es visible; objetivos de menú, filas y CTA ≥44 px; sin hover requerido ni overflow horizontal.
- **1024:** se amplía la densidad sin depender de paneles simultáneos para completar el trabajo.
- **1440:** Órdenes puede usar lista + ficha; Inicio sigue siendo una columna direccional y el hub conserva su patrón. Ninguna acción existe solo en escritorio.

## Fuera / Don’t

- No `api/src` ni cambio de schemas en un corte visual.
- No `/flota`, GPS, rutas, estado operativo ni asignación de chofer para Supervisor.
- No nuevos estados de visita, ownership, prioridad o vencimiento.
- No unificar Andon, Notifications, Inventario o Salud.

## Proof

- `supervisor_inicio_borradores_d1440.png`
- `supervisor_orden_continuar_d1440.png`
- `supervisor_unidades_retorno_d1440.png`
- `supervisor_inicio_borradores_m390.png`
- `supervisor_orden_continuar_m390.png`
- `supervisor_unidades_retorno_m390.png`
- `supervisor_inventario_pendientes_m390.png`
