# Feature: Product detail attributes/options, My Page split, nav cleanup

Branch: `feature/product-details-mypage-nav` (built on top of `feature/admin-subpages-notices-images`)

## What was added

- **Dummy product images**: 5 solid-color 300x200 PNGs (keyboard/mouse/monitor/hub/lamp), generated with a pure-Python zlib/struct PNG encoder (no PIL dependency needed). Stored per-backend under `seed-images/` and copied into the runtime `uploads/` dir on first startup (skipped if already present) — mirrors the avatar/product-image upload path so both seeded and uploaded images are served identically.
- **Product attributes**: `products` gained `brand`, `sku`, `stock` (default 100), `option_name`, `option_values` (comma-separated) on both stacks, via guarded `ALTER TABLE` migrations (Node) / Hibernate `ddl-auto: update` (Java). `ProductDetail.jsx` now renders a specs table (brand/SKU/category/stock) instead of just name+price+description.
- **Quantity + option selection**: `ProductDetail.jsx` adds a quantity `<input type="number">` and (when `optionValues` is non-empty) a `<select>` labeled by `optionName`. `CartContext` now keys cart lines by `` `${productId}::${option || ''}` `` so the same product with different options becomes separate lines; `Cart.jsx`, `OrderDetail.jsx`, `orders.js`/`OrderController` and `order_items.option_value` (new column, both stacks) carry the selection through checkout.
- **Nav reorder + Admin link hidden**: top nav is now Products / Notices / Cart / My Orders, with FAQ appended after (order wasn't specified for FAQ). The Admin nav link is removed entirely from `Layout` — `/admin/*` routes, `RequireRole` guard, and direct-URL access are unchanged, so this is a visibility change only, not an access-control change.
- **My Page split + password re-auth gate**: `pages/Profile.jsx` (monolithic) replaced by `pages/mypage/{MyPageLayout,MyPageProfile,MyPagePassword}.jsx`, routed at `/mypage` (index = profile/bio/avatar) and `/mypage/password`, using the same tab-subnav + `<Outlet/>` pattern as `AdminLayout`. `MyPagePassword` requires re-entering the current password before showing the actual change-password form:
  - New endpoint `POST /profile/verify-password` (both stacks) checks the given password against the stored hash without changing anything — distinct from `PUT /profile/password`, which performs the real change and still independently requires `currentPassword`.
  - Client caches the verified password in React state only (never persisted) so the user isn't asked for it twice across the verify → change round trip.
- **Admin product form**: `AdminProducts.jsx` create-product form now exposes brand/SKU/stock/option name/option values (comma-separated text field, split into an array client-side) so admins can actually set these through the UI rather than only via seed data.

## Bug fixed along the way

Java's `Product.stock` is a primitive `int` with `@Column(nullable = false)`. On an existing dev DB, Hibernate's `ddl-auto: update` tried to `ALTER TABLE ADD COLUMN stock ... NOT NULL` with no default, which fails against existing rows (`NULL not allowed for column "STOCK"`) and aborted the whole schema migration — `GET /api/products` then 500'd because the column never got created. Fixed with `@ColumnDefault("100")` so the generated DDL includes `DEFAULT 100`, matching Node's `ALTER TABLE ... DEFAULT 100` migration. Not a new-code bug introduced by request logic, but a real schema-migration gap surfaced by adding a NOT NULL column to a table with existing rows — worth documenting since `ddl-auto: update` will hit this again for any future NOT NULL column.

## Verified

Fresh volumes, `docker compose up --build`, both backends via curl:
- `GET /products` on both stacks return matching brand/sku/stock/optionName/optionValues shapes (Java via `@JsonIgnore`/`@JsonProperty` split, same as before).
- Seed images served with real PNG bytes (`200`, `image/png`) from both backends' `/uploads/`.
- `POST /profile/verify-password`: wrong password → `401`; correct password → `200`; unauthenticated → `401`.
- `POST /orders` with `optionValue` → order created, `GET /orders/:id` echoes the selected option back on both stacks.

In the browser (Claude in Chrome), Node backend:
- Nav order confirmed (Products / Notices / Cart / My Orders / FAQ), Admin link absent even for this session, `/admin` while logged in as a plain `user` still redirects to the 403 page (guard unaffected by hiding the link).
- Product detail page: dummy image, specs table, option `<select>`, quantity input, add-to-cart all render and work.
- `/mypage/password` shows the "Verify your identity" gate first; wrong password stays locked (not screenshotted, covered by the curl check above); correct password unlocks the real change-password form; submitting it shows "Password changed successfully."; confirmed via curl that the old password now fails login and the new one succeeds.
- `/mypage` (Profile tab) renders avatar/username/role badge/bio form correctly.
