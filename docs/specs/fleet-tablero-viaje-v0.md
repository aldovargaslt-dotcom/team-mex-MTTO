# Corte — Tablero Flota como viaje (v0)

Estado: **propuesto** (plan de implementación). Complementa [fleet-manager-v0](fleet-manager-v0.md). No sustituye ADR-008 ni F1–F11.

Hermano de [ux-operacional-cortes-v0](../design-system/ux-operacional-cortes-v0.md): ese programa **no toca Flota**. Este sí. Misma gramática visual (tabla densa, `.list-filter`, un naranja por vista, copy en español de patio). No es Corte F de aquel documento.

Audiencia: `LOGISTICA` y `ADMIN_DIRECTIVO` en `/flota` y `/flota/unidades/:id`.

## Problema

El tablero se lee como catálogo de unidades (`ACTIVA` + `Sin movimiento` + `En patio`) y obliga a cruzar columnas. Logística entra aquí como home (no tiene `/inicio`) y necesita la historia del **viaje**:

> qué camión, a qué sitio, con quién, dónde está o dónde quedó, a qué hora salió/entró, y si falta registrar la entrada.

## Norte (una frase por fila)

No hay estado global persistido. Hay un **viaje derivado** del último ciclo `SALIDA`/`ENTRADA`.

| Hecho | Frase en tablero |
|-------|------------------|
| `salidaAbiertaId` presente | **En ruta · {sitioNombre}** · `Salió {salidaAbiertaAt}` · `{tiempoFuera}` |
| Ciclo cerrado | **{sitioNombre}** · `Entrada {ultimoMovimientoAt}` |
| Nunca hubo movimiento | **Sin registro de patio** |

Sitios nuevos (Patio Norte, Cliente FEMSA, Taller externo) entran solos en `{sitioNombre}`. No se crean estados ni una entidad Ruta. El destino de la salida **es** la asignación.

`ACTIVA`/`INACTIVA` sigue existiendo para MTTO. En este tablero es **secundario** (muted bajo la unidad, o solo si inactiva).

## Decisiones cerradas

1. Situación + ubicación + hora = **una columna Viaje**. No tres celdas que dicen lo mismo.
2. Atención ≠ estado. Lo accionable es **Registrar entrada** (salida abierta). Ámbar, texto, no un valor nuevo de `EstadoUnidad`.
3. Presencia no se parametriza. Lugar sí (`Sitio` CRUD ya existe).
4. Filtros = preguntas reales, con conteo, en `.list-filter`. No tarjetas KPI (vetadas en Inicio; aquí tampoco).
5. Un `Buscar…` client-side. Sin search API nueva.
6. Fila clickeable → ficha (ya existe). Sin botón Detalle.
7. Historial de ficha = ciclos salida→entrada, no solo filas sueltas.
8. Andon abierto: se queda en la **ficha** (aviso suave, LOGISTICA no entra a `/andon`). No es columna del tablero.
9. Último chofer: no es columna. Va muted bajo el chofer actual, o solo en ficha.

## Don’t / Fuera

**Don’t**

- Enum persistido `EN_RUTA` / `EN_SITIO` / `DISPONIBLE` / `EN_MANTENIMIENTO`.
- Catálogo de rutas, GPS, ETA, kanban, cards por unidad, expand-row que duplique la ficha.
- “Pendiente firma / pendiente chofer / pendiente salida” (F11: no hay borrador).
- Pintar `En patio` cuando `!salidaAbiertaId` (mentira si el último sitio es Taller o no hay movimiento).
- Color por sitio. Emojis de ubicación. Semáforo en filas sanas.
- Dos naranjas. Verbos de fila. Touch `api/src/andon`, inventario, dual-stack notify.
- Fusionar este corte con A–E de `ux-operacional-cortes-v0.md`.

**Fuera de v0**

GPS/rutas/geocercas, CSV, OT/preventivo en Flota, umbral de aproximación km. Explorador/ranking de patio (Hoy/7d/mes) no va en este tablero: [consulta / conducta corte 5](../design-system/ux-consulta-conducta-cortes-v0.md).

## Gap de datos

| Campo | Hoy | Corte |
|-------|-----|-------|
| `salidaAbiertaId`, `salidaAbiertaAt`, `tiempoFueraMs` | En DTO tablero | Usar |
| `sitioNombre`, chofer actual/último | En DTO | Usar |
| `estado`, `motivoInactivacion` | En DTO; hoy es columna principal | Secundario en Unidad |
| `andonAbierto` | En DTO; solo ficha | Sigue solo ficha |
| `ultimoMovimientoAt` | En `unidad_operativa`; **no** sale en tablero | **Exponer en DTO** (sin migración: columna ya existe) |

