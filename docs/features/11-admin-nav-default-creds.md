# Feature: Restore Admin nav link for admin/system_admin, seed default admin account

Branch: `feature/admin-nav-default-creds` (built on `main`, after PR #9/#10/#11 merged)

## What was added

- **Admin nav link restored, role-gated**: `Layout` in `App.jsx` shows `Admin` in the top nav again when `user.role` is `admin` or `system_admin` (`ADMIN_ROLES.includes(user.role)`), same condition already enforced server-side and by the `RequireRole` route guard on `/admin/*`. The previous feature branch had removed the link entirely; this restores the original show/hide-by-role behavior instead.
- **Default `system_admin` account seeded on both stacks** (`username: 9u4a`, `password: 9u4a`): created once at startup if no user with that username exists yet (Node: `db.js`, bcryptjs `hashSync`; Java: `DataSeeder.seedDefaultAdmin()`, `BCryptPasswordEncoder`). Independent of the existing "first signup becomes system_admin" bootstrap in `auth.js`/`AuthService` — since this account already exists at first boot, that bootstrap path effectively never triggers on a fresh DB anymore (the first *human* signup becomes a plain `user`, which is correct once a system_admin already exists).
- Not tracked as a vulnerability finding — this account is the project's own admin login for driving the demo app (nav, other features' manual verification, etc.), not a flaw discovered by testing, so classifying it as VULN-003 was withdrawn.

## Current admin access control (for reference)

- **Node**: `middleware/auth.js` — `requireAuth` (any session), `requireAdmin` (`role` in `{admin, system_admin}`), `requireSystemAdmin` (`role === system_admin`). Applied per-route in `admin.js`, `faqs.js`, `notices.js`.
- **Java**: equivalent role checks via `Roles.isAdminOrAbove` / `Roles.isSystemAdmin`, enforced in controllers.
- **Client**: `RequireRole` wraps the `/admin/*` route tree and redirects to `/forbidden` if the logged-in user's role isn't allowed — this is the actual access control. The nav link is purely a visibility affordance on top of it; hiding/showing it never changes what a direct URL visit can reach (verified in the previous feature's testing that `/admin` still 403s a plain `user` regardless of link visibility).

## Verified

Fresh volumes, `docker compose up --build`, both backends via curl: `POST /auth/login` with `9u4a`/`9u4a` → `200`, `role: system_admin`, on both stacks.

In the browser (Node backend): logged in as `9u4a` → nav shows `Products / Notices / Cart / My Orders / FAQ / Admin` → clicked into `/admin/settings` → "Signed in as SYSTEM_ADMIN", overview shows `Users: 1` (only the seeded account, confirming it's not a duplicate of any manual signup).
