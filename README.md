# team-mex-MTTO

Team Mex — Mantenimiento + Inventario + Andon v0.

Cubre el kernel delgado (unidades, tipos, choferes, roles), visitas de mantenimiento, Inventario (schema `inventario`) con el paso **Piezas**, **Andon** (schema `andon`: avisos de mantenimiento vencido) y **Notifications** (schema `notifications`: campanita + inbox). Quedan fuera: multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa y reserva de stock en borrador.

Arquitectura: [ADR-000](docs/adr/000-thin-kernel.md), [ADR-001](docs/adr/001-visita-cerrada-outbox.md), [ADR-002](docs/adr/002-schema-per-module.md), [ADR-003](docs/adr/003-shadcn-tailwind.md), [ADR-004](docs/adr/ADR-004-tdd-test-bar-andon-v0.md), [ADR-005](docs/adr/005-andon-no-stock-alerts.md), [ADR-006](docs/adr/006-notifications-schema.md), [ADR-007](docs/adr/007-inventario-stock-bajo.md).

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

El cliente usa el rol stub `X-Role: SUPERVISOR | ADMIN_DIRECTIVO` (y `X-User-Id` opcional). En la pantalla inicial elija el rol; sin encabezado la API responde 401.

## Deploy (Vercel + Railway)

Monorepo: **no** apunte Railway ni Vercel a la raíz del repo (no hay `package.json` ahí).

### 1. Railway — Postgres + API

1. En el proyecto de Railway, **New → Database → PostgreSQL**.
2. **New → GitHub Repo** (este repo) → servicio `api`:
   - **Root Directory:** `api`
   - Builder: Dockerfile (`api/Dockerfile` + `api/railway.toml`)
3. En Variables del servicio `api`, **Reference** el Postgres (`DATABASE_URL`). Railway lo inyecta solo.
4. Variables extra:

   | Variable | Valor |
   |----------|--------|
   | `CORS_ORIGIN` | `*` al primer deploy; luego `https://su-app.vercel.app` |
   | `ANDON_NOTIFY_PROVIDER` | `noop` |

   `PORT` lo pone Railway. No copie `DB_HOST` local.
5. **Settings → Networking → Generate Domain.** Pruebe `https://<api>.up.railway.app/health` → `{"status":"ok",...}`.

El boot crea schemas `inventario` / `andon` / `notifications`, sincroniza tablas y siembra U-101 / stock bajo.

### 2. Vercel — UI

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

### 3. Orden

Postgres → API (health ok) → Vercel con esa `API_URL` → (opcional) endurecer CORS.

## Semilla

| Número | Estado   | Uso previsto                                      |
|--------|----------|---------------------------------------------------|
| U-101  | ACTIVA   | Hub: visita cerrada real (100 km, ~120 d) para Andon ABIERTO |
| U-102  | ACTIVA   | Segunda unidad activa                             |
| U-103  | INACTIVA | Hub bloqueado: no se puede crear visita           |

Choferes: Juan Pérez, María López, Carlos Ruiz (default **ACTIVO**). INACTIVO los oculta del select de visita; el historial cerrado conserva nombre/id.

Inventario: familias Filtros/Frenos; SKUs `FIL-ACEITE-01` (stock 10, Camión/Camioneta), `PAST-FR-01` (stock 2, **min_qty 5** → Bajo, Camión), `FIL-CAB-01` (stock 5, Van); proveedor Refacciones del Norte.

## API

Autenticación stub: encabezado `X-Role`. Falta el encabezado → 401.

