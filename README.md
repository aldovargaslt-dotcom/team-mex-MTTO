# team-mex-MTTO

Team Mex — Mantenimiento + Inventario + Andon + Salud de unidad v0.

Cubre el kernel delgado (unidades, tipos, choferes, roles), visitas de mantenimiento, Inventario (schema `inventario`) con el paso **Piezas**, **Andon** (schema `andon`: avisos de mantenimiento vencido), **Notifications** (schema `notifications`: campanita + inbox), **Flota** (schema `flota`: bitácora de patio) y **Salud** (schema `salud`: Health Score). Quedan fuera: multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa, reserva de stock en borrador, GPS/rutas.

Arquitectura: [ADR-000](docs/adr/000-thin-kernel.md), [ADR-001](docs/adr/001-visita-cerrada-outbox.md), [ADR-002](docs/adr/002-schema-per-module.md), [ADR-003](docs/adr/003-shadcn-tailwind.md), [ADR-004](docs/adr/ADR-004-tdd-test-bar-andon-v0.md), [ADR-005](docs/adr/005-andon-no-stock-alerts.md), [ADR-006](docs/adr/006-notifications-schema.md), [ADR-007](docs/adr/007-inventario-stock-bajo.md), [ADR-008](docs/adr/008-flota-schema.md), [ADR-009](docs/adr/009-icono-tipo-vehiculo.md), [ADR-010](docs/adr/010-salud-unidad.md). Spec Flota: [docs/specs/fleet-manager-v0.md](docs/specs/fleet-manager-v0.md). Spec Salud: [docs/specs/unit-health-v0.md](docs/specs/unit-health-v0.md).

## Stack

- API NestJS + TypeORM + PostgreSQL (sin SQLite)
- Cliente delgado Next.js App Router en `web/` (shadcn/ui + Tailwind, tokens Team Mex)
- PostgreSQL local vía `docker compose`

## Requisitos

- Node.js 20+ (solo si desarrolla con `npm run dev` / `start:dev`)
- Docker Engine + Compose v2 (Docker Desktop en Windows/macOS)

## Cómo correrlo

Desarrollo con Node en el host (solo Postgres en Docker):

```bash
# 1. Base de datos
docker compose up -d

# 2. API (http://localhost:3001, Swagger en /docs)
cd api
cp .env.example .env   # opcional; hay valores por defecto
npm install
npm run start:dev

# 3. UI (http://localhost:3000)
cd ../web
npm install
npm run dev
```

### Stack completo en Docker (red local)

Para abrir la app desde el celular u otra PC de la misma Wi‑Fi/LAN, sin instalar Node:

```bash
docker compose --profile app up -d --build
```

1. En la máquina anfitriona anote su IP de LAN:
   - Linux: `hostname -I`
   - macOS: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (IPv4 del adaptador Wi‑Fi/Ethernet)
2. Abra el firewall para los puertos **3000** (UI) y, si quiere Swagger, **3001** (API). Postgres queda solo en `127.0.0.1:5432`.
3. Desde cualquier dispositivo de la red: `http://<IP-LAN>:3000`  
   Swagger: `http://<IP-LAN>:3001/docs`

La UI habla con la API por el proxy `/backend` (mismo origen), así no hay que poner la IP en variables de entorno.

Pare el stack con `docker compose --profile app down`. Si también desarrolla con Node en el host, no mezcle ambos: o el perfil `app`, o `npm run dev` / `start:dev`.

El cliente usa el rol stub `X-Role: SUPERVISOR | ADMIN_DIRECTIVO | LOGISTICA` (y `X-User-Id` opcional). En la pantalla inicial elija el rol; sin encabezado la API responde 401.

## Deploy (Vercel + Railway)

Monorepo: Vercel **no** puede apuntar a la raíz (Root Directory = `web`). Railway sí puede usar la raíz: el `Dockerfile` / `railway.toml` de la raíz construyen `api/`.

Si el log de Railway dice `Railpack could not determine how to build` y lista `api/`, `web/`, `docs/`, el servicio está en la raíz **sin** este Dockerfile, o Railpack está forzado en el dashboard. Ponga **Builder = Dockerfile** o **Root Directory = `api`**.

### 1. Railway — Postgres + API

