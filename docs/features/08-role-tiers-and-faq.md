# Feature: Three-tier roles (user/admin/system_admin) + FAQ

Branch: `feature/role-tiers-and-faq`

## What was added

- **Role tiers**: `user` → `admin` → `system_admin`, both stacks.
  - Bootstrap: first registered user now gets `system_admin` (was `admin`); everyone after is `user`.
  - `requireAdmin` (Node middleware / per-controller helper in Java) now accepts `admin` **or** `system_admin`.
  - New `requireSystemAdmin` gate, applied only to `PUT /api/admin/users/:id/role` — promoting/demoting users (including granting `system_admin` itself) is `system_admin`-only. Everything else admin-level (products CRUD, FAQ CRUD, viewing users/orders) stays open to both `admin` and `system_admin`.
  - Java: extracted role constants/checks into `com.vulnlab.shop.security.Roles` so both `AdminController` and the new `FaqController` share one definition instead of duplicating string checks.
- **FAQ**: new `faqs` table (`question`, `answer`, `created_at`).
  - `GET /api/faqs` — public, no auth.
  - `POST/PUT/DELETE /api/faqs` — `requireAdmin` (both stacks).
  - Client: public `/faq` page (nav-linked), and an "FAQ" management section in the Admin page (list + delete + create form) alongside Users/Orders/Products.
- Client: Admin page now shows the current user's role badge, hides the role-change `<select>` entirely for plain `admin`s (with a note that only System Admins can change roles), and the role dropdown itself includes `system_admin` as an assignable value for `system_admin` viewers. Nav's "Admin" link now checks for `admin` OR `system_admin` (was hardcoded to `admin` only, which would've hidden the link from the very account that just got renamed to `system_admin`).

## Why this split

- Matches the request directly: separate "manages storefront content" (admin) from "controls who has power" (system_admin) — a regular admin being able to promote themselves or anyone else to system_admin would defeat the point of having the tier at all.
- Session caches the role at login time (same as before this change), so a promoted/demoted user only sees the new role after logging in again — noted here since it's easy to mistake for a bug during testing.

## Verified

Fresh DB (`docker compose down -v && up --build`), both backends:
- First signup → `system_admin`; second signup → `user`.
- Second user (`user` role) attempting the role-change endpoint → `403`.
- `system_admin` promotes second user to `admin` → `200`; after re-login (session refresh) their token reflects `admin`.
- As `admin`: `POST /api/faqs` → `201`; `PUT /api/admin/users/:id/role` → still `403` (system_admin only).
- Anonymous `POST /api/faqs` → `401`; `GET /api/faqs` → `200` with no auth.
- Client `/faq` route serves `200`.
