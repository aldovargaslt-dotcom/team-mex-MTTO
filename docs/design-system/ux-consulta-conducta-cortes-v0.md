# UX consulta / conducta — plan de cortes v0

Estado: **propuesto** (plan; un PR por corte). Programa **hermano** de [ux-operacional-cortes-v0](ux-operacional-cortes-v0.md) y de [fleet-tablero-viaje-v0](../specs/fleet-tablero-viaje-v0.md). No fusionar con A–E ni con el tablero viaje.

Lee primero: [nav vs filtro vs Inicio](ui-nav-filter-action-inicio-v0.md), [anti-generic](ui-polish-anti-generic-v0.md), ADR-002, ADR-005, ADR-007, ADR-008.

## Norte

Las pantallas de v0 contestan **qué registrar** y **qué está abierto ahora**. Con los mismos hechos ya persistidos faltan vistas de **cadencia, ranking, recurrencia y ciclo de vida**.

Una fila de historial es un evento para abrir el registro. Una fila de conducta responde: ¿se repite?, ¿esta unidad es peor que el resto del tipo?, ¿el umbral se está cumpliendo?

Gramática: **tablas densas + periodo + ranking**. Misma familia visual que Existencias / Movimientos / Flota. No KPI cards. No gráficas en `/inicio`. No event-store global. No CSV / BI.

| Pregunta | Superficie destino |
|----------|--------------------|
| ¿Cómo se comporta esta unidad? | Hub MTTO (retrato) |
| ¿Quién incumple el intervalo / reincide? | Listado Unidades o Andon (ranking) |
| ¿Qué SKU se va y de dónde? | Inventario (totales de periodo) |
| ¿Cuánto tarda Andon en cerrarse? | Andon (demora / overshoot) |
| ¿Quién se queda fuera / qué sitios? | Flota (ranking de ciclos) |

Audiencia: `ADMIN_DIRECTIVO` para rankings; Supervisor el retrato de **una** unidad; `LOGISTICA` solo patio.

## Ya aterrizado — no rehacer

| Qué | Dónde |
|-----|--------|
| Inicio = cola de excepciones (no dashboard) | `ui-nav-filter-action-inicio-v0.md` |
| Hub = ficha + Andon + historial de visitas + refacciones | `/unidades/:id` |
| Movimientos = libro filtrable (no reporte) | Corte D operacional |
| Tablero Flota = viaje **ahora** | `fleet-tablero-viaje-v0.md` |
| Andon = cola pendientes / enterados / resueltos | `/andon` |

## Fuera de este programa

- Gráficas o feed en `/inicio`. KPI cards.
- Event store / timeline global que cruce Mantenimiento + Inventario + Flota + Andon en un JOIN (ADR-002).
- CSV / BI / export.
- Kardex pesado (`stock_before` / `stock_after`), reconstruir saldo día a día.
- Ítem↔placa / `unit_id` en `inventario.movimientos`.
- `warning_km` / `warning_days` (Andon sigue = **ya venció**).
- OC formal, costeo, lotes, multi-almacén, GPS/rutas.
- Unificar dual-stack notify. Tocar ownership de Inventario o Andon.
- Mezclar chofer de **visita** con chofer de **patio** en una sola “conducta del conductor” (ADR-008).
- Fusionar cortes de este archivo con A–E o con el tablero viaje.

Cada PR de implementación copia Must / Don’t / Fuera del corte a [`.github/pull_request_template.md`](../../.github/pull_request_template.md).

---

## Corte 0 — DTOs de lectura (sin captura nueva)

Mantenimiento y Andon dueños de sus tablas. Sin schema nuevo. Sin JOIN cruzado.

### API

1. `GET /unidades/:id/hub` — cada ítem de `historialCerrado` y `borradores` incluye:

   ```text
   trabajos: [{ categoria, item }]
   ```

   Ya se cargan `visita.trabajos` en el servicio; hoy solo se expone `trabajosCount`. Mismo orden que el detalle de visita (categoría, luego ítem). `itemId` de piezas sigue opaco. `GET /unidades/:id/visitas` (resumen) **no** cambia.

2. `GET /andon/avisos` y `POST /andon/avisos/:id/enterado` — el `AvisoDto` incluye campos **ya persistidos**:

   - `resueltoAt` (`timestamptz` ISO o `null`)
   - `enteradoBy` (`varchar` o `null`; el `X-User-Id` del supervisor)

   No cambia el ciclo ABIERTO → ENTERADO → RESUELTO. No se inventa demora en el servidor (la UI resta timestamps).

### Must

1. Hub U-101 semilla: `trabajos` de la visita cerrada incluye `Afinación / filtros de aceite` (categoría A).
2. Aviso ABIERTO: `resueltoAt` y `enteradoBy` son `null`. Tras Enterado: `enteradoBy` = usuario de sesión; `resueltoAt` sigue `null`.
3. Aviso RESUELTO (tras cierre de visita): `resueltoAt` ISO; `visitaResolutoriaId` opaco.

