# SPEC-INV-002 — Kits de piezas por tipo de unidad

## Status

**Proposed**, 2026-11-07. Documentación solamente. No autoriza código, migraciones ni permisos. Complementa [SPEC-INV-001](SPEC-INV-001.md) sin modificarla. Origen: [shaping](../../workspace/shaping/inventario-kits-por-tipo-v0.md). Ownership: [ADR-031](../adr/031-inventario-kits-por-tipo.md) (Accepted 2026-11-07); la SPEC sigue Proposed y no es Ready hasta resolver K-2…K-5 y aprobar EWO. K-1 resuelta: Supervisor y Admin crean/editan kits.

## Problem

Capturar SKU por SKU en cada visita es lento y propenso a omisiones, y debilita el seguimiento de inventario y costo por unidad.

## Goals

- Reducir la captura de piezas repetitivas a elegir un kit y ajustar.
- Mantener consumo de stock y costo históricos correctos (SPEC-INV-001) sin captura por camión.

## Non-goals

Inventario por camión, multi-almacén, lotes, reserva de stock, kits por unidad individual, captura de precios por kit, automatizar la elección del kit, cambios al contrato `VisitaCerrada`.

## Actors

Supervisor (aplica kits en la visita). Creación/edición: Supervisor y/o Admin (K-1).

## Functional Behavior

### F-01 · Definir kit
Nombre único, lista de refacciones con cantidad entera ≥ 1, tipos de unidad aplicables, estado activo/inactivo. Sin precios.

### F-02 · Aplicar kit en la visita
En el paso Piezas: elegir un kit compatible con el tipo de la unidad. Se agregan líneas editables (`itemId`, `qty`); el origen (`DESDE_STOCK` / `COMPRA_EXTERNA`) se elige por línea. Se puede quitar, cambiar cantidad o agregar piezas sueltas.

### F-03 · Cierre
Se consumen únicamente las líneas confirmadas. Aplican la validación de stock suficiente y el snapshot de costo de SPEC-INV-001 (F-06). Borrador no reserva ni consume.

### F-04 · Trazabilidad
La visita conserva una referencia al kit usado (opcional) y las líneas finales. Cambiar o inactivar el kit después no altera visitas cerradas.

### F-05 · Costo estimado (informativo)
Mostrar suma cantidad × costo promedio vigente cuando exista; piezas sin costo se marcan «costo desconocido». Nunca cero ni total completo con faltantes. Depende del costeo de SPEC-INV-001 parte B: construido y con liberación autorizada según [ADR-026](../adr/026-inventario-costos-historicos.md) (2026-10-15); la activación efectiva en producción no está verificada en este repositorio. Los kits no dependen de que el costo esté activo.

### F-06 · Consulta
Uso y costo de refacciones por unidad y por kit/tipo, etiquetado «Costo de refacciones», con cobertura de costo explícita.

## Business Rules

- Un kit no es stock ni reserva. Solo líneas confirmadas consumen.
- Pieza inactiva o incompatible con el tipo: advertencia y revisión; no se agrega en silencio.
- El costo vive en la entrada a almacén, no en el kit.
- Registros históricos son inmutables respecto a cambios del kit.

## Failure Behavior

Stock insuficiente en una línea: rechazo del cierre como hoy, sin efectos parciales. Kit sin piezas válidas: se informa y no se agrega nada. Fallo al cargar kits: la captura manual sigue disponible; no se muestra «sin kits» como si fuera ausencia confirmada.

## Acceptance Criteria

| ID | Criterio |
|---|---|
| AC-K01 | Dado un kit para el tipo de la unidad, aplicarlo agrega sus líneas editables al borrador sin consumir ni reservar stock. |
| AC-K02 | Dado un kit aplicado y modificado (quitar, cambiar cantidad, agregar suelta), el cierre consume exactamente las líneas finales. |
| AC-K03 | Dado un cierre con kit, el descuento de stock y el costo histórico son idénticos a capturar las mismas líneas a mano. |
| AC-K04 | Dado stock insuficiente en alguna línea, el cierre se rechaza sin efectos parciales. |
| AC-K05 | Dado un kit editado o inactivado después, las visitas cerradas conservan sus líneas y costos. |
| AC-K06 | Dado un kit no compatible con el tipo de la unidad, no se ofrece o se advierte; no se aplica en silencio. |
| AC-K07 | Dada una pieza inactiva en el kit, se advierte y requiere revisión. |
| AC-K08 | Dada una pieza sin costo, el estimado la marca desconocida y no suma cero. |
| AC-K09 | Dado doble envío o concurrencia, no se duplica consumo ni costo (como AC-21 de SPEC-INV-001). |
| AC-K10 | Dado error al cargar kits, la captura manual permanece y no se afirma que no existen kits. |
| AC-K11 | Dado rol sin permiso financiero, el estimado de costo no se revela (alineado a D-02 de SPEC-INV-001). |
| AC-K12 | Dado 390px, teclado y zoom 200%, el selector y la revisión de líneas son accesibles; targets ≥ 44px. |

## Dependencies and ADRs

SPEC-INV-001 (costos, parte B), ADR-002, ADR-004 (I/S, C/O), ADR-007, ADR-026 (propuesto). **Nuevo ADR requerido** para ownership del kit (K-6). Contrato de `VisitaCerrada` sin cambios; una referencia al kit, si se guarda, requiere revisar ADR-001.

## Open Questions

Ver K-1…K-7 en el [shaping](../../workspace/shaping/inventario-kits-por-tipo-v0.md).

## Risks and assumptions

- Supuesto: las reparaciones repetidas usan las mismas piezas (confirmado por el dueño); si varían mucho, los kits pierden valor.
- Riesgo: kits desactualizados inducen consumo erróneo; mitigado porque se revisan líneas antes de cerrar.
- Riesgo: ampliar Inventario sin ADR; mitigado al exigirlo antes de ejecutar.