| Recurso | Supervisor | Admin directivo |
|---------|------------|-----------------|
| `GET /tipos-vehiculo` | sí | sí |
| `POST/PATCH/DELETE /tipos-vehiculo` | 403 | sí |
| `GET /choferes` (`?estado=ACTIVO` o `INACTIVO`) | sí | sí |
| `POST/PATCH /choferes` (estado ACTIVO/INACTIVO; sin DELETE físico) | 403 | sí |
| `GET /unidades` (filtros `numeroInterno`, `placas`, `tipo`) | sí | sí |
| `GET /unidades/:id` y `/unidades/:id/hub` | sí | sí |
| `POST/PATCH /unidades` | 403 | sí |
| `POST /unidades/:id/visitas` (borrador) | sí | 403 |
| `PATCH /visitas/:id`, `DELETE /visitas/:id`, `POST /visitas/:id/cerrar` | sí | 403 |
| `GET /visitas/:id` y historial | sí (incluye borradores) | historial/detalle cerrado |
| `/inventario/*` (familias, ítems, proveedores, stock, entradas, ajustes, movimientos, pendientes) | sí | sí |
| `GET /andon/avisos`, `GET /andon/umbrales` | sí | sí |
| `POST /andon/avisos/:id/enterado` | sí | 403 |
| `PATCH /andon/umbrales/:tipoVehiculoId` | 403 | sí |
| `GET /notifications`, `GET /notifications/badge` | sí | sí (mismo inbox) |
| `POST /notifications/:id/read`, `POST /notifications/read-all` | sí | sí |

Hub: `fichaCorta` + `borradores[]` (vacío para admin) + `historialCerrado[]` + `puedeCrearVisita` + `mensajes[]`. `puedeCrearVisita` es **true solo si el rol es SUPERVISOR y la unidad está ACTIVA**.

Cierre (reglas existentes + piezas): unidad ACTIVA, chofer, km ≥ último cerrado, tipo, ≥ 1 trabajo A–E, firmas chofer y jefe. Piezas opcionales. Al cerrar se publica `VisitaCerrada` (ADR-001: `eventId` = outbox id, `eventType`, `occurredAt`/`cerradoAt`, `km`, `consumos`) en la misma transacción. Handler in-process (ADR-002): `DESDE_STOCK` → `SALIDA_OT` si stock ≥ qty (si no, 400 y la visita sigue en borrador); `COMPRA_EXTERNA` → pendiente de comprobante, sin movimiento de stock. Visita **no** guarda campos de stock; `itemId` es opaco.

Andon (schema `andon`): aviso de mantenimiento vencido si km desde la última visita **cerrada** ≥ `t_km` o días ≥ `t_dias` (umbrales por tipo). Sin visita cerrada previa no abre. Máximo un aviso no resuelto por unidad. Unidades inactivas: no avisos nuevos. Enterado (Supervisor) es **in-app** (no promete envío WhatsApp). Outbound: `NotifyPort`, `ANDON_NOTIFY_PROVIDER=evolution|noop` (**default noop**). Con `evolution`, POST `/message/sendText/{instance}` a `ANDON_WA_GROUP_JID` (`@g.us`) vía Evolution/Baileys — lab only, **ToS risk**, throwaway number, not prod; ver [docs/andon-evolution-notify.md](docs/andon-evolution-notify.md). Meta/Twilio más adelante. Resolver solo con `VisitaCerrada`. Las alertas de stock **no** viven en Andon (ADR-005). Inventario es dueño de `min_qty` en el stock item (ADR-007, opt-in). `qty <= min_qty` → badge Bajo (`WARNING`) o Agotado (`CRITICAL` si qty=0) e inbox `StockBajo` (`dedupe_key` `INV:stock-bajo:{itemId}`); entrada por encima del mínimo emite `StockReabastecido` y expira el matching. Sin WhatsApp de Inventario. Notifications (schema `notifications`, ADR-006) agrega `AvisoAbierto` al inbox (`WARNING`, subject `UNIDAD`); `AvisoResuelto` expira el `dedupe_key`. WhatsApp sigue en `NotifyPort`. Inventario emite `StockBajo`/`StockReabastecido` por `StockAlertPort` (ADR-007); Notifications ingiere (`ingestStockBajo` / `clear`) con `subject_type=ITEM` y `subject_ref=itemId`.

Documentación: [http://localhost:3001/docs](http://localhost:3001/docs).

## UI

Rol stub → Unidades / Andon / Inventario. Campanita en el shell (badge de no leídas) abre `/notificaciones`. Admin: CRUD de tipos (con t_km/t_días) y choferes (estado ACTIVO/INACTIVO, filtro Activos/Todos); inventario; historial de visitas en solo lectura (sin Nueva visita). Supervisor: inventario, Andon (Enterado) y visitas (Datos → Trabajos → Obs → Fotos → **Piezas** → Firmas → Confirmar). El select de chofer en visita solo lista ACTIVO.

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
