# ADR-008 — Módulo Flota (schema `flota`) + rol `LOGISTICA`

Estado: aceptado (v0)

Extiende [ADR-000](000-thin-kernel.md) (tercer rol, `motivoInactivacion` en Unidad) y [ADR-002](002-schema-per-module.md) (schema propio). Spec de producto: [fleet-manager-v0](../specs/fleet-manager-v0.md).

## Decisión

El Fleet Manager es un bounded context **Flota**, no un duplicado del catálogo de unidades.

- Persiste en schema PostgreSQL `flota`: sitios, movimientos de patio (`SALIDA`/`ENTRADA`), firmas del movimiento y proyección `unidad_operativa`.
- Reusa `UnidadesService` / `ChoferesService` / tipos (IDs opacos). Prohibido: tabla paralela de unidades, FK o JOIN SQL hacia `public.unidades` / `choferes` / `visitas` / `andon.*`.
- El kernel solo gana lo que MTTO necesita ver: `Rol.LOGISTICA` y `unidades.motivo_inactivacion` (`ENVIO_ESPECIAL | null`).
- “Envío especial” es motivo de `INACTIVA`, independiente de la bitácora. No es un tercer `EstadoUnidad`.
- Ubicación = catálogo de sitios en el movimiento (no GPS).
- Firmas por registro: `CHOFER` (tablet, sin login) + `AVAL` (usuario en sesión).

## Auth

`/flota/*` exige `LOGISTICA` o `ADMIN_DIRECTIVO`. Inventario, Andon (controller), Notifications y el wizard de visitas **no** quedan abiertos a `LOGISTICA` por omisión. Lecturas de catálogo (`GET /unidades`, `GET /choferes`, `GET /unidades/tipos`) sí. El aviso Andon al salir es un puerto de solo lectura (`hasNoResuelto`), no la UI Andon.

## Consecuencias

- Hub de mantenimiento distingue “inactiva por envío especial”.
- Andon sigue A4: unidad inactiva → no avisos nuevos.
- Chofer actual/último **de patio** salen de `flota.unidad_operativa`, nunca de `Visita.chofer`.

## Asignación chofer↔unidad (extensión v0)

Estado: aceptado. No sustituye la bitácora `flota` ni duplica catálogos.

Módulo Nest delgado `logistica` (`api/src/logistica`). Sin schema PostgreSQL propio. El estado vive en kernel `unidades.chofer_id` (UUID opaco, unique, nullable). Prohibido: tabla paralela de choferes/unidades, schema `mantenimiento`, mutar `flota.*` desde este módulo, eventos/outbox v0.

Sincronización **in-process** al Kernel. Relación **1:0..1**: un chofer ≤ 1 unidad; una unidad ≤ 1 chofer.

Puerto / DTO congelados:

```ts
interface UnidadChoferAssignmentPort {
  assign(unidadId: string, choferId: string): Promise<void>; // chofer ACTIVO; unidad free; 1:0..1
  unassign(unidadId: string): Promise<void>;
}

type LogisticaChoferRow = {
  choferId: string;
  nombre: string;
  ops: "DISPONIBLE" | "EN_RUTA";
  unidadId?: string;
  placas?: string;
};
```

HTTP (`LOGISTICA` | `ADMIN_DIRECTIVO`; Supervisor 403):

- `GET /logistica/choferes?q&chip=` — solo choferes `ACTIVO`. `chip=DISPONIBLE|EN_RUTA|TODOS`. `q` = nombre.
- `POST /logistica/asignaciones` `{ unidadId, choferId }`
- `DELETE /logistica/asignaciones/:unidadId`

`ops`: `EN_RUTA` si hay `unidad.choferId`; si no, `DISPONIBLE`. Distinto del chofer de una `SALIDA` abierta.

Soft-block: no pasar un chofer a `INACTIVO` mientras esté asignado (PATCH `/choferes/:id`).

Fuera: geo/rutas, multi-asignación, nav Supervisor, alta de chofer aquí.
