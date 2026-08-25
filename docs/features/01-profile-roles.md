# Feature: Profile & Roles

Branch: `feature/profile-roles`

## What was added

- `users` table gains `bio` and `avatar_url` columns (both stacks).
- `GET/PUT /api/profile` — view and edit the logged-in user's own bio.
- `POST /api/profile/avatar` — multipart image upload (png/jpg/jpeg/gif/webp, 2MB max), served back from `/uploads/<filename>` on each backend.
- `requireAuth`/`requireAdmin` middleware added on the Node side (Java already gates via inline session checks); both are the reusable auth-guard pattern later features (admin panel) will build on.
- Client: new `/profile` page (view bio/avatar, edit bio, upload avatar), linked from the nav when logged in.
- Vite dev proxy extended with `/uploads/node` and `/uploads/java` so avatar images load through the same origin as the API, consistent with how `/api/node` and `/api/java` already avoid cross-origin cookie issues.

## Schema prepared ahead of later features

Per the plan to design the DB with the full feature set in mind, this branch also adds (unused for now, wired up in later branches):

- `products.category` — for the search/filter feature.
- `reviews` table — product reviews.
- `orders` / `order_items` tables — cart checkout, including `webhook_url`, `toss_order_id`, `toss_payment_key` columns for the payment feature.

Node uses a guarded `ALTER TABLE ... ADD COLUMN` (wrapped in try/catch, since `sqlite` has no `IF NOT EXISTS` for columns) so existing dev databases pick up new columns without a manual migration step. Java relies on Hibernate `ddl-auto: update`, which does the same automatically.

## Why this design

- File upload validation (extension whitelist + size cap) is intentionally correct here — this is feature work, not the vulnerability-injection phase. Any file-upload vulnerability (e.g. path traversal, extension bypass) will be introduced later as a tracked, documented change per `docs/vulnerabilities/` once we reach that phase.
- Avatars are stored by random UUID filename, not the user-supplied name, to avoid accidental collisions/overwrites in this phase.
- `role` was already on `users` but nothing checked it; `requireAdmin` exists now so the upcoming admin-panel branch has a ready-made guard instead of inventing access control ad hoc per route.

## Verified

- `docker compose up --build`, then for both `node` and `java` backends via the client's Vite proxy: signup → login → `GET/PUT /api/profile` → `POST /api/profile/avatar` → uploaded image fetched back via `/uploads/<node|java>/<file>`. All 200s, bio and avatar persisted correctly.