Sin schema nuevo. Sin query nueva obligatoria. `GET /flota/tablero?fuera=1` se conserva (e2e). La UI carga el tablero **completo** y filtra en cliente para poder mostrar conteos.

## Copy exacto

### Tablero — columnas

`Unidad | Viaje | Chofer | Atención`

**Unidad**

- `U-101` strong + placas muted.
- Si `INACTIVA`: línea muted `Inactiva` o `Inactiva · Envío especial`.

**Viaje**

- En ruta: primera línea `En ruta · {sitio}`. Si `sitioNombre` null: `En ruta · sin sitio`. Segunda línea muted: `Salió {formatFecha(salidaAbiertaAt)} · {formatDuracion(tiempoFueraMs)}`.
- En sitio: primera línea = `sitioNombre` (Patio, Taller, …). Segunda muted: `Entrada {formatFecha(ultimoMovimientoAt)}`.
- Sin registro: `Sin registro de patio`. Sin segunda línea.

No usar “Sin movimiento”. No usar “En patio” como etiqueta de presencia.

**Chofer**

- Con `choferActualNombre`: el nombre.
- Si no: `Sin asignar` muted. Si hay `choferUltimoNombre`: debajo `Último: {nombre}` a 12px.

**Atención**

- Solo si hay salida abierta: badge `warning` `Registrar entrada`.
- Si no: `—` muted o celda vacía. No badge verde “completo”.

### Filtros (`.list-filter`)

Conteo sobre el set cargado, **antes** de aplicar búsqueda:

| id | Label | Predicado |
|----|-------|-----------|
| `todas` | `Todas` | todas |
| `fuera` | `Aún no regresan` | `Boolean(salidaAbiertaId)` |
| `en_sitio` | `En sitio` | `!salidaAbiertaId && sitioNombre` |
| `sin_registro` | `Sin registro` | `!salidaAbiertaId && !sitioNombre` |
| `inactivas` | `Inactivas` | `estado === 'INACTIVA'` |

Labels con número: `Aún no regresan (3)`. Vacío: `(0)`, chip sigue clickeable.

Empty por filtro:

- `fuera`: `Nadie está fuera. Las salidas abiertas aparecerán aquí.`
- `en_sitio`: `Nadie está en un sitio registrado.`
- `sin_registro`: `Todas las unidades ya tienen movimiento de patio.`
- `inactivas`: `No hay unidades inactivas.`
- `todas` + búsqueda sin match: `No hay unidades que coincidan.` + `Ajuste la búsqueda o el filtro.`
- `todas` sin filas: `No hay unidades.` (no debería pasar si hay seed)

### Búsqueda

Un `Input` `Buscar unidad, placas, chofer o sitio…`. Filtro local, case-insensitive, sobre `numeroInterno`, `placas`, `choferActualNombre`, `choferUltimoNombre`, `sitioNombre`.

### Orden (filtro Todas, sin búsqueda)

1. Salida abierta, `tiempoFueraMs` desc (más tiempo fuera primero).
2. Inactivas.
3. Sin registro.
4. En sitio, `numeroInterno` locale `es`.

Dentro de cada grupo, `numeroInterno` locale `es`.

### Lede

`Quién se llevó qué unidad, a qué sitio y a qué hora.`

CTA header: `Sitios` sigue `secondary`. El naranja de la vista vive en la **ficha** (`Registrar salida` / `Registrar entrada`).

### Ficha — bloque Situación

Sustituir el `dl` que repite Estado/Sitio/Chofer/Tiempo fuera. Mismo helper que el tablero:

```text
Viaje     En ruta · Sitio Norte
          Salió 11/09/2026, 13:10 · 3 h
Chofer    Juan Pérez
Atención  Registrar entrada   (solo si aplica)
Estado    Inactiva · Envío especial   (solo si INACTIVA; si ACTIVA, omitir o muted)
```

Andon abierto: el `Note` warn que ya existe. Último km visita: se queda (dato de cruce suave, no es el viaje).

Formulario de movimiento: sin cambio de reglas. El `h2` ya dice Registrar salida/entrada.

### Ficha — historial en ciclos

Lista `occurredAt DESC` (ya viene así). Agrupar en cliente:

- Una `ENTRADA` + la `SALIDA` inmediatamente anterior en el tiempo (siguiente ítem más viejo, o el siguiente en el array DESC si es `SALIDA`) = un ciclo cerrado.
- Una `SALIDA` sin `ENTRADA` más nueva = ciclo abierto (arriba).

Copy ciclo abierto:

`En ruta · {sitioSalida} · {chofer} · Salió {hora}`

Copy ciclo cerrado:

`{sitioSalida} · {choferSalida} · {horaSalida} → {sitioEntrada} · {horaEntrada}`

Km y nota: segunda línea muted por tramo, o se conservan como hoy **dentro** del ciclo. No duplicar una tabla plana **y** ciclos: **solo ciclos**. Si el agrupado no encuentra pareja (datos raros), mostrar el movimiento suelto como ahora (Tipo · Hora · Chofer · Sitio).

Empty: `Aún no hay movimientos de patio.` (ya existe).

## Cortes / PRs

Un PR de implementación (tablero y ficha deben hablar igual). Este documento es el plan; no mezclar el plan y el código en el mismo PR si el plan se revisa primero.

### PR implementación — archivos

**API (mínimo)**

- `api/src/flota/flota.service.ts` — `filaTablero`: agregar `ultimoMovimientoAt: op?.ultimoMovimientoAt ?? null`.
- `api/test/flota.e2e-spec.ts` — characterization: tras una `ENTRADA`, la fila de esa unidad en `GET /flota/tablero` trae `ultimoMovimientoAt` ISO. `?fuera=1` sigue listando solo salidas abiertas.
- No tocar `flota-engine`, reglas F1–F11, schema, dual-stack.

**Web**

- `web/src/lib/types.ts` — `ultimoMovimientoAt: string | null` en `TableroFlotaRow`.
- `web/src/lib/flota-viaje.ts` (nuevo) — funciones puras:
  - `viajeDeFila(row)` → `{ clase: 'en_ruta' | 'en_sitio' | 'sin_registro', titulo, detalle }`
  - `filtraTablero(rows, filtro, q)`
  - `cuentaFiltros(rows)`
  - `ordenaTablero(rows)`
  - `ciclosDeHistorial(movimientos)`
- `web/src/app/flota/page.tsx` — columnas, filtros, búsqueda, empty, sort; `GET /flota/tablero` sin `?fuera=1` (el chip Fuera filtra en cliente).
- `web/src/app/flota/unidades/[id]/page.tsx` — Situación + historial ciclos; reusar `viajeDeFila` y `ciclosDeHistorial`.
- No extraer ficha a otro módulo. No tocar `StatusBadge` de Unidades/MTTO.

Web no tiene Jest: la derivación vive en `flota-viaje.ts` para no duplicar copy. La prueba de frases es `proof-ui`.

### URL (nice-to-have en el mismo PR si sale barato)

`/flota?filtro=fuera` (valores = ids de filtro). Refresh conserva el chip. No es Must. No inventar `?fuera=1` en el cliente si se usa `filtro=`.

## Test IDs (ADR-004)

Ninguno nuevo. F1–F11 no cambian. Characterization e2e del DTO; sin regla de dominio nueva.

ADR tocados: **ninguno** — `ultimoMovimientoAt` ya está en ADR-008 / proyección. No envelope nuevo. No ownership nuevo.

## Proof (`docs/screenshots/`)

Skill `proof-ui`. Entrar por `/` → Logística (y un pass Admin Directivo: mismo tablero). Click-through, no página estática. Desktop denso + móvil ~390.

| Archivo | Qué demuestra |
|---------|----------------|
| `flota_tablero_viaje_fuera.png` | Fila en ruta: frase + chofer + badge Registrar entrada; chip Aún no regresan con conteo |
| `flota_tablero_en_sitio.png` | Fila Patio/Taller **sin** texto “En patio” genérico; hora de entrada |
| `flota_tablero_sin_registro.png` | `Sin registro de patio`; filtro Sin registro |
| `flota_tablero_buscar.png` | Buscar por sitio o chofer reduce la lista |
| `flota_ficha_situacion.png` | Misma frase que el tablero; form Registrar entrada si está fuera |
| `flota_ficha_ciclos.png` | Historial agrupado salida → entrada |

Hold: no mergear sin **SD / visual OK**.

## Orden de trabajo (dentro del PR)

1. Exponer `ultimoMovimientoAt` + e2e characterization. `cd api && npm test && npm run test:e2e`.
2. `flota-viaje.ts` con las frases y filtros.
3. Tablero.
4. Ficha Situación + ciclos.
5. `cd web && npm run lint && npm run build`.
6. Click-through + screenshots. Subagentes al review: `ux-auditor` + `sd-scope`.

## Criterio de hecho

- Una fila se lee sin cruzar Estado/Sitio/Fuera.
- “Aún no regresan” y “En sitio” responden las preguntas de patio.
- Un sitio nuevo en `/flota/sitios` aparece en Viaje sin código nuevo.
- No hay `EN_RUTA` en kernel ni tabla de rutas.
- F1–F11 verdes. LOGISTICA sigue 403 en inventario/Andon.
