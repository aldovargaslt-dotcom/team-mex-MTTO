# UX operacional — plan de cortes v0

Estado: **propuesto** (plan; un PR por corte). Recorte de la auditoría `SPEC-UX-001`. No es el spec completo.

Hermano (no fusionar): [consulta / conducta](ux-consulta-conducta-cortes-v0.md) — cadencia, ranking, consumo, Andon reincidencia, patio. Flota tablero: [fleet-tablero-viaje-v0](../specs/fleet-tablero-viaje-v0.md).

Lee primero: [nav vs filtro vs Inicio](ui-nav-filter-action-inicio-v0.md), [anti-generic](ui-polish-anti-generic-v0.md), [pasteles](ui-semantic-button-pastels-v0.md), [ADR-003](../adr/003-shadcn-tailwind.md), [ADR-005](../adr/005-andon-no-stock-alerts.md), [ADR-007](../adr/007-inventario-stock-bajo.md), [ADR-008](../adr/008-flota-schema.md).

## Norte

El usuario responde tres preguntas **en superficies que ya existen**:

| Pregunta | Superficie |
|----------|------------|
| ¿Qué necesita atención? | `/inicio` (cola) + campanita (eventos) |
| ¿Qué tengo ahora? | Unidades / hub, Existencias, Andon |
| ¿Qué pasó? | Historial de visitas, Movimientos, aviso Andon |

Prioridad: copy operacional, menos verbos por fila, consulta ≠ edición, filtros que se pueden compartir. No más módulos.

## Ya aterrizado — no rehacer

| Qué | Dónde |
|-----|--------|
| Inicio = cola de excepciones (no dashboard, no inbox) | `#24`, `ui-nav-filter-action-inicio-v0.md` |
| `/` = picker de rol; post-login → `/inicio` (logística → `/flota`) | `web/src/app/page.tsx` |
| Subrayado = ubicación; `.list-filter` = filtro; botón = acción | mismo brief |
| Inventario diario vs Catálogo (Familias / Proveedores detrás) | `InventarioNav` |
| Tipos/umbrales = acción admin en Unidades, no tab gemelo | mismo brief |
| Stock `?alerta=BAJO\|AGOTADO` desde Inicio | `inventario/stock` |
| Andon ≠ stock (inbox `StockBajo`) | ADR-005 / 006 / 007 |
| Chofer actual de patio | Flota (`unidad_operativa`), no el hub MTTO |

## Fuera de este programa (auditoría rechazada)

- Andon de stock / Andon “V2” / `warning_days` / `warning_km` (Andon sigue = **vencido**).
- Kardex pesado (`stock_before` / `stock_after` persistidos, `stock = Σ`, motivos enumerados).
- Ítem↔placa / `unit_id` en `inventario.movimientos`.
- Event store / timeline global / reportes / CSV / BI.
- OC formal, tarjeta de compra con proveedor+OT como entidad nueva.
- Nav **Configuración**, Inicio con “Próximamente” o actividad reciente.
- Renombrar schema/API (`t_km`, `items`, `familias`, estados `OPEN`…).
- Meter stock en Andon empty states.
- Tocar Flota / `LOGISTICA` / dual-stack notify. Flota tiene plan propio: [fleet-tablero-viaje-v0](../specs/fleet-tablero-viaje-v0.md).
- Cadencia / ranking / reportes de conducta: otro programa ([ux-consulta-conducta-cortes-v0](ux-consulta-conducta-cortes-v0.md)).

Cada PR de implementación copia Must / Don’t / Fuera del corte a [`.github/pull_request_template.md`](../../.github/pull_request_template.md).

---

## Mapa de copy (todos los cortes)

Solo UI. Endpoints y columnas igual.

| Hoy (UI) | Destino | No tocar |
|----------|---------|----------|
| Ítems | Refacciones | `GET /inventario/items` |
| Familia (SKU) | Categoría | `inventario.familias` |
| Familia (tipo de unidad) | Tipo | `tipos_vehiculo` |
| Compras (nav pendientes) | Por recibir | `pendientes-comprobante` |
| Stock (título) | Existencias | ruta `/inventario/stock` |
| Regla t_km / t_días | Cada [n] km / Cada [n] días | `umbrales.t_km` / `t_dias` |
| Nueva familia (unidades) | Nuevo tipo | POST tipos |
| placeholder mínimo `—` | Sin mínimo | `min_qty` null |
| Ítem (Piezas / sheets) | Refacción | `itemId` opaco |

“Familia” deja de usarse en inventario. En flota de mantenimiento se habla de **tipo**, no de categoría.

---

## Corte A — Copy + Andon explica la causa

**Visual only.** Sin `api/src`.

### Must

