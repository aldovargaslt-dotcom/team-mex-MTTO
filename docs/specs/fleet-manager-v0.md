# Spec Fleet Manager v0

Documento de producto y frontera técnica. Complementa [ADR-008](../adr/008-flota-schema.md).

Fuente: plan `spec_fleet_manager` (agente *Especificaciones gestor flota*), actualizado con rol `LOGISTICA` y dos firmas. Este archivo es la fuente de verdad para la implementación.

## Qué es (y qué no)

Es una **bitácora operativa de patio**: quién se llevó qué unidad, a qué hora, a qué sitio, con firma del chofer y del aval. No es TMS (rutas GPS, destinos en mapa, ELD).

Dos bucles independientes:

- **Disponibilidad para mantenimiento:** `ACTIVA` / `INACTIVA` en kernel. “Envío especial” es **motivo** al pasar a `INACTIVA`, no un tercer enum y **no exige** una SALIDA.
- **Presencia / custodia:** bitácora `SALIDA` / `ENTRADA` + sitio. Una unidad `INACTIVA` puede seguir en patio o en ruta; Mantenimiento ya no puede abrir visitas.

## Reuso obligatorio (no duplicar catálogo)

El catálogo de flota **es el kernel** ([ADR-000](../adr/000-thin-kernel.md)):

- `Unidad` + `UnidadesService`
- `Chofer` + `ChoferesService`
- `TipoVehiculo`

Patrón igual que Andon: puerto sobre `UnidadesService`, **sin tabla paralela de unidades**. Schema `flota` (ADR-002 / ADR-008): IDs opacos, sin FK a `unidades` / `choferes`.

## Rol `LOGISTICA`

Tercer valor de `Rol` en kernel, junto a `SUPERVISOR` y `ADMIN_DIRECTIVO`.

Quién entra a flota:

- **`LOGISTICA` y `ADMIN_DIRECTIVO`**: registran y consultan (tablero, salida/entrada, firmas, envío especial, sitios). Dirección cubre el turno o avala.
- **`SUPERVISOR`**: no ve la bitácora ni el nav Flota. Sí ve el efecto en el hub de MTTO (`INACTIVA` / “por envío especial”).

`LOGISTICA` **no** hereda el resto de la app:

- Flota (`/flota/*`): `LOGISTICA` + `ADMIN_DIRECTIVO`
- Lectura de catálogo para registrar: `GET /unidades`, `GET /choferes`, `GET /unidades/tipos` también para `LOGISTICA`
- Escritura de catálogo (alta/edición de unidades, tipos, choferes): solo `ADMIN_DIRECTIVO`
- Visitas (crear/cerrar): solo `SUPERVISOR`
- Inventario, Andon (UI y enterado/umbrales), notificaciones: **sin** `LOGISTICA` en v0
- Aviso suave “Andon abierto” al registrar SALIDA: Flota usa un puerto de solo lectura; no abre el módulo Andon en la UI de logística

## Alcance

**Estado (consulta y cambio)**

- Lectura: ficha kernel (`estado`) + motivo de inactivación.
- “Envío especial”: desde flota, `INACTIVA` + `motivoInactivacion = ENVIO_ESPECIAL`. Lo aplican `LOGISTICA` y `ADMIN_DIRECTIVO`.
- No hay catálogo libre de estados (`EN_RUTA`, `TALLER`, etc.). El form de unidades (solo admin) puede inactivar genérico; **solo flota** escribe `ENVIO_ESPECIAL`.
- Al reactivar (`ACTIVA`) se limpia el motivo.
- Hub MTTO: el mensaje distingue “inactiva por envío especial”. Andon: unidad inactiva → no avisos nuevos.

**Ubicación**

Catálogo `Sitio` (nombre único, ACTIVO/INACTIVO). Se elige **en cada movimiento**. Ubicación actual = sitio del último movimiento (proyección, no GPS). CRUD de sitios: ambos roles de flota.

**Conductor / último conductor**

No usar `Visita.chofer`.

- Conductor actual: chofer de la `SALIDA` abierta (si existe).
- Último conductor: chofer de la `SALIDA` del último ciclo cerrado, o de la `SALIDA` abierta.

**Firmas (dos por registro)** — mismo patrón que visitas, pero el aval no es el jefe de taller.

- **`CHOFER`**: quien se lleva (o entrega) la unidad. El chofer **no tiene login**; firma en la tablet, atada al `choferId` del movimiento.
- **`AVAL`**: quien aprueba. Usuario en sesión (`LOGISTICA` o `ADMIN_DIRECTIVO`); se guarda `avalRol` + `createdBy` (`X-User-Id`).
- Ambos pads obligatorios en **cada** `SALIDA` y `ENTRADA`. Sin las dos firmas no se persiste.
- Data URL PNG/JPEG, tope ~2MB. No hay movimiento “borrador” en v0.

## Modelo v0

Entidades en schema `flota`:

- `sitio`: id, nombre, estado ACTIVO/INACTIVO
- `movimiento`: id, tipo `SALIDA|ENTRADA`, `unidadId`, `choferId`, `sitioId`, `occurredAt`, `km`, `notas`, `createdBy`, `avalRol`, timestamps
- `movimiento_firma`: `movimientoId`, tipo `CHOFER|AVAL`, `dataUrl` (máximo 2)
- `unidad_operativa` (proyección): `unidadId`, `sitioId`, `choferActualId`, `choferUltimoId`, `salidaAbiertaId`, `ultimoMovimientoAt`

Kernel (extensión mínima):

- `Rol.LOGISTICA`
- `unidades.motivo_inactivacion`: `ENVIO_ESPECIAL | null`

Reglas:

- Una sola `SALIDA` abierta por unidad; `ENTRADA` la cierra (chofer por defecto el actual, editable).
- Chofer `ACTIVO`. Sitio `ACTIVO`. Unidad debe existir.
- `occurredAt` no futuro; `ENTRADA.occurredAt` >= `SALIDA.occurredAt`.
- Km de entrada >= km de la salida abierta. Aviso suave (no bloqueo) si es menor que el último km de visita cerrada.
- Bitácora permitida aunque la unidad esté `INACTIVA`.
- No dos unidades con salida abierta al mismo chofer.
- Aviso suave, no bloqueo, si hay Andon abierto al registrar SALIDA.

Pantallas (`LOGISTICA` / `ADMIN_DIRECTIVO`): tablero (estado, motivo, sitio, chofer actual, último chofer, salida abierta / tiempo fuera, filtro “aún no regresan”) → registrar salida/entrada (datos + dos pads) → historial por unidad → sitios → “Inactivar por envío especial” / “Reactivar”. UI del tablero/ficha como **viaje** derivado (sin enum nuevo): [fleet-tablero-viaje-v0](fleet-tablero-viaje-v0.md).

## Fuera de v0

GPS / rutas / geocercas, inspección pre/post, hora estimada de regreso, export CSV, yard GPS/cajones, motor pool con reserva, telemática, RFID, cobro interno. OT / umbrales / stock siguen en MTTO / Andon / Inventario.

## Test IDs

Ver F1–F11 en [ADR-004](../adr/ADR-004-tdd-test-bar-andon-v0.md).
