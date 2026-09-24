# ADR-014 — Foto de la unidad en el kernel

## Status

Accepted

## Context

La cola de órdenes necesita la foto de la unidad, no una foto de la visita. La unidad vive en el kernel (`public.unidades`). Las fotos de una visita siguen siendo de Mantenimiento (`visita_fotos`). No hay almacén de objetos: las fotos de visita ya se guardan como data URL.

## Decision

- `unidades.foto_data_url` es opcional, una sola imagen, `text`, nullable.
- La escribe solo la ficha de unidad (admin), con el `PATCH` del catálogo. La orden la muestra; no la edita.
- Vacío borra la foto.
- Solo `data:image/…`, tope de tamaño en la validación.
- No entra en `VisitaCerrada` ni en otros envelopes.
- La orden la lee por la unidad; no se copia a la visita.
- Si la unidad no tiene foto, la orden muestra el glifo de su tipo (ADR-009). STOCK y RUTAS usan van; no se inventa otro icono.

## Alternatives Considered

### Option A

Guardar la foto solo en la visita. No identifica a la unidad en otras órdenes.

### Option B

Servicio de archivos aparte. No hay ese almacén en v0; data URL ya es el patrón de fotos.

## Consequences

### Positive

- La orden, el catálogo y la ficha muestran la misma foto.
- Un campo, sin schema nuevo.

### Negative / Trade-offs

- El listado de unidades puede traer la imagen en el JSON.
- No hay historial de fotos de la unidad.

## Risks

- Una imagen grande infla la fila. El tope de validación lo acota.

## Follow-up

- Folio secuencial de orden, si se quiere un número distinto de `OT ·` + id corto. Hoy la orden no tiene otro número.

## Related Artifacts

SPEC: ninguno nuevo
Engineering Work Orders: EWO-007 (cola de órdenes)
Previous ADR: ADR-000