1. En el proyecto de Railway, **New → Database → PostgreSQL**.
2. **New → GitHub Repo** (este repo) → servicio `api`:
   - **Root Directory:** vacío (usa `Dockerfile` + `railway.toml` de la raíz) **o** `api`
   - Builder: **Dockerfile** (no Railpack)
3. En Variables del servicio `api`, **Reference** el Postgres (`DATABASE_URL`). Railway lo inyecta solo.
4. Variables extra:

   | Variable | Valor |
   |----------|--------|
   | `CORS_ORIGIN` | `*` al primer deploy; luego `https://su-app.vercel.app` |
   | `ANDON_NOTIFY_PROVIDER` | `noop` |

   `PORT` lo pone Railway. No copie `DB_HOST` local.
5. **Settings → Networking → Generate Domain.** Pruebe `https://<api>.up.railway.app/health` → `{"status":"ok",...}`.

El boot crea schemas `inventario` / `andon` / `notifications` / `flota` / `salud` / `alertas` / `alert_catalog`, sincroniza tablas y siembra el catálogo demo (STOCK / RUTAS / CAMIONES 3 Y MEDIA) + stock bajo.

### 2. Railway — UI (probar sin SSO de Vercel)

Segundo servicio del mismo repo, **Root Directory = `web`**, builder Dockerfile (`web/Dockerfile`).

| Variable | Valor |
|----------|--------|
| `API_URL` | `https://<api>.up.railway.app` (sin `/` final; en Railway: `https://${{team-mex-MTTO.RAILWAY_PUBLIC_DOMAIN}}`) |
| `NEXT_PUBLIC_API_BASE` | `/backend` |
| `HOSTNAME` | `0.0.0.0` |

No fije `PORT` ni el target port del dominio a 3000: Next escucha el `PORT` que inyecta Railway (suele ser 8080). Generate Domain **sin** target port, o apunte al puerto del proceso.

`API_URL` entra en el **build** (rewrite `/backend` → API).

### 3. Vercel — UI

Si el log repite `Using TypeScript 5.9.3 (local user-provided)` cada ~2 s, Vercel está compilando **`api/`** (Nest), no la UI. En el proyecto: **Settings → General → Root Directory = `web`** → Save → Redeploy. Un build bueno dice Next.js y ~369 paquetes, no 726 ni cientos de líneas de TypeScript.

1. Importar el mismo repo. **Root Directory:** `web` (nunca `api`).
2. Framework: Next.js. Env (Production y Preview):

   | Variable | Valor |
   |----------|--------|
   | `API_URL` | `https://<api>.up.railway.app` (sin `/` final) |
   | `NEXT_PUBLIC_API_BASE` | `/backend` |

   `API_URL` entra en el **build** (rewrite `/backend` → API). Si la cambia, redespliegue la UI.
3. Deploy. La UI queda en `https://<app>.vercel.app`.
4. Vuelva a Railway y ponga `CORS_ORIGIN=https://<app>.vercel.app` (opcional; el browser usa el proxy `/backend`).

Auth sigue siendo el stub `X-Role`. Use Protection de Vercel o no indexe la URL si es solo demo.

### 4. Orden

Postgres → API (health ok) → UI (Railway y/o Vercel) con esa `API_URL` → (opcional) endurecer CORS.

## Semilla

El catálogo demo (tipos + choferes + unidades de Aldo) se siembra al arrancar la API (`SeedService`, Nest + TypeORM; no hay Prisma). Idempotente: upsert por `tipos_vehiculo.nombre`, `choferes.nombre` y `unidades.placas`. Re-ejecutar no duplica filas.

```bash
# Arranque (siembra sola)
cd api && npm run start:dev

# Re-sembrar una DB ya existente (mismo upsert)
cd api && npm run seed
```

Postgres tiene que estar arriba (`docker compose up -d` o el Postgres nativo del Cloud Agent). `npm run seed` usa las mismas `DB_*` / `DATABASE_URL` que la API.

### Tipos (grupos operativos, no modelos)

`STOCK` · `RUTAS` · `CAMIONES 3 Y MEDIA`

### Choferes (7, todos ACTIVO)

`WERO` · `DON NOE` · `DON MIGUEL` · `JULIO` · `JOEL` · `BRYAN` · `RUBEN`

No hay choferes placeholder. INACTIVO los oculta del select de visita; el historial cerrado conserva nombre/id.

### Unidades (13) — nombre = número interno, upsert por placas

