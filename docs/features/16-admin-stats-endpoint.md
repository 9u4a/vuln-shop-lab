# Refactor: Admin overview page fetched 5 full tables just to show counts

Branch: `refactor/admin-stats-endpoint` (built on `fix/nginx-port-burp-conflict`, not yet merged)

## Problem

`AdminSettings.jsx` (the page an admin lands on — `/admin` redirects to `/admin/settings`) fired 5 parallel API calls on every load: `fetchAdminUsers`, `fetchAdminOrders`, `fetchProducts`, `fetchFaqs`, `fetchNotices` — each returning the *entire* table — just to read `.length` off each result and throw the rest away. Doesn't scale: as any of those tables grows, the overview page's cost grows with it even though it only ever needed 5 integers.

## Fix

Added a single lightweight `GET /api/admin/stats` endpoint on both stacks, admin-gated, returning `{ users, orders, products, faqs, notices }` as counts computed with `COUNT(*)` (Node, raw SQL) / `JpaRepository.count()` (Java) — O(1) response size regardless of table size, no row data transferred. `AdminController` needed `FaqRepository`/`NoticeRepository` added to its constructor (it only had `User`/`Product`/`Order` before). `AdminSettings.jsx` now calls this one endpoint instead of `Promise.all([...5 calls])`.

## Verified

Rebuilt node-express, java-spring, and nginx; via `http://localhost:8090` (through the Nginx tier):
- `GET /api/node/admin/stats` and `.../api/java/admin/stats` (logged in as `9u4a`) both return `{"users":5,"orders":4,"products":10,"faqs":5,"notices":4}` — matching the seeded data.
- Unauthenticated request → `401 {"error":"로그인이 필요합니다."}` on Node; same guard pattern on Java.
