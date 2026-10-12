# UX — Inicio de alertas por prioridad

Aprobado: sesión de Codex 2026-10-11, Q1–Q10 y autorización de implementación.
Companion: [SPEC](../specs/alert-attention-v1.md).
Sustituye únicamente la jerarquía de Inicio de EWO-010. Hermano: `/inicio` actual,
patrón2 cola de excepciones; filtros de `/inventario/stock` (ListFilter).

Conservar shell, Roboto, navy, naranja, radio6 y ancho1040. PageHeader saluda
con nombre de sesión cuando existe (no inventar «Carlos»); lede cuenta alertas
activas totales. Acción secundaria «Configurar alertas» abre menú existente.

ListFilter Todos/Flota/Inventario con conteos; navy para selección. Sin Salud.
Dos secciones: «Requiere atención inmediata (n)» + badge Crítico, y «Requiere
seguimiento (n)» + badge Pendiente. Omitir grupos vacíos. P0 problema/urgencia;
P1 identificación y motivo; P2 acción; P3 código/placa.

Cada tarjeta usa borde de sección, crítico con borde lateral rojo. Foto existente
de unidad si disponible, fallback Wrench. No fotos remotas ficticias. Desktop:
identificación flexible y CTA con ancho contenido a la derecha. Mobile: identificación
y motivo arriba, CTA44px a todo el ancho. Sólo primera tarjeta crítica tiene naranja;
resto outline. Excepción autorizada a anterior regla cero naranja de Inicio.

Acciones «Atender mantenimiento», «Revisar faltante», «Revisar compra».
Abrir no resuelve ni marca Enterado. Sin asignación, estado En atención ni cerrar manual.

Vacío «Sin alertas activas»; filtro vacío «Sin alertas de [área]». Carga y error por
fuente visibles con reintentar. En fallo parcial conteos son «disponibles» y la fuente
fallida se nombra. Nunca anunciar «todo al día» si faltan datos.

Editor existente de Alertas añade márgenes críticos de mantenimiento y límite
crítico de stock. Guardar primero calcula preview sin escritura; mostrar el efecto
y botón «Confirmar cambios». Cambiar cualquier campo invalida preview. Carga y
validación mantienen formulario abierto; después guardar, recargar valores/resumen.

Proof: Inicio populated/empty/partial, tres filtros, click al pendiente, preview,
guardar y volver; d1440+m390, targets44px y ausencia de overflow.