### Don’t

Schema nuevo; JOIN a inventario para hidratar SKU en `trabajos`; IDs nuevos en la barra TDD (C/O/I/A/N/S); UI de retrato/ranking en este corte.

### Fuera

Cortes 1–5 (superficies). `GET /visitas` listado con trabajos. Historial de cambios de umbral.

### ADR / tests

Sin ADR (mismo schema). Characterization: hub `trabajos`; `AvisoDto.resueltoAt` / `enteradoBy`. No IDs A1–A8 nuevos.

### Proof

- API: `cd api && npm test && npm run test:e2e`
- UI: n/a (sin cambio visual)

---

## Corte 1 — Retrato de unidad (conducta, no captura)

Mantenimiento dueño de la superficie `/unidades/:id`. Andon se lee con `GET /andon/avisos?unidadId=` (IDs opacos). Flota **no** se pinta en la misma timeline.

### UI

En el hub, un bloque **Conducta** (o equivalente) derivado del historial ya cargado + umbral del tipo + avisos de esa unidad:

- Cadencia: Δkm y Δdías entre cierres consecutivos vs `t_km` / `t_días` del tipo.
- Mix `PREDICTIVO` / `CORRECTIVO` (conteo sobre el historial cerrado).
- Recurrencia de trabajos A–E (frecuencia; vacío: `Aún no hay trabajos en visitas cerradas.`).
- Top refacciones de esa unidad (hidratar SKU con `GET /inventario/items?ids=` como el bloque Refacciones).
- Andon de la unidad: cuántos avisos, si el actual está abierto, overshoot (`kmAlAbrir - umbralKm` / analogía días) y demora si hay `resueltoAt`.

Sin cinco tabs. Sin unificar patio.

### Must

1. Con dos o más visitas cerradas se lee Δkm / Δdías sin abrir cada WO.
2. Click de una visita del retrato sigue abriendo el detalle cerrado.
3. Supervisor sigue pudiendo **Nueva visita**; el retrato no es un segundo wizard.

### Don’t

JOIN SQL Flota; chofer de patio en este bloque; gráficas; KPI cards; `warning_km`.

### Fuera

Ficha Flota embebida. Timeline global.

### ADR / tests

Sin ADR. Characterization UI + hub `trabajos` (Corte 0). Visual: skill `proof-ui`.

### Proof (`docs/screenshots/`, click-through, 390 y desktop)

- `conducta_hub_cadencia.png` — Δkm / Δdías vs umbral
- `conducta_hub_trabajos.png` — recurrencia A–E
- `conducta_hub_andon.png` — reincidencia / demora de esa unidad

---

## Corte 2 — Ranking de flota MTTO + recurrencia por tipo

Kernel listado + lecturas Andon. Sin JOIN inventario. Consumo por unidad: `visita_piezas` del hub (o visitas) + hidratar `?ids=` en cliente.

### UI

Sobre `/unidades` (admin y supervisor; no Logística): columnas o vista de consulta (filtro, no sustituir el catálogo de alta):

- Último cierre (fecha / km).
- Km o días desde el último cierre vs umbral del tipo.
- Conteos: correctivos en el periodo; avisos Andon (incl. resueltos) en el periodo.

Agrupación por tipo se mantiene. Salud por tipo (¿el umbral coincide con la cadencia real?) cabe aquí: una línea muted por grupo, no un módulo nuevo.

Periodo: mismos chips que Movimientos (7 d / 30 d / 90 d) en URL.

### Must

1. Se puede ordenar o leer de un vistazo quién va más allá del intervalo.
2. Deep link fila → hub de esa unidad.
3. Empty: `No hay unidades que coincidan` (reusa copy de búsqueda).

### Don’t

Puerto Flota; chofer actual; semáforo en filas sanas; dos naranjas; métrica de stock en esta tabla.

### Fuera

CSV. “Faltan N km” (ventana previa).

### ADR / tests

Sin ADR. Agregación en cliente (pocas unidades v0) o read-model **dentro** de Mantenimiento/Andon. Characterization del listado existente no se rompe (`q`, `estado`).

### Proof

- `ranking_unidades_intervalo.png`
- `ranking_unidades_tipo.png` — línea de salud por tipo

---

## Corte 3 — Consumo por periodo (totales, no el libro)

Inventario dueño. Libro actual intacto (`GET /inventario/movimientos`). **No** kardex pesado.

### API

Lista igual. La vista de conducta **agrega** en cliente (o un query opcional `totales=1` **dentro** de Inventario, mismo filtro `from`/`to`/`tipo`/`itemId`):

- Σ `qty` por SKU y `tipo` (`SALIDA_OT` / `ENTRADA` / `AJUSTE`).
- Mix origen **no** sale del movimiento: `COMPRA_EXTERNA` vive en `visita_piezas`. Componer en UI: movimientos `SALIDA_OT` vs piezas `COMPRA_EXTERNA` hidratadas por `itemId` (sin JOIN SQL).

### UI

