# Deploy: Railway (API + Postgres) + Vercel (UI)

El repo es un monorepo: `api/` (NestJS) y `web/` (Next.js). No hay `package.json` en la raíz.

Reparto previsto:

| Pieza | Dónde | Por qué |
|--------|--------|---------|
| PostgreSQL | Railway (plugin) | La API no usa SQLite |
| API NestJS | Railway | Persistencia, TypeORM, `/health` |
| UI Next.js | Vercel | App Router; el cliente habla con `/backend` (mismo origen) |

GitHub ya puede estar conectado a ambos. Eso solo habilita el *push-to-deploy*. Falta configurar **root directory**, **Postgres** y **variables**.

## 1. Railway — Postgres + API

1. En el proyecto Railway, **New → Database → PostgreSQL**.
2. Cree (o abra) el servicio de la API a partir del repo `team-mex-MTTO`.
3. **Settings → Root Directory**
   - Déjelo vacío si Railway usa el `railway.toml` de la raíz (Dockerfile `api/Dockerfile`), **o**
   - ponga `api` (entonces usa `api/Dockerfile` + `api/railway.toml`).
4. **Settings → Networking → Generate Domain** (URL pública `https://….up.railway.app`).
5. **Variables** del servicio API. Referencie las del plugin Postgres (Railway las expone al conectar el servicio):

   | Variable | Valor |
   |----------|--------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al plugin; no la pegue a mano) |
   | `HOST` | `0.0.0.0` |
   | `CORS_ORIGIN` | URL de Vercel, p. ej. `https://su-app.vercel.app` (véase el paso 3) |
   | `DB_SYNCHRONIZE` | `true` (v0: TypeORM crea tablas; no es el modelo final de migraciones) |

   Railway inyecta `PORT`. No lo fije a 3001.

   WhatsApp / Evolution es opcional y **no** es prod; deje `ANDON_NOTIFY_PROVIDER` en `noop`.

6. El primer arranque corre la semilla (U-101…, choferes, inventario). Compruebe `https://<api>/health` → `{ "status": "ok", … }` y `https://<api>/docs`.

Si el build falla buscando `package.json` en la raíz, el Root Directory está mal: no hay app Node en `/`.

## 2. Vercel — UI

1. Proyecto Vercel → este repo.
2. **Settings → General → Root Directory** = `web` (Framework Preset: Next.js).
3. **Settings → Environment Variables** (Production y Preview):

   | Variable | Valor |
   |----------|--------|
   | `API_URL` | URL pública de Railway **sin** barra final, p. ej. `https://api-xxxx.up.railway.app` |
   | `NEXT_PUBLIC_API_BASE` | `/backend` |

   `API_URL` se usa en el rewrite de `next.config.ts` (`/backend/*` → API). El navegador no llama a Railway en cruz; CORS solo aplica si alguien pega la API directo.

4. Redeploy (un push a `main` o **Redeploy**). Abra `https://<ui>/` y elija rol.

`output: 'standalone'` del Next solo aplica fuera de Vercel (Docker local). En Vercel no se usa.

## 3. Cerrar el círculo CORS

Cuando Vercel tenga dominio:

1. En Railway, `CORS_ORIGIN` = `https://<su-ui>.vercel.app` (varios orígenes: separados por coma).
2. Redeploy o Restart del servicio API.
3. Dominio custom: añada `https://su-dominio.com` a `CORS_ORIGIN` y vuelva a desplegar la UI si cambió `API_URL`.

## 4. Orden práctico (primera vez)

1. Merge a `main` (o deje que Railway/Vercel desplieguen esta rama).
2. Railway: Postgres + API + dominio + `DATABASE_URL`.
3. Vercel: Root `web` + `API_URL` + deploy.
4. Railway: `CORS_ORIGIN` = URL de Vercel.
5. Prueba: login stub (Supervisor / Admin) → Unidades / Inventario / Andon.

## Qué no hace falta

- CI extra: el deploy lo dispara el push a GitHub.
- Desplegar la UI en Railway (ya está Vercel).
- `DB_HOST` / `DB_PORT` / `DB_USER` en Railway si existe `DATABASE_URL`.
- Evolution/WhatsApp para que el v0 funcione.

## Fallos frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Railway: no encuentra `package.json` | Root Directory no es `api` y no está usando el `railway.toml` raíz |
| API cae al conectar Postgres | Falta `DATABASE_URL` o el plugin no está referenciado |
| UI carga pero cada fetch falla | `API_URL` vacío o con `/` final; o no hizo Redeploy tras cambiarla |
| CORS en el navegador | Está llamando a Railway en vez de `/backend`; o `CORS_ORIGIN` no incluye la UI |
| Tablas vacías / error de schema | El arranque no llegó a semilla; vea logs de Railway |

Detalle de env local: `api/.env.example`, `web/.env.example`.
