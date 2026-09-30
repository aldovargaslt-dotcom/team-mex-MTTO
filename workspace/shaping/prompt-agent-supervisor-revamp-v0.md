# Prompt para agente — Implementar revamp Supervisor mobile-first

Trabaja en el repositorio `team-mex-MTTO` e implementa únicamente el revamp de experiencia y UI para el rol `SUPERVISOR` descrito en los documentos siguientes:

- `workspace/shaping/supervisor-revamp-implementation-plan-v0.md`
- `docs/specs/supervisor-experience-v0.md` (AC-01 a AC-10 son canónicos)
- `docs/design-system/ux-supervisor-experience-v0.md`
- `docs/engineering-work-orders/EWO-010.md`
- `workspace/shaping/supervisor-inicio-mobile-reference.html` (referencia de dirección, no copia literal)

## Resultado esperado

La experiencia operativa principal del Supervisor debe limitarse a **Inicio**, **Órdenes**, **Unidades** e **Inventario**, con diseño mobile-first. Inicio orienta mediante condiciones abiertas y conteo de borradores; Órdenes sigue siendo el único panel de trabajo; Unidades conserva el contexto al volver de hub/wizard; Inventario conserva sus capacidades actuales sin volverse un panel financiero.

## Antes de editar

1. Lee `AGENTS.md`, ICM y los documentos canónicos completos.
2. Inspecciona `git status` y no sobrescribas cambios ajenos.
3. Lee los contextos de dominio mínimos: Mantenimiento, Notifications, Salud e Inventario, más los archivos de las rutas/componentes que cambies.
4. Levanta el entorno semilla y caracteriza la UI actual en 390 px y 1440 px antes de cambiarla.

## Reglas de implementación

- Mantén las rutas de Alertas/Andon, notificaciones, hub, ficha y wizard como destinos contextuales. No dejes capacidades existentes inaccesibles al reducir la navegación principal.
- Mobile-first significa que cada tarea se completa a 390 px en una columna, sin overflow horizontal, hover obligatorio ni controles relevantes menores de 44 px. Escritorio amplía esa jerarquía.
- Inicio muestra condiciones que sigan abiertas, no una bandeja de “no leídas”. Ver una alerta no la oculta ni la resuelve.
- Usa solo `Borrador` y `Cerrada` para visitas; el CTA de un borrador es `Continuar`.
- Conserva el retorno y filtros de Unidades mediante URL o `returnTo` interno validado.
- Respeta copy en español y los componentes/tokens existentes; toma la referencia HTML como tono y jerarquía, no como fuente literal de CSS.

## Prohibiciones y escalación

No introduzcas ownership, prioridad, SLA, vencimiento, kanban, usuarios, máximos de stock, costos, precios ni estados nuevos. No cambies schemas, contratos ni agregues joins entre módulos. No introduzcas Flota/Logística en Supervisor. No cambies el ciclo de vida de Andon, Salud o Inventario, ni la regla `SUPERVISOR` + unidad `ACTIVA` para crear visita.

Detente y reporta con evidencia si cumplir una AC requiere un endpoint nuevo, cambio de schema, contrato nuevo, una lectura agregada de backend o una decisión de dominio. No resuelvas esos gaps con datos inventados, llamadas N+1 nuevas o una solución que cruce schemas.

## Verificación obligatoria

1. `cd web && npm run lint`
2. `cd web && npm run build`
3. Prueba click-through como Supervisor con semilla, en 390 px y 1440 px: Inicio, abrir condición, continuar borrador, retorno a Unidades e Inventario/Pendientes.
4. Verifica loading, empty, error aislado por fuente, permisos, foco visible, objetivos táctiles y overflow.
5. Si existe un cambio backend expresamente autorizado, ejecuta además pruebas focales, `cd api && npm test` y `npm run test:e2e`.

Al terminar, entrega un resumen breve con: comportamiento implementado, archivos modificados, pruebas ejecutadas/resultados y cualquier decisión o bloqueo que requiera al product owner. No cambies el estado de los documentos Draft a aprobado.
