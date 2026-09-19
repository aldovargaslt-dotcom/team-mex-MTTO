# Demo v1 — Vercel (web) + Railway (API + Postgres)

Locked topology: **Next.js on Vercel**, **NestJS + Postgres on Railway**. Auth is the stub header `X-Role` (no JWT). Andon notify stays `noop`. Out of scope: seed changes, Evolution/WhatsApp, feature work.

## Live (from `main`)

| Surface | URL | Status |
|---------|-----|--------|
| API | https://team-mex-mtto-production.up.railway.app/health | Live (`{"status":"ok",...}`) |
| Swagger | https://team-mex-mtto-production.up.railway.app/docs | Live |
| Web (Railway, public, no SSO) | https://web-production-022a6.up.railway.app | Live interim UI |
| Web (Vercel production) | https://team-mex-mtto.vercel.app | **BLOCKED** — `404` / no production deployment |

Baseline: `main` @ `12f0704` (includes Logo #9 `ea36957`). Railway Git: repo `aldovargaslt-dotcom/team-mex-MTTO` branch `main`.

Vercel project already exists and is Git-linked: `team-mex-mtto` (`prj_Iph7mcsk4HtmvlF1LDhmlJe2IbZr`) on team `aldovargaslt-dotcoms-projects` (`team_mpm2h4nwt6rAWvyS0Yi5D70x`). Agents cannot finish the Vercel production deploy: Hobby-team API returns **403** (`re-authenticate to this scope`). Preview URLs bounce to Vercel SSO.

## How to finish Vercel (Aldo)

Do this in the Vercel dashboard while logged in as the Hobby team owner. One missing step blocks the rest: **re-auth the Hobby team scope**.

1. Open [Vercel](https://vercel.com) as `aldovargaslt-dotcom` → team **aldovargaslt-dotcoms-projects**.
2. Project **team-mex-mtto** → **Settings → General → Root Directory = `web`** → Save. (If Root Directory is empty, the repo-root `vercel.json` fails the build on purpose.)
3. **Settings → Environment Variables** (Production and Preview):

   | Name | Value |
   |------|--------|
   | `API_URL` | `https://team-mex-mtto-production.up.railway.app` (no trailing slash) |
   | `NEXT_PUBLIC_API_BASE` | `/backend` |

   `web/next.config.ts` already falls back to that API URL when `VERCEL` is set. Still set `API_URL` so a rebuild does not depend on the hardcoded fallback.
4. **Settings → Deployment Protection**: turn **off** Vercel Authentication for Production (demo must be public). Previews may stay protected.
5. **Deployments → Promote** the latest successful `main` build to Production, or **Redeploy** `main` with Production. Confirm `https://team-mex-mtto.vercel.app` returns the app (not 404, not SSO).
6. Optional: on Railway service `team-mex-MTTO`, set `CORS_ORIGIN=https://team-mex-mtto.vercel.app`. The browser uses same-origin `/backend`, so `CORS_ORIGIN=*` is enough for the first demo.

If Cursor/Vercel MCP should deploy next time: reconnect the Vercel integration and grant **aldovargaslt-dotcoms-projects**. CLI needs `VERCEL_TOKEN` plus that team — do not commit tokens.

## Railway (already wired — do not recreate)

Project **valiant-determination** (`f279d506-564a-454a-b213-7f12c53eac64`), env **production**.

| Service | Root | Notes |
|---------|------|--------|
| Postgres | managed | Reference `DATABASE_URL` into the API |
| `team-mex-MTTO` (API) | `api` | Health `/health`. `PORT` is injected. |
| `web` | `web` | Dockerfile. Public URL is the domain **without** target port 3000 (`…-022a6…`). The `:3000` domain 502s. |

Push to `main` redeploys API + Railway web. Config in repo: `railway.toml` (root = API image), `api/railway.toml`, `web/railway.toml`, Dockerfiles.

Do **not** pin the web service domain to container port 3000. Next listens on Railway’s `PORT` (often 8080).

## Env vars

### API (Railway) — required

| Name | Notes |
|------|--------|
| `DATABASE_URL` | Reference from Postgres. Do not copy local `DB_HOST`. |
| `CORS_ORIGIN` | `*` for first demo, then the Vercel origin |
| `ANDON_NOTIFY_PROVIDER` | `noop` |
| `HOST` | `0.0.0.0` |

`PORT` is set by Railway. No `JWT_SECRET` — v0 uses `X-Role`. Leave Evolution vars unset.

Local copies: `api/.env.example`.

### Web (Vercel) — required at build

| Name | Notes |
|------|--------|
| `API_URL` | Public Railway API, no trailing slash |
| `NEXT_PUBLIC_API_BASE` | `/backend` |

Local copies: `web/.env.example`.

## Local vs demo

```bash
docker compose up -d
cd api && cp .env.example .env && npm install && npm run start:dev
cd web && npm install && npm run dev
```

Full LAN stack: `docker compose --profile app up -d --build` (README).