1. Labels del mapa de copy en Inventario (nav, títulos, ficha, alta), Unidades (dialog de tipo/umbrales + lede), Piezas, pendientes. Inicio: “compra pendiente de recibir” → “por recibir” (sigue apuntando a `/inventario/pendientes`).
2. Andon lista y `AndonHubCard`: frase operacional con datos **ya en el DTO** (`kmAlAbrir`, `diasAlAbrir`, `umbralKm`, `umbralDias`). Ejemplo si venció por km: `12,400 km desde el último cierre (umbral 10,000 km)`. Si venció por días, el análogo. Si ambos, las dos líneas. No inventar “faltan N” (eso sería ventana previa; fuera).
3. Empty Andon: título + una línea. Ejemplo: `No hay avisos pendientes.` / `Aparecen cuando una unidad rebase el intervalo de km o de días desde su última visita cerrada.` **Sin** mencionar stock.
4. Empty Existencias filtradas: `Nada en Bajo.` + por qué aparece el badge. Mismo patrón en Refacciones / Por recibir si el copy actual es solo “Nada en este filtro.”
5. Un naranja por vista; filtros siguen en `.list-filter`.

### Don’t

Umbrales nuevos; cambiar `A3`; empty de Andon que mezcle inventario; renombrar JSON.

### Fuera

Kardex, search API, layout de la tabla Stock (eso es B).

### ADR / tests

Ninguno — visual only. `n/a` en Test IDs.

### Proof (`docs/screenshots/`, click-through, 390 y desktop)

- `copy_unidades_tipo_umbrales.png` — dialog “Cada … km / Cada … días”
- `copy_inventario_nav.png` — Refacciones · Existencias · Movimientos · Por recibir · Catálogo
- `copy_andon_aviso.png` — fila o hub con causa en humano
- `copy_andon_vacio.png` — empty pendientes

---

## Corte B — Existencias: consulta ≠ edición

**Visual only** respecto a reglas de stock. Sigue `PATCH /inventario/items/:id` `{ minQty }` y sheets de entrada/ajuste ya cableados.

Sustituye, **solo en Existencias**, la frase del brief de pasteles “layout de tablas sin cambios”.

### Must

1. Quitar el input de mínimo por fila. Columna Mínimo: número o `Sin mínimo`.
2. Si `alerta === BAJO` o `AGOTADO` y hay mínimo: mostrar magnitud (`2 pza · mínimo 5 · faltan 3`). Derivado: `faltan = minQty - qty` cuando `minQty != null && qty <= minQty`.
3. Quitar **Entrada** y **Ajuste** por fila. CTA naranja de la vista: `Registrar entrada` (sheet). Ajuste: outline desde la ficha, no desde cada fila.
4. Fila clickeable → ficha de la refacción (extraer la ficha de `inventario/page.tsx` a componente compartido). En la ficha: stock, badge, **editar mínimo**, compatibilidad, proveedores, acciones Activar/Inactivar, Ajuste.
5. Lista Refacciones: quitar botón Detalle; `onRowClick` abre la misma ficha. Inactivar no es naranja sólido.
6. Conservar `?alerta=` (Inicio → Existencias).

### Don’t

Persistir `stock_before` / `stock_after`; motivos enumerados de ajuste; deeplink inbox distinto de `/inventario/stock` (ADR-006); dos naranjas.

### Fuera

Filtros de movimientos (D). Piezas en el hub (E).

### ADR / tests

Ninguno — visual only. Characterization UI only.

### Proof

- `existencias_tabla_consulta.png` — sin inputs ni verbos de fila; magnitud en Bajo (semilla `PAST-FR-01`)
- `existencias_fila_ficha.png` — click fila → ficha, editar mínimo, Guardar outline
- `existencias_entrada_cta.png` — CTA header → sheet entrada
- `refacciones_fila_ficha.png` — click fila, sin Detalle

---

## Corte C — Búsqueda de unidades

Kernel listado. No toca Flota.

### API

`GET /unidades` hoy: `numeroInterno`, `placas`, `tipo` (UUID o nombre).

Agregar (compat hacia atrás: los query actuales siguen AND):

- `q` — un término; match **OR** `ILIKE` en `numeroInterno`, `placas`, `marcaModelo`.
- `estado` — `ACTIVA` \| `INACTIVA`.

UI: un campo `Buscar unidad…`, select Tipo (ya existe `tipo=`), select Estado, filtrar al Enter o al escribir (debounce). Quitar las dos cajas + botón Buscar.

Agrupación por tipo se mantiene. Acciones admin de tipo (nuevo/editar) siguen en esta vista ([nav brief](ui-nav-filter-action-inicio-v0.md) §Must 3). Primario naranja = `Nueva unidad` cuando ya hay tipos; `Nuevo tipo` es outline/secondary salvo empty de catálogo.

### Must

1. Buscar `Ranger` o `U-101` o placas con `q`.
2. Filtro estado oculta el resto.
3. Empty: `No hay unidades que coincidan` + `Ajuste la búsqueda o los filtros.`

