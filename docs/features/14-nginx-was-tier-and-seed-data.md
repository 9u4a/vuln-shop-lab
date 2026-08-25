# Feature: Nginx web-server tier fronting the WAS, richer demo seed data

Branch: `feature/nginx-was-tier-and-seed-data` (built on `main`, after PR #14 merged)

## What was added

### Nginx (web server) → WAS 2-tier architecture

- `apps/nginx/Dockerfile` — multi-stage: builds the client (`vite build`, with `VITE_TOSS_CLIENT_KEY` baked in via build arg since a static build inlines `VITE_`-prefixed env vars at build time, unlike the Vite dev server which reads them at request time) then copies the output into an `nginx:1.27-alpine` final stage.
- `apps/nginx/nginx.conf` — serves the built client as static files (SPA fallback via `try_files ... /index.html`), reverse-proxies `/api/node/*` → `node-express:3000/api/*` and `/api/java/*` → `java-spring:8081/api/*` (same path-rewrite convention the Vite dev proxy already used, so the client's `api.js` needed no changes), and `/uploads/node/*` / `/uploads/java/*` the same way. `client_max_body_size 5m` so avatar/product image uploads (2MB cap in the apps themselves) aren't rejected by Nginx first.
- `docker-compose.yml` — new `nginx` service, build context is the repo root (needs to reach into `apps/client/`), host port `8080`, depends on both backends.
- Added a root `.dockerignore` (didn't exist before) so the root-context build doesn't ship `.git`, `node_modules`, `data`/`uploads`, `target`, or `docs/` into the Docker build context.
- `CLAUDE.md` directory-structure and "Run locally" sections updated: Nginx (`:8080`) documented as the production-like entry point sitting in front of the WAS tier (node-express/java-spring), Vite dev server (`:5173`) kept as-is for hot-reload development — both remain available, this doesn't replace the dev workflow.

### Seed data (authored directly by the user, verified and merged in as-is)

Both stacks' seeders were rewritten with a much fuller demo dataset: 5 users (`9u4a`/system_admin, `admin`/admin, `user1`/`user2`/`user3`/user — all with realistic Korean name/phone/bio/address), 10 products (5 new SKUs added alongside the original 5, richer Korean descriptions), 5 FAQs (attributed to `admin`/`9u4a`), 4 notices, 9 reviews across 7 products, and 4 seeded orders (mix of `paid`/`pending`) with matching order items — all idempotent (checked via `COUNT(*) === 0` / `findByUsername` before inserting, safe to restart against an existing DB).

## Verified

Fresh volumes, `docker compose up --build` (all four services — node-express, java-spring, client, nginx — built and started cleanly):

- `http://localhost:8080/` → `200`, serves the built SPA.
- `http://localhost:8080/api/node/products` and `.../api/java/products` → both return the 10 seeded products (Java's `89000.0` vs Node's `89000` is a harmless BigDecimal-scale artifact, already handled by the client's `formatCurrency`).
- `http://localhost:8080/uploads/node/keyboard.png` and `.../uploads/java/keyboard.png` → `200 image/png`.
- Login via `http://localhost:8080/api/node/auth/login` and `.../api/java/auth/login` (both as `user1`) → session cookie set and persists across a follow-up request through the same Nginx origin (`/api/node/session` echoes the logged-in user) — confirms the reverse proxy doesn't break session/cookie handling.
- Seeded data reachable through Nginx on both stacks: 2 orders for `user1`, 5 FAQs, 4 notices, 2 reviews on product 1.
