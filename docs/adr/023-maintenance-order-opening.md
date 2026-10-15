# ADR023 — Confirmación explícita de apertura de mantenimiento

> **Supersession parcial — 2026-10-15:** [ADR025](025-abc-utilization-downtime.md)
> sustituye sólo la semántica de apertura sin retiro: abrir PREVENTIVE/CORRECTIVE
> retira la unidad de operación y agrega un motivo de indisponibilidad. Borrador,
> CHECK y correctiva generada sin abrir no lo hacen. Conservar marca, lifecycle y
> permisos existentes; no inventar movimiento físico ni cambiar ACTIVA/INACTIVA.
> Cancelar/completar recalcula por motivos restantes, sin borrar holds ni historia.
> El cuerpo aceptado original se conserva abajo. No habilita implementación.

Aceptado por usuario,2026-10-11 (fecha cliente): «Confirmar Abrir orden».
Contexto: legacy BORRADOR permanece hasta CERRADO y no distingue preparación de
trabajo listo. CHECK tiene lifecycle propio; no reinterpretar ASSIGNED como apertura.

Decisión: maintenance openedAt/openedBy/openedActorName registra confirmación de
listo para trabajar. Sin marca y no terminal=borrador; con marca y no terminal=abierta;
COMPLETED=cerrada. No alterar canonical PENDING ni significar ejecución/asignación.
CHECK activo se ve abierto y nunca pasa por esta confirmación. CANCELLED separado.

Nueva acción trusted para Supervisor/Mecánico en su facility, idempotente y bajo
locks de unidad/visita. No CHECK, no terminal, no VisitaCerrada, no consumo/cadencia.
Libera legacyCompatDraft al abrir: marca BORRADOR legacy sigue espejo de captura,
no autoridad de fase; el slot sólo protege preparación. Reutiliza 0..N mantenimiento
canónico de ADR016. Registros antiguos no se abren automáticamente ni se inventa
fecha: cerrados siguen históricos y pendientes sin marca permanecen borradores.

Mecánico consulta mantenimiento de su patio; CHECK activo mantiene own/eligible y
su historial sólo concluido propio. No se conceden creación, edición/cierre de
mantenimiento, captura/firma/asignación extra. Esos escritores conservan políticas.
Alternativas descartadas: inferir abierto por cantidad de campos, usar ASSIGNED
sin asignación o crear otro agregado WorkOrder. Migración aditiva independiente,
sin cambiar enums/eventos previos, no ejecución en producción.