Superficie hermana de Movimientos (subnav Inventario o un filtro “Totales” que no se confunda con el libro). Periodo en URL. Ranking de SKU que más salen por OT. Línea de origen stock vs compra externa.

Existencias siguen contestando el **ahora**. Inbox `StockBajo` **no** es historial (expira al reponer).

### Must

1. Periodo 30 d: se ve qué SKU más `SALIDA_OT`.
2. Filtro `?item=` del libro sigue funcionando.
3. Copy: no mostrar saldo anterior/posterior inventado.

### Don’t

Persistir `stock_before`/`after`; `unit_id`; paginación/CSV; confundir con `flota.movimientos`.

### Fuera

Serie de existencias día a día. “Cuántas veces estuvo Bajo”.

### ADR / tests

Sin ADR. Characterization: filtros del Corte D no se rompen. Si hay `totales=1`, test de Σ en el dueño Inventario.

### Proof

- `consumo_totales_30d.png`
- `consumo_origen_mix.png`

---

## Corte 4 — Reincidencia y demora Andon

Andon dueño. Misma ruta `/andon`. Depende del Corte 0 (`resueltoAt`, `enteradoBy`).

### UI

Filtro Resueltos (y/o un chip extra **Reincidentes**): columnas de consulta, no solo las de la cola.

- Demora abierto → enterado (`enteradoAt - abiertaAt`).
- Demora enterado → resuelto (`resueltoAt - enteradoAt`) cuando hay `resueltoAt`.
- Overshoot km: `kmAlAbrir - umbralKm` (y analogía días). Causa km vs días (ya en DTO).
- Ranking: unidades con más avisos en el periodo.

Pendientes siguen siendo la cola de **atención**. Este corte no sustituye Enterado.

### Must

1. Un aviso resuelto muestra cuándo se cerró (`resueltoAt`) sin abrir la visita.
2. Overshoot se lee en humano (mismo tono que la causa del Corte A operacional).
3. Click unidad → hub.

### Don’t

Andon de stock; `warning_km`; WhatsApp status; JOIN visitas; cambiar A3/A5.

### Fuera

Predecir próximo vencimiento. Unificar notify.

### ADR / tests

Sin ADR. Characterization: `estado=RESUELTO` incluye `resueltoAt`. No A1–A8 nuevos.

### Proof

- `andon_resueltos_demora.png`
- `andon_reincidentes.png`

---

## Corte 5 — Ranking de patio (viajes, no el pad)

Flota dueño. Complementa [fleet-tablero-viaje-v0](../specs/fleet-tablero-viaje-v0.md) (ese spec dejó fuera el explorador Hoy/7d/mes). **No** es Corte F del programa operacional.

### UI

Explorador o ranking sobre ciclos `SALIDA`→`ENTRADA` (viaje derivado, no entidad nueva):

- Tiempo fuera (entrada − salida) por ciclo y ranking de unidades / choferes.
- Km del ciclo (`km` entrada − `km` salida).
- Sitios que se repiten.
- Filtro periodo Hoy / 7 d / 30 d / Este mes.

Tablero `/flota` sigue siendo **ahora** (quién no regresa). Esta vista es **qué suele pasar**.

### Must

1. Un ciclo cerrado muestra duración y km sin abrir cada firma.
2. Filtros con conteo en `.list-filter`.
3. Fila → ficha `/flota/unidades/:id`.

### Don’t

Enum `EN_RUTA`; GPS; CSV; OT/preventivo en Flota; columna Andon en el tablero; mezclar chofer de visita.

### Fuera

Umbral de aproximación km. Timeline con visitas de taller.

### ADR / tests

Sin ADR (mismo schema `flota`). Characterization F1–F11 intactos. Si hay listado global nuevo, e2e de periodo en Flota.

### Proof

- `patio_ranking_tiempo_fuera.png`
- `patio_ranking_sitios.png`

---

## Orden y dependencias

```text
0 (DTOs hub trabajos + AvisoDto)   API; desbloquea 1 y 4
1 (retrato unidad)                 UI hub; necesita 0
2 (ranking unidades / tipo)        UI listado; 0 ayuda, no obliga
3 (consumo periodo)                Inventario; independiente
4 (Andon demora)                   UI Andon; necesita 0
5 (ranking patio)                  Flota; independiente; no mezclar con A–E
```

No fusionar cortes en un solo PR. 3 y 5 no bloquean 1. 2 puede ir en paralelo con 1 si el ranking no pide `trabajos`.

## Verificación por corte

- API (0, y 3/5 si hay endpoint): skill `verify-api`. Sin `lint --fix`.
- UI (1, 2, 4, 5): skill `proof-ui`. Supervisor **y** Admin donde el listado es compartido. Logística: solo corte 5.
- Subagentes al review: `ux-auditor` + `sd-scope` (fuera de v0 + Andon no stock + no dual-stack + no JOIN).

## Hold

No mergear UI sin **SD / visual OK**. No mergear 0 si e2e de hub/Andon se rompe.