### Don’t

JOIN a `flota`; chofer actual; cambiar agrupación a tabla plana.

### Fuera

GPS, bitácora en este listado.

### ADR / tests

Sin ADR (no schema nuevo). Characterization en e2e/unit del listado: `q` pega marca; `estado=INACTIVA` no lista U-101. Sin ID nuevo en la barra TDD.

### Proof

- `unidades_busqueda_q.png` — un campo + tipo + estado
- `unidades_busqueda_marca.png` — resultado por marca/modelo

---

## Corte D — Movimientos: consulta compartible

Inventario dueño. Libro actual (`delta`, `qty`, `visitaId`, `nota`, `createdBy`). **No** Kardex pesado.

### API

`GET /inventario/movimientos` acepta query opcional:

- `itemId`
- `tipo` — `ENTRADA` \| `SALIDA_OT` \| `AJUSTE`
- `from` / `to` — ISO fecha (inclusive, timezone de app)

Lista igual que hoy si no hay filtros.

Ajuste: `nota` **requerida** (texto libre, trim). Sin catálogo de motivos. 400 si falta.

### UI

Reusar gramática de filtros: búsqueda + periodo (Hoy, 7 d, 30 d, Este mes, Personalizado) + tipo. Chips de filtros activos. Estado en URL (`from`, `to`, `tipo`, `item`). Fila → sheet de detalle con campos **existentes** (fecha, SKU, tipo, qty, delta, visita/`OtLink`, nota, usuario). No mostrar saldo anterior/posterior inventado.

Desde la ficha de refacción (B): enlace `Movimientos` con `?item=`.

### Must

1. `?item=<uuid>` deja solo esa refacción (deep link).
2. Back/forward y refresh conservan filtros.
3. Sheet de ajuste exige nota.

### Don’t

`stock_before`/`after`; `unit_id`; paginación/CSV/P95; confundir con `flota.movimientos`.

### Fuera

Reportes de consumo.

### ADR / tests

Sin ADR. Characterization: filtro `itemId`; ajuste sin nota → 400. No ID I1–I4 (eso es apply de visita).

### Proof

- `movimientos_filtros_url.png` — periodo + tipo + chips; URL visible
- `movimientos_detalle.png` — sheet de un `SALIDA_OT` con visita
- `movimientos_desde_ficha.png` — ficha refacción → lista filtrada

---

## Corte E — Hub: piezas de visitas cerradas

Mantenimiento dueño de `visita_piezas`. La UI hidrata SKU como en Piezas (`GET /inventario/items?ids=`). Sin JOIN SQL, sin `unit_id` en inventario.

### API

Extender ítems de `historialCerrado` (mismo módulo que el hub) con:

```text
piezas: [{ itemId, qty, origen }]
```

`itemId` sigue opaco. Borradores no hace falta (el wizard ya muestra piezas).

### UI

En el hub, bloque **Refacciones** bajo historial (no cinco tabs, no timeline unificado):

- Fecha de cierre, visita (link), refacción, cantidad, origen (`Desde stock` / `Compra externa`).
- Empty: `Aún no hay refacciones en visitas cerradas.`

Andon del hub no se mueve de sitio; el copy viene del corte A.

### Must

1. Cerrar una visita con `FIL-ACEITE-01` DESDE_STOCK → la línea aparece en el hub de esa unidad.
2. Click de la visita sigue abriendo el detalle cerrado.

### Don’t

Leer `inventario.movimientos` filtrando por unidad; puerto Flota de chofer en este corte; tabs Resumen/Mantenimiento/Andon/Historial.

### Fuera

Expediente “investigación operacional” completo del spec.

### ADR / tests

Sin ADR (mismo schema `visita_piezas`). Characterization hub: historial incluye `piezas`. No C1–C4 nuevos.

### Proof

- `hub_refacciones_visita.png` — U-101 con líneas de pieza
- `hub_refacciones_vacio.png` — unidad sin consumos

---

## Orden y dependencias

```text
A (copy / Andon)          visual
B (existencias / ficha)   visual; puede ir en paralelo con A
C (búsqueda unidades)     API listado; paralelo con A/B
D (movimientos)           API; mejor después de B (enlace desde ficha)
E (hub piezas)            API hub; independiente de D; copy A si el empty se toca
```

No fusionar cortes en un solo PR. D no bloquea E.

## Verificación por corte

- Visual: skill `proof-ui` (click-through; Supervisor **y** Admin donde el listado es compartido). Logística: no es audiencia de estos cortes.
- API (C/D/E): skill `verify-api` (`cd api && npm test && npm run test:e2e`). Sin `lint --fix`.
- Subagentes al review: `ux-auditor` + `sd-scope` (fuera de v0 + Andon no stock + no dual-stack).

## Hold

No mergear UI sin **SD / visual OK**. No mergear C/D/E si e2e de listados/hub se rompe.
