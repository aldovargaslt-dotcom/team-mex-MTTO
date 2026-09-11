# team-mex-MTTO

Team Mex — módulo Mantenimiento (Slice 2: visitas + choferes).

Slice 2 cubre el catálogo admin de choferes y el flujo de visitas de mantenimiento (borrador, cierre y historial) sobre el catálogo de unidades de Slice 1. Quedan fuera: reportes/export, reapertura admin, E/S, Andon, autenticación real y costos.

## Stack

- API NestJS + TypeORM + PostgreSQL (sin SQLite)
- Cliente delgado Next.js App Router en `web/`
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
| U-101  | ACTIVA   | Hub de supervisor: puede crear visita             |
| U-102  | ACTIVA   | Segunda unidad activa                             |
| U-103  | INACTIVA | Hub bloqueado: no se puede crear visita           |

Choferes de semilla: Juan Pérez, María López, Carlos Ruiz.

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

Hub: `fichaCorta` + `borradores[]` (vacío para admin) + `historialCerrado[]` + `puedeCrearVisita` + `mensajes[]`. `puedeCrearVisita` es **true solo si el rol es SUPERVISOR y la unidad está ACTIVA**. `fichaCorta.ultimoKm` es el km de la última visita cerrada.

Cierre (todas obligatorias): unidad ACTIVA, chofer del catálogo, km ≥ último cerrado (o ≥ 0 si es la primera), tipo PREDICTIVO\|CORRECTIVO, ≥ 1 trabajo del checklist A–E, firmas de chofer y jefe. Observaciones y fotos son opcionales. Un km menor al último cerrado **no se persiste ni como borrador**.

Documentación: [http://localhost:3001/docs](http://localhost:3001/docs).

## UI

Rol stub → listado de unidades → hub. Admin: CRUD de tipos y choferes, historial de visitas en solo lectura (sin Nueva visita ni borradores). Supervisor: crea/continúa/elimina borradores y cierra visitas (Datos → Trabajos A–E → Observaciones → Fotos → Firmas → confirmar).

## Pruebas

```bash
cd api
# requiere la base team_mex_mtto_test (el compose crea team_mex_mtto y team_mex_mtto_test)
npm run test
npm run test:e2e
```

## Marca

CTA `#EA7515`, shell `#24284D`, superficies `#F3F3F3` / blanco, tipografía Roboto.
