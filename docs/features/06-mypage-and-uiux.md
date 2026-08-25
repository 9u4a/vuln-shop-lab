# Feature: My Page (password change) & UI/UX overhaul

Branch: `feature/mypage-and-uiux`

## What was added

- **Password change**: `PUT /api/profile/password` on both backends — requires `currentPassword` + `newPassword` (min 8 chars), verifies the current password against the stored hash before updating, rejects with `401` on mismatch.
- **My Page** (`/profile`, renamed from "My Profile"): now three sections — Account (avatar + username/role), Profile info (bio), Change password — instead of one flat form.
- **Nav overhaul**: proper sticky topbar with a labeled `main-nav` (Products, Cart with item count, My Orders, Admin) instead of a flat list of links; account area on the right shows a greeting plus explicit "My Page"/"Logout" (or "Login"/"Sign up") buttons rather than folding the profile link into "Hi, username".
- **Global UI/UX pass**: `index.css` rewritten with CSS custom properties (color/spacing/radius tokens), a real button system (`btn`, `btn-primary`, `btn-ghost`, `btn-sm`), card containers, consistent page header pattern (`page` / `page-header`), badges for status/role, and responsive tweaks. Applied consistently across Home, Login, Signup, Products, ProductDetail, Cart, Orders, OrderDetail, Admin, Profile — not just the new page.

## Why

- Password change was the one basic account action missing; without it "정보 수정" only covered bio/avatar.
- The old nav buried account access behind a username link and had no visual hierarchy (all plain text links). The new topbar makes every route reachable and the active page/current backend obvious at a glance.
- A single shared `index.css` pass (rather than per-page inline styling) keeps every page visually consistent and makes future pages cheap to build correctly.

## Verified

Via `docker compose up --build`, on both backends:
- Password change: wrong current password → `401`; correct change → `200`; old password stops working, new password logs in successfully.
- All client routes (`/`, `/products`, `/cart`, `/login`, `/signup`, `/orders`, `/profile`, `/admin`) still serve `200`.
