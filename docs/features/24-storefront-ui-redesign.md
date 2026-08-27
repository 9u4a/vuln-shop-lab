# Storefront UI/UX redesign (minimal-premium)

Branch: `feature/storefront-ui-redesign`

The client had complete functionality but a "generic admin dashboard" look — grey page, blue
buttons, bordered cards, system font, no footer/hero/header-search, one mobile breakpoint.
This pass restyles the storefront and account pages to a minimal-premium Korean commerce tone
(near-monochrome, Pretendard, image-first cards, generous whitespace). `/admin` inherits the
new tokens only — no structural changes there.

## Direction (chosen by repo owner)

- Visual: minimal premium (29CM / 무신사), near-black palette
- Scope: storefront + account pages. `/admin` = token inheritance only
- Font: **Pretendard bundled via npm** (`pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css`) — no external CDN, safe for the isolated Docker lab
- New structure: home hero + category tiles + featured products; site footer; header search; mobile drawer nav

## What changed

### Design system
- `src/index.css` rewritten — new token set (`--color-ink` near-black primary, `--color-line`,
  status-accent tokens), tighter radii, shadow-light surfaces, larger type scale, `tabular-nums`
  for prices, 1200px container, 3-step responsive breakpoints (1024 / 768 / 480).
- Legacy selectors kept working (`.card` `.btn*` `.badge` `.product-grid` `form` `label`
  `input` `.muted` `.error` `.status-ok` `.specs-table` `.admin-subnav` `.modal*` `.pagination`
  `.toast*` `.profile-summary` `.avatar*` `.backend-cards` `.address-*`) so unedited pages
  (incl. all of `/admin`, Faq, Notices, Pagination) restyle automatically.
- `src/main.jsx` imports the Pretendard dynamic-subset stylesheet.

### Layout shell
- `components/SiteHeader.jsx` — utility bar (backend segmented toggle + account links),
  main bar (brand, desktop nav, pill search → `/products?q=`, cart icon with live count),
  hamburger ≤768px. Replaces the inline `Layout` header in `App.jsx`.
- `components/SiteDrawer.jsx` — left slide-in panel: nav links + account actions + backend
  toggle. Auto-closes on route change; locks body scroll while open. No `alert/confirm`.
- `components/SiteFooter.jsx` — 4-column footer, all-dummy company info + a one-line notice
  that the site is an intentionally vulnerable demo.
- `components/navLinks.js` — shared nav definition + `visibleNavLinks(user)` (auth/admin gating),
  exports `ADMIN_ROLES` (now imported by `App.jsx`).

### Reusable components
- `components/ProductCard.jsx` — image-first card (square media, brand caption, name, price,
  sold-out badge, add-to-cart → toast). Used by Home + Products.
- `components/Skeleton.jsx` — `Skeleton` + `SkeletonGrid` shimmer loaders.
- `components/EmptyState.jsx` — emoji + title + description + optional CTA.
- `components/StatusChip.jsx` — order-status string → Korean label + colored chip.

### Pages
- `Home.jsx` — rebuilt: hero (CSS-gradient, no external image), 3 category tiles
  (`/products?category=`), featured-products grid (`fetchProducts` → first 8, skeleton while
  loading). Backend indicator kept as read-only text in the hero (the switcher itself moved
  to the header).
- `Products.jsx` — category chip filters + sort select toolbar (replacing the free-text
  category input), `ProductCard` grid, `SkeletonGrid` + `EmptyState`. `q` search label still
  rendered via `dangerouslySetInnerHTML` (intentional XSS — VULN-017 area), `sortKeys` debug
  output kept.
- `ProductDetail.jsx` — two-column PDP (gallery + sticky buy box), qty stepper, star ratings.
  Review body still `dangerouslySetInnerHTML` (intentional — VULN-008). Add-to-cart toast.
- `Cart.jsx` — two-column (line list + sticky summary box), qty steppers, `EmptyState`.
  Toss widget mount view and `backendKey === 'java'` cart-import textarea (VULN-012) preserved.
- `OrderDetail.jsx` — `StatusChip` in header, `line-list` items, receipt tools card
  (memo → generate, print link, filename → download `<pre>`) preserved as-is (VULN-010/011/016/019).
- `Orders.jsx` / `CheckoutResult.jsx` / `NotFound.jsx` / `Forbidden.jsx` — `EmptyState` /
  status-screen treatment.
- `Login.jsx` / `Signup.jsx` — centered `auth-wrap` card. `AddressSearchModal` restyled via
  the shared `.modal*` rules.
- `mypage/MyPageProfile.jsx` — activity list gets `.activity-list`; rest inherits tokens.
- `Faq.jsx` / `Notices.jsx` — `white-space: pre-wrap` on multi-paragraph bodies; otherwise
  token inheritance.

### HTML shell
- `index.html` — `lang="ko"`, new title/description, `theme-color`, `public/favicon.svg`
  (monogram). New `apps/client/public/`.
- `apps/client/package.json` + lockfile — `pretendard`.

## Preserved (not touched)

`src/api.js`, all four contexts, `RequireAuth`/`RequireRole`, `src/format.js`,
`vite.config.js`, `pages/admin/*`, every backend, `docker-compose.yml`, `apps/nginx/*`.
All routes, route params and query params (`q`, `category`, `sort`, `page`, `pageSize`)
unchanged. Backend switcher still functional (now a header segmented control + drawer toggle).
All intentional vulnerabilities left intact.

## Verification

- `apps/client`: `npm run build` clean (Pretendard dynamic subset bundled).
- `docker compose up -d --build client nginx` + `docker compose restart nginx`:
  - `http://localhost:8090/` renders new shell, `lang="ko"`, favicon 200.
  - `/api/{node,java}/products` 200; login both stacks 200; SPA route fallback (`/products`) 200.
- Manual browser pass (owner): home hero/tiles/featured, header search → `/products?q=`,
  chip filters + sort, add-to-cart toast + header badge, PDP two-column, cart summary +
  checkout, orders status chips, receipt tools, login/signup + address modal, mobile drawer
  open/close + auto-close on nav, `/admin/*` renders unbroken.
- Intentional-vuln regression: `?q=<img onerror>` label, review `<b>` render, receipt `../`
  download, Java `/cart/import` — all still function.