| Nombre | Placas | Tipo | Chofer usual |
|--------|--------|------|----------------|
| FOTON | VU2625C | STOCK | — |
| NISSAN REDILAS | VU2632C | STOCK | — |
| URVAN | VU2629C | STOCK | — |
| NISSAN CERRADA | VU2630C | RUTAS | WERO |
| URVAN 2018 | VU2634C | RUTAS | DON NOE |
| TOYOTA 2017 | VU2628C | RUTAS | DON MIGUEL |
| DUCATO 2021 | VU2626C | RUTAS | JULIO |
| TRANSIT 2023 | WH9236C | RUTAS | JOEL |
| DUCATO 2023 | VU2627C | RUTAS | BRYAN |
| RAM CODISA | VU2622C | CAMIONES 3 Y MEDIA | — |
| RAM FORANEO | 63AL5K | CAMIONES 3 Y MEDIA | — |
| FORD 2017 | VU2624C | CAMIONES 3 Y MEDIA | RUBEN |
| CHATO NUEVO | WR2023C | CAMIONES 3 Y MEDIA | — |

`FOTON` lleva la visita cerrada demo (100 km, ~120 d) para Andon ABIERTO. El chofer usual (si hay) se proyecta en `flota.unidad_operativa.chofer_ultimo_id` (bitácora de patio). La asignación de despacho v0 (`unidades.chofer_id`) está **parked**. Ops visual: Kernel `ambito` / `destino` / `ops_estado` (ADR-011).

Si la DB ya tenía la semilla placeholder (`U-101` / Juan Pérez / Camión), `npm run seed` la retira por placas/nombre. No borra unidades reales ajenas a esas claves.

Inventario: familias Filtros/Frenos; SKUs `FIL-ACEITE-01` (stock 10, CAMIONES 3 Y MEDIA / RUTAS), `PAST-FR-01` (stock 2, **min_qty 5** → Bajo, CAMIONES 3 Y MEDIA), `FIL-CAB-01` (stock 5, STOCK); proveedor Refacciones del Norte.

## API

Autenticación stub: encabezado `X-Role`. Falta el encabezado → 401.

| Recurso | Supervisor | Admin directivo | Logística |
|---------|------------|-----------------|-----------|
| `GET /choferes` (`?estado=ACTIVO` o `INACTIVO`) | sí | sí | sí |
| `POST/PATCH /choferes` (estado ACTIVO/INACTIVO; sin DELETE físico) | 403 | sí | 403 |
| `GET /unidades` (filtros `numeroInterno`, `placas`, `tipo`) | sí | sí | sí |
| `GET /unidades/tipos` | sí | sí | sí |
| `POST/PATCH/DELETE /unidades/tipos` | 403 | sí | 403 |
| `GET /unidades/:id` | sí | sí | sí |
| `GET /unidades/:id/hub` | sí | sí | 403 |
| `POST/PATCH /unidades` | 403 | sí | 403 |
| `POST /unidades/:id/visitas` (borrador) | sí | 403 | 403 |
| `PATCH /visitas/:id`, `DELETE /visitas/:id`, `POST /visitas/:id/cerrar` | sí | 403 | 403 |
| `GET /visitas/:id` y historial | sí (incluye borradores) | historial/detalle cerrado | 403 |
| `/inventario/*` | sí | sí | 403 |
| `GET /andon/avisos`, `GET /andon/umbrales` | sí | sí | 403 |
| `POST /andon/avisos/:id/enterado` | sí | 403 | 403 |
| `PATCH /andon/umbrales/:tipoVehiculoId` | 403 | sí | 403 |
| `GET /notifications`, `GET /notifications/badge` | sí | sí (mismo inbox) | sí (`FLOTA_SIN_REGRESO`) |
| `POST /notifications/:id/read`, `POST /notifications/read-all` | sí | sí | sí |
| `/flota/*` (tablero, sitios, movimientos, envío especial) | 403 | sí | sí |
| `GET /logistica/unidades` (`?q` `?chip=EN_RUTA\|DISPONIBLE\|TODAS`) | 403 | sí | sí |
| `POST /logistica/regresos/:unidadId` | 403 | sí | sí |
| `GET /logistica/choferes`, assign (parked) | 403 | sí | sí |

