# Feature: Admin sub-pages, Notices, 403/404 redirects, product images

Branch: `feature/admin-subpages-notices-images` (built on top of `feature/role-tiers-and-faq`)

## What was added

- **Admin sub-pages**: the single `/admin` page (everything in one component) is now `/admin/settings`, `/admin/users`, `/admin/orders`, `/admin/products`, `/admin/faq`, `/admin/notices` — an `AdminLayout` with a tab sub-nav and `<Outlet/>`, `/admin` index redirects to `/admin/settings`. Each tab fetches only its own data instead of one monolithic `loadAll()`.
- **Notices** (공지사항): mirrors the FAQ feature exactly — `notices` table (`title`, `body`, `created_at`), public `GET /api/notices`, admin-gated write endpoints, public `/notices` page (nav-linked) + `/admin/notices` management tab.
- **403 / 404 redirect pages**: `NotFound.jsx` and `Forbidden.jsx` — both render a message, then auto-redirect to `/` after 3 seconds. Wired up via:
  - `RequireAuth` — redirects to `/login` if not logged in (used on `/profile`, `/orders`, `/orders/:id`).
  - `RequireRole` — redirects to `/forbidden` if logged in but role isn't in the allowed set (used on `/admin/*`, wraps `AdminLayout`).
  - `<Route path="*" element={<NotFound/>}/>` catches every unmatched URL.
  - Added a `loading` flag to `SessionContext` so these guards don't flash-redirect before the session fetch resolves.
- **Product image upload**: `POST /api/admin/products/:id/image` (both stacks, admin-gated, same png/jpg/jpeg/gif/webp + 2MB validation as avatar upload). Node: extracted the multer setup shared with avatar upload into `src/uploads.js`. Java: extracted a `storage.Uploads` helper shared with `ProfileController`.
- **Product images now actually render**: `Products.jsx` and `ProductDetail.jsx` previously never rendered `<img>` at all despite the field existing in the DB since the beginning. Both now show the image (with `onError` hiding a broken one, since seed data's `image_url` values are placeholder paths, not real uploaded files).
- Node `GET /api/products` and `GET /api/products/:id` now map DB rows to camelCase (`imageUrl`, `createdAt`) via a `toProduct()` helper, matching Java's Jackson output — was previously the one remaining snake_case response in the app. Confirmed this doesn't affect VULN-001 (SQLi still fully exploitable — the mapping is a response-shape transform, not a change to query construction).

## Verified

Fresh DB, `docker compose up --build`, both backends via curl:
- Product create → image upload → `GET /products/:id` returns the new `imageUrl`; the file is actually retrievable through the client's upload proxy.
- Notices: admin create → `201`; plain user create → `403`; public `GET /api/notices` → `200` with no auth.
- VULN-001 (SQLi) and VULN-002 (SpEL) both re-verified working after the products.js refactor (password hash dump / `HOSTNAME` env read).

In the browser (Claude in Chrome):
- Uploaded a real 1x1 PNG to a product and confirmed it renders on the product detail page (`img.complete === true`, correct `naturalWidth/Height`) and as a thumbnail on `/admin/products`.
- `/this-page-does-not-exist` → 404 page → auto-redirected to `/` after 3s (confirmed via `window.location.pathname`).
- `/admin` while logged out → 403 page, same for a logged-in plain `user` (nav doesn't even show the Admin link for them).
- Logged in as `system_admin` → `/admin/products` tab shows the sub-nav, role badge, product grid with thumbnails, and the upload/delete controls.
