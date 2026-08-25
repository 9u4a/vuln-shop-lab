# Feature: Admin Panel

Branch: `feature/admin-panel` (built on top of `feature/reviews`)

## What was added

- **Admin bootstrap**: the first user ever registered on a given backend gets `role='admin'` automatically; everyone after that is `role='user'`. No env var, no manual DB edit needed to get a usable admin account. (This is a standard single-tenant self-host bootstrap pattern, not itself a vulnerability — see note below.)
- `GET /api/admin/users`, `PUT /api/admin/users/:id/role` — list all users, change a user's role.
- `GET /api/admin/orders` — list every order across all users (id, username, status, total, createdAt).
- `POST/PUT/DELETE /api/admin/products` — product CRUD.
- All of the above are gated by `requireAdmin` (Node middleware) / an inline session-role check (Java) — `401` if not logged in, `403` if logged in but not admin.
- Client: `/admin` page (users + role dropdown, all orders, product list with delete, product-create form). "Admin" nav link only rendered for `role === 'admin'` users — client-side hiding only, **not** the actual access boundary; the server-side check is what actually enforces it (verified below).

## Why "first user = admin" isn't the misconfiguration vulnerability itself

This app will eventually get a deliberately weak/default-admin-credential vulnerability tracked under `docs/vulnerabilities/`. That's a *different* thing from bootstrap logic: "first signup becomes admin" is how you get a working admin account on a fresh single-tenant instance at all (same pattern as WordPress/Nextcloud/Grafana first-run). The future vulnerability will be about the credential itself being weak/guessable/undocumented-but-present, not about who is allowed to become admin during setup.

## Verified

Via `docker compose down -v && docker compose up --build` (fresh DB, so the bootstrap logic is actually exercised), through the client's Vite proxy, for both `node` and `java` backends:
- First registered user's session reports `role: "admin"`; second user's reports `role: "user"`.
- `GET /api/admin/users` — `401` anonymous, `403` as the second (non-admin) user, `200` as the admin.
- Admin can change the second user's role to `admin` (`200`), create a product (`201`, shows up in the public product list), and delete it (`200`).
- `GET /api/admin/orders` returns `200` for the admin (empty list, since no paid orders existed in the fresh DB at test time).