Hub: `fichaCorta` + `borradores[]` (vacío para admin) + `historialCerrado[]` + `puedeCrearVisita` + `mensajes[]`. `puedeCrearVisita` es **true solo si el rol es SUPERVISOR y la unidad está ACTIVA**.

Cierre (reglas existentes + piezas): unidad ACTIVA, chofer, km ≥ último cerrado, tipo, ≥ 1 trabajo A–E, firmas chofer y jefe. Piezas opcionales. Al cerrar se publica `VisitaCerrada` (ADR-001: `eventId` = outbox id, `eventType`, `occurredAt`/`cerradoAt`, `km`, `consumos`) en la misma transacción. Handler in-process (ADR-002): `DESDE_STOCK` → `SALIDA_OT` si stock ≥ qty (si no, 400 y la visita sigue en borrador); `COMPRA_EXTERNA` → pendiente de comprobante, sin movimiento de stock. Visita **no** guarda campos de stock; `itemId` es opaco.

Andon (schema `andon`): aviso de mantenimiento vencido si km desde la última visita **cerrada** ≥ `t_km` o días ≥ `t_dias` (umbrales por tipo). Sin visita cerrada previa no abre. Máximo un aviso no resuelto por unidad. Unidades inactivas: no avisos nuevos. Enterado (Supervisor) es **in-app** (no promete envío WhatsApp). Outbound: `NotifyPort`, `ANDON_NOTIFY_PROVIDER=evolution|noop` (**default noop**). Con `evolution`, POST `/message/sendText/{instance}` a `ANDON_WA_GROUP_JID` (`@g.us`) vía Evolution/Baileys — lab only, **ToS risk**, throwaway number, not prod; ver [docs/andon-evolution-notify.md](docs/andon-evolution-notify.md). Meta/Twilio más adelante. Resolver solo con `VisitaCerrada`. Las alertas de stock **no** viven en Andon (ADR-005). Inventario es dueño de `min_qty` en el stock item (ADR-007, opt-in). `qty <= min_qty` → badge Bajo (`WARNING`) o Agotado (`CRITICAL` si qty=0) e inbox `StockBajo` (`dedupe_key` `INV:stock-bajo:{itemId}`); entrada por encima del mínimo emite `StockReabastecido` y expira el matching. Sin WhatsApp de Inventario. Notifications (schema `notifications`, ADR-006) agrega `AvisoAbierto` al inbox (`WARNING`, subject `UNIDAD`); `AvisoResuelto` expira el `dedupe_key`. WhatsApp sigue en `NotifyPort`. Inventario emite `StockBajo`/`StockReabastecido` por `StockAlertPort` (ADR-007); Notifications ingiere (`ingestStockBajo` / `clear`) con `subject_type=ITEM` y `subject_ref=itemId`.

Documentación: [http://localhost:3001/docs](http://localhost:3001/docs).

## UI

Rol stub → Unidades / Andon / Inventario / **Flota**. Campanita en el shell (badge de no leídas) abre `/notificaciones` (no logística). Admin: en Unidades, familias (tipos + reglas t_km/t_días) junto a la flota de mantenimiento; choferes; inventario; historial de visitas en solo lectura (sin Nueva visita); bitácora de patio en Flota. Logística: Flota visual ops (`/flota`: En ruta, Ubicación Foráneo|Local, destino, Registrar regreso). Asignación chofer↔unidad **parked** (HTTP `/logistica/asignaciones` existe; no hay desk ni nav). Supervisor: inventario, Andon (Enterado) y visitas (Datos → Trabajos → Obs → Fotos → **Piezas** → Firmas → Confirmar). El select de chofer en visita solo lista ACTIVO. Hub: si la unidad está inactiva por envío especial, el mensaje lo dice.

Inventario: Ítems (búsqueda + Nuevo ítem; ficha con **Mínimo**), Familias, Proveedores, Stock (columna Min editable, badges OK/Bajo/Agotado, filtro Todos | Bajo | Agotado), Movimientos, Pendientes.

## Pruebas

```bash
cd api
# requiere la base team_mex_mtto_test (el compose crea team_mex_mtto y team_mex_mtto_test)
npm run test
npm run test:e2e
```

## Marca

CTA `#EA7515`, shell `#24284D`, superficies `#F3F3F3` / blanco, tipografía Roboto.

UI nueva o cambio visual: [docs/design/README.md](docs/design/README.md). Briefs Must/Don’t de corte: [docs/design-system/](docs/design-system/).
