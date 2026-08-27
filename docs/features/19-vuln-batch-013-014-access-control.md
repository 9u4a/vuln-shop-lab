# Vulnerability batch: VULN-013 mass assignment, VULN-014 CSRF

Branch: `feature/vuln-batch-013-access-control` (stacked on `chore/vuln-index-refresh`, not yet merged)

Theme A01 Broken Access Control. First feature branch of the VULN-013–022 batch.

## VULN-013 — Mass assignment → privilege escalation

Real feature added: **edit shipping info (name/phone/postcode/address) in My Page** — until
now only `bio` was editable, name/phone/address were signup-only.

- `apps/node-express/src/routes/profile.js` `PUT /` — was `UPDATE users SET bio=?`; now builds
  `SET <col>=?` from `Object.keys(req.body)` (keys filtered to `/^[a-z_]+$/`, minus `id`),
  values still bound. Refreshes `req.session.user` after save so a role change is live at once.
- `apps/java-spring/.../ProfileController.java` `update()` — was `user.setBio(...)`; now
  `objectMapper.updateValue(user, body)` merges the whole request map onto the `User` entity.
- Client: `api.js` `updateProfile(base, patch)` now takes an object; `MyPageProfile.jsx` gets a
  "배송 정보" form (name/phone/postcode/address — all single-token keys, identical column/property
  name on both stacks). Exploit payload `{"role":"system_admin"}` is stack-agnostic.

Doc: `docs/vulnerabilities/VULN-013-mass-assignment-profile-privesc.md`.

## VULN-014 — CSRF: no tokens + SameSite=None cookie

- `apps/node-express/src/server.js` — `app.set('trust proxy', 1)` + session `cookie: { sameSite:
  'none', secure: true }`.
- `apps/java-spring/.../application.yml` — `server.forward-headers-strategy: framework` +
  `server.servlet.session.cookie.{same-site: none, secure: true}`.
- `apps/nginx/nginx.conf` — the two `/api/*` proxy blocks now send `X-Forwarded-Proto https`
  (was `$scheme`).
- `apps/client/vite.config.js` — the `/api/node` and `/api/java` dev-proxy entries send
  `X-Forwarded-Proto: https` too, so the Vite dev path (`:5173`) keeps working with `Secure`
  cookies (localhost is a secure context in Chrome/Firefox).

The lab has no TLS; `X-Forwarded-Proto https` from both proxies is the realistic "TLS-terminating
reverse proxy" setup that makes `Secure`/`SameSite=None` cookies function while the browser↔proxy
hop is `http://localhost`. Direct WAS ports (`:3000`, `:8081`) are not browser entry points.

Doc: `docs/vulnerabilities/VULN-014-csrf-no-token-samesite-none.md`.

## Verification

- Node: `node -c` on `server.js`, `routes/profile.js`.
- Java: `docker compose build java-spring`.
- End-to-end via `docker compose up`:
  - login through `:8090` (nginx) and `:5173` (vite) both still set + persist the session cookie
    (regression check for the `Secure`/proxy change).
  - `user1` → `PUT /api/{node,java}/profile {"role":"system_admin"}` → `GET /api/.../session`
    shows `system_admin`, `GET /api/.../admin/users` returns 200 + full PII.
  - cross-origin auto-submit form → `POST /api/node/admin/products/1/image` succeeds with no token.
