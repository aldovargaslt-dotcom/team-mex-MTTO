# SPEC-ALERT-ATTENTION-001 — Inicio por prioridad y alertas configurables

Estado: aprobado por el usuario en la conversación de Codex del 2026-10-11.
Referencia: decisiones Q1–Q10, confirmación «Si» y autorización «usemos alguno
que pienses que sea correcto, para comenzar a construir, nosotros nos encargamos
de configurar en su momento». Autoriza valores iniciales editables e implementación.

## Alcance

Inicio de Supervisor/Admin muestra condiciones activas de mantenimiento,
existencias y compras externas. Salud se retira de esta cola y de sus filtros;
su módulo, configuración e inbox permanecen. «Flota» en Inicio identifica unidades
con mantenimiento pendiente, no concede acceso a Logística.

## Reglas y valores iniciales

- Mantenimiento: conservar intervalos existentes por tipo. Tipos nuevos usan
  10.000 km o 90 días desde la última visita cerrada. Seguimiento desde alcanzar
  cualquiera de esos límites; crítico desde 1.000 km o 30 días **adicionales**.
  Los márgenes críticos son editables, enteros >=1.
- La lectura diaria actual sólo dispone del km de la última visita cerrada.
  No inventar telemetría: usar el km observado al abrir el aviso cuando exista;
  recalcular los días desde el último cierre y los intervalos actuales.
- Inventario conserva ADR-007: cantidad <= mínimo significa alerta (no sólo <).
  Cantidad <= límite crítico significa atención inmediata, inicialmente 0.
  Mínimo null mantiene el opt-in apagado; no activar todos los artículos al migrar.
  Límite crítico editable por artículo, entero >=0 y <= mínimo cuando está activado.
- Compra externa sin comprobante: seguimiento; desaparece al adjuntar comprobante
  o cerrar el pendiente. Una compra que ya tiene comprobante no se anuncia como
  «comprobante pendiente» aunque aún esté por recibir.
- Consultar/leer no cierra ni altera el conteo. Sin estado «En atención».
- Ajustar una regla recalcula condiciones. Un cierre por ajuste de regla no
  representa mantenimiento realizado y no escribe una VisitaCerrada.
- Supervisor y Admin editan MTTO/Inventario. Permisos de otras familias intactos.

## Criterios de aceptación

- AC-01: Inicio agrupa Crítico/Seguimiento y filtra Todos/Flota/Inventario;
  conteos por problema estable, sin duplicados ni Salud.
- AC-02: cada tarjeta presenta identificación, valor/motivo actual y acción
  contextual: unidad con mantenimiento, ficha del artículo o compra específica.
- AC-03: mantenimiento calcula atraso y prioridad en el backend con valores
  actuales; límites inclusivos; Enterado sigue activo; ajuste que elimina la
  condición expira su inbox sin crear un mantenimiento ficticio.
- AC-04: stock calcula ambas prioridades en Inventario, respeta opt-in, valores
  existentes y límites; cambios reevalúan el inbox por puerto.
- AC-05: catálogo edita ambos niveles; antes de guardar presenta efecto calculado
  en backend (nuevas, cerradas, cambio de prioridad), sin mutar datos al previsualizar.
- AC-06: cada guardado desde el catálogo registra actor, rol, instante, antes y
  después; configuración y registro se guardan atómicamente. Errores de validación
  o permisos no dejan escrituras parciales.
- AC-07: loading/error parcial/vacío son explícitos; una fuente fallida no se
  interpreta como cero ni oculta fuentes disponibles. Recarga al volver/enfocar.
- AC-08: desktop 1440 y mobile390 sin overflow; botones contenidos, targets44px,
  navegación existente y tokens Team Mex. Un único CTA naranja máximo en Inicio.
- AC-09: pruebas de límites, cambio de regla, preview sin efectos, atomicidad,
  permisos y cierre por dato; lint/build y recorrido CDP con revisión independiente.

Fuera: SLA/asignación, nuevos estados de visitas, CHECK/Logística, WhatsApp,
unificación de schemas, publicación/despliegue, valores productivos del cliente.

Arquitectura: [ADR-022](../adr/022-alert-attention-priority.md).
UX: [vista](../design/ux-alert-attention-v1.md).
