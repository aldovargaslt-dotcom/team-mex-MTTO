# team-mex-MTTO

Team Mex — módulo Mantenimiento (Slice 1: Nest API + UI).

Slice 1 cubre el catálogo de tipos de vehículo, el ABM de unidades (alta/edición admin) y el hub de cada unidad, con un stub de roles. Quedan fuera de este corte: visitas reales, choferes, reportes y autenticación definitiva.

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

## API (Slice 1)

Autenticación stub: encabezado `X-Role`. Falta el encabezado → 401.

| Recurso | Supervisor | Admin directivo |
|---------|------------|-----------------|
| `GET /tipos-vehiculo` | sí | sí |
| `POST/PATCH/DELETE /tipos-vehiculo` | 403 | sí |
| `GET /unidades` (filtros `numeroInterno`, `placas`, `tipo`) | sí | sí |
| `GET /unidades/:id` y `/unidades/:id/hub` | sí | sí |
| `POST/PATCH /unidades` | 403 | sí |

Hub: `fichaCorta` + stubs de mantenimiento (mensajes en español, sin arreglos vacíos crudos). `puedeCrearVisita` es **true solo si el rol es SUPERVISOR y la unidad está ACTIVA**. El admin nunca obtiene `true`. Unicidad de número interno, placas y nombre de tipo → 409.

Documentación: [http://localhost:3001/docs](http://localhost:3001/docs).

## UI

Rol stub → listado/búsqueda de unidades → hub. El admin ve alta/edición de unidades y CRUD de tipos; el supervisor no. **Nueva visita** se habilita según `puedeCrearVisita`; no hay formularios de visita (muestra *Próximamente*).

## Pruebas

```bash
cd api
# requiere la base team_mex_mtto_test (el compose solo crea team_mex_mtto;
# el script de e2e asume PostgreSQL local con usuario team_mex)
createdb -U team_mex team_mex_mtto_test   # si aún no existe
npm run test
npm run test:e2e
```

## Marca

CTA `#EA7515`, shell `#24284D`, superficies `#F3F3F3` / blanco, tipografía Roboto.
