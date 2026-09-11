# team-mex-MTTO

Team Mex — Mantenimiento + Inventario + Andon v0.

Cubre el kernel delgado (unidades, tipos, choferes, roles), visitas de mantenimiento, Inventario (schema `inventario`) con el paso **Piezas**, y **Andon** (schema `andon`: avisos de mantenimiento vencido). Quedan fuera: multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa y reserva de stock en borrador.

Arquitectura: [ADR-000](docs/adr/000-thin-kernel.md), [ADR-001](docs/adr/001-visita-cerrada-outbox.md), [ADR-002](docs/adr/002-schema-per-module.md), [ADR-003](docs/adr/003-shadcn-tailwind.md), [ADR-004](docs/adr/ADR-004-tdd-test-bar-andon-v0.md), [ADR-005](docs/adr/005-andon-no-stock-alerts.md).

## Stack

- API NestJS + TypeORM + PostgreSQL (sin SQLite)
- Cliente delgado Next.js App Router en `web/` (shadcn/ui + Tailwind, tokens Team Mex)
- PostgreSQL local vía `docker compose`

## Requisitos

- Node.js 20+
- Docker (recomendado) o PostgreSQL 16

## Cómo correrlo

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

El cliente usa el rol stub `X-Role: SUPERVISOR | ADMIN_DIRECTIVO` (y `X-User-Id` opcional). En la pantalla inicial elija el rol; sin encabezado la API responde 401.

## Semilla

| Número | Estado   | Uso previsto                                      |
|--------|----------|---------------------------------------------------|
| U-101  | ACTIVA   | Hub: visita cerrada real (100 km, ~120 d) para Andon ABIERTO |
| U-102  | ACTIVA   | Segunda unidad activa                             |
| U-103  | INACTIVA | Hub bloqueado: no se puede crear visita           |

Choferes: Juan Pérez, María López, Carlos Ruiz.

Inventario: familias Filtros/Frenos; SKUs `FIL-ACEITE-01` (stock 10, Camión/Camioneta), `PAST-FR-01` (stock 2, Camión), `FIL-CAB-01` (stock 5, Van); proveedor Refacciones del Norte.

## API

Autenticación stub: encabezado `X-Role`. Falta el encabezado → 401.

| Recurso | Supervisor | Admin directivo |
|---------|------------|-----------------|
| `GET /tipos-vehiculo` | sí | sí |
| `POST/PATCH/DELETE /tipos-vehiculo` | 403 | sí |
| `GET /choferes` | sí | sí |
| `POST/PATCH/DELETE /choferes` | 403 | sí |
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

Hub: `fichaCorta` + `borradores[]` (vacío para admin) + `historialCerrado[]` + `puedeCrearVisita` + `mensajes[]`. `puedeCrearVisita` es **true solo si el rol es SUPERVISOR y la unidad está ACTIVA**.

Cierre (reglas existentes + piezas): unidad ACTIVA, chofer, km ≥ último cerrado, tipo, ≥ 1 trabajo A–E, firmas chofer y jefe. Piezas opcionales. Al cerrar se publica `VisitaCerrada` (ADR-001: `eventId` = outbox id, `eventType`, `occurredAt`/`cerradoAt`, `km`, `consumos`) en la misma transacción. Handler in-process (ADR-002): `DESDE_STOCK` → `SALIDA_OT` si stock ≥ qty (si no, 400 y la visita sigue en borrador); `COMPRA_EXTERNA` → pendiente de comprobante, sin movimiento de stock. Visita **no** guarda campos de stock; `itemId` es opaco.

Andon (schema `andon`): aviso de mantenimiento vencido si km desde la última visita **cerrada** ≥ `t_km` o días ≥ `t_dias` (umbrales por tipo). Sin visita cerrada previa no abre. Máximo un aviso no resuelto por unidad. Unidades inactivas: no avisos nuevos. Enterado (Supervisor) es **in-app** (no promete envío WhatsApp). Outbound: `NotifyPort`, `ANDON_NOTIFY_PROVIDER=evolution|noop` (**default noop**). Evolution sendText a `ANDON_WA_GROUP_JID` **no está cableado aquí** (otro agente). Lab Baileys / API no oficial: **riesgo de ToS**, no producción. Meta/Twilio más adelante, no este PR. Resolver solo con `VisitaCerrada`. Las alertas de stock **no** viven en Andon (ADR-005).

Documentación: [http://localhost:3001/docs](http://localhost:3001/docs).

## UI

Rol stub → Unidades / Andon / Inventario. Admin: CRUD de tipos (con t_km/t_días) y choferes; inventario; historial de visitas en solo lectura (sin Nueva visita). Supervisor: inventario, Andon (Enterado) y visitas (Datos → Trabajos → Obs → Fotos → **Piezas** → Firmas → Confirmar).

Inventario: Ítems (búsqueda + Nuevo ítem), Familias, Proveedores, Stock, Movimientos, Pendientes.

## Pruebas

```bash
cd api
# requiere la base team_mex_mtto_test (el compose crea team_mex_mtto y team_mex_mtto_test)
npm run test
npm run test:e2e
```

## Marca

CTA `#EA7515`, shell `#24284D`, superficies `#F3F3F3` / blanco, tipografía Roboto.
