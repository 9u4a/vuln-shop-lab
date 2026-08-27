# Vulnerability batch: VULN-016 reflected XSS, VULN-017 DOM XSS, VULN-018 file upload

Branch: `feature/vuln-batch-016-xss-and-upload` (stacked on `feature/vuln-batch-015-business-logic`, not yet merged)

Theme A03 injection (XSS) + file upload. Completes Reflected + DOM XSS coverage
(only Stored existed via VULN-008).

## VULN-016 — Reflected XSS in printable HTML receipt

New "인쇄용 보기" feature. `GET /api/orders/:id/receipt/print` on both stacks returns
`text/html` with the `note` query param concatenated unescaped:
- `apps/node-express/src/routes/orders.js` — new route, `requireAuth` + ownership check kept.
- `apps/java-spring/.../OrderController.java` — `@GetMapping(produces=TEXT_HTML_VALUE)` returning
  the same HTML string.
- `apps/client/src/pages/OrderDetail.jsx` — "인쇄용 보기" link opening that URL (`?note=<current note>`) in a new tab.

## VULN-017 — DOM-based XSS in product search heading

`apps/client/src/pages/Products.jsx` — the `q` search param is rendered as
`<p dangerouslySetInnerHTML={{ __html: `'${q}' 검색 결과` }} />`. Pure client sink,
URL source, no server round-trip. Distinct from VULN-008 (stored, DB source).

## VULN-018 — Unrestricted file upload (content-type trust)

- `apps/node-express/src/uploads.js` — `fileFilter` drops the extension allowlist, now
  `file.mimetype.startsWith('image/')`; stored filename keeps `path.extname(originalname)`.
- `apps/java-spring/.../storage/Uploads.java` — `isAllowed()` checks `file.getContentType()`
  starts with `image/`; `store()` keeps the original extension.

`poc.html` sent with `Content-Type: image/png` is stored as `<uuid>.html` and served
`text/html` from `/uploads/*` (same origin as the SPA via nginx) → stored XSS on the app
origin. Chains with VULN-014 (CSRF-delivered avatar upload).

## Verification

- Node: `node -c` on `routes/orders.js`, `uploads.js`.
- Java: `docker compose build java-spring`.
- Client: `docker compose build client`.
- End-to-end:
  - `GET /api/{node,java}/orders/1/receipt/print?note=<script>alert(1)</script>` → response
    `Content-Type: text/html` with the raw `<script>` in the body.
  - upload `x.html` (`Content-Type: image/png`) to `/api/node/profile/avatar` → `GET
    /uploads/node/<uuid>.html` returns `Content-Type: text/html`.
  - a real `.png` avatar upload still succeeds (regression).
  - `/products?q=<img src=x onerror=...>` executes in the browser.
