---
name: verify-api
description: Run Team Mex API Jest unit and e2e tests (cd api). Use when api/ changes, before claiming tests pass, or when asked to verify the API. Does not lint --fix.
---

# verify-api

Misma barra que README / CI. **No** hay `package.json` en la raíz: siempre `cd api`.

## DB

Dos caminos válidos (máquinas distintas; no inventar un tercero):

1. **Humano (README):** `docker compose up -d` — Postgres 16, user `team_mex`, DBs `team_mex_mtto` + `team_mex_mtto_test`, schemas de `docker/init.sql`.
2. **Cloud Agent:** `bash .cursor/wait-for-db.sh` (o `.cursor/start.sh`) — Postgres nativo. `install.sh` ya corrió en el boot.

Listo cuando `127.0.0.1:5432` acepta conexiones.

## Comandos

```bash
# opcional: script/verify.sh hace unit + e2e + web
bash .cursor/wait-for-db.sh   # Cloud Agent; o docker compose up -d
cd api
npm test
npm run test:e2e
```

E2e lee `api/test/setup-e2e.ts`: `DB_HOST` (default localhost), `DB_NAME=team_mex_mtto_test`, `DB_SYNCHRONIZE=true`, `DB_DROP_SCHEMA=true`. Credenciales `team_mex` / `team_mex`.

Atajo: `script/verify.sh` desde la raíz (`cd` a `api`/`web`). Si no hay Postgres, salta e2e y lo dice.

## No hacer

- `npm run lint` de `api` en CI (`--fix` muta). Warnings de ESLint type-safety preexistentes: no fallar el overlay por eso.
- Playwright, husky, o un workspace npm inventado.
- Tocar `web/` — eso es `proof-ui`.
