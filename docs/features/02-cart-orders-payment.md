# Feature: Cart, Orders & Payment (Toss Payments test mode)

Branch: `feature/cart-orders-payment` (built on top of `feature/profile-roles`)

## What was added

- Cart is client-side only (`CartContext`, localStorage per backend), no server state until checkout.
- `POST /api/orders` — takes `{ items: [{productId, quantity}], webhookUrl? }`, looks up each product's **current server-side price** (never trusts a client-supplied price), computes the total, creates an `orders` row (`status='pending'`) + `order_items` snapshot rows, returns `{ orderId, tossOrderId, amount }`.
- `GET /api/orders`, `GET /api/orders/:id` — scoped to `req.session.user` / the session's `User`; a mismatched owner gets `404`, not the order (verified — see below).
- `POST /api/orders/:id/confirm` — server-side call to Toss Payments' `POST /v1/payments/confirm` using `TOSS_SECRET_KEY` (Basic auth, base64 `secretKey:`), checks the client-reported amount against the order's stored total before confirming, sets `status='paid'` on success / `'failed'` on Toss rejection.
- If `TOSS_SECRET_KEY` isn't set, `/confirm` returns `501` with a clear message instead of crashing — the rest of the flow (cart → order creation → order history) is fully testable without any payment credentials.
- Order webhook: if `webhookUrl` was supplied at checkout, a `POST` with the order summary fires once the order is marked `paid`. Fire-and-forget, 5s timeout, failures only logged.
- Client: `/cart`, `/orders`, `/orders/:id`, `/checkout/success`, `/checkout/fail` pages; "Add to cart" buttons on product list/detail; nav shows cart count and an Orders link when logged in. Checkout loads `@tosspayments/payment-sdk`'s `loadTossPayments(clientKey).requestPayment(...)`, which redirects to Toss's hosted checkout, then back to `/checkout/success` with `paymentKey`/`orderId`/`amount` query params that get posted to `/confirm`.

## Payment provider decision

Researched two options: Stripe (test mode) and Toss Payments (Korean PG). Went with **Toss Payments test mode**:

- Toss publishes copy-paste test keys in their docs (https://docs.tosspayments.com/reference/using-api/api-keys) usable **without creating an account** — lowest-friction way to get this working. (Their docs page is JS-rendered so the exact key string couldn't be scraped automatically here — grab it from that page directly.)
- All approvals in test mode are virtual; no real card is ever charged, matching the project's safety guardrails (no real payment data/money in a deliberately-vulnerable app).

## Setup required before the live Toss redirect works

1. Get a test client key + secret key from the Toss docs page above (no signup needed for the documented shared test keys; signing up gets you your own so you can see a test payment history in their dashboard).
2. In root `.env`: set `TOSS_CLIENT_KEY` (client) and `TOSS_SECRET_KEY` (both backends).
3. `docker compose up --build` (or restart the affected services) to pick up the new env vars.

Until then, checkout still creates a `pending` order and tells the user payment isn't configured — nothing breaks.

## Schema

No new tables — `orders`/`order_items` were already added in `feature/profile-roles` in anticipation of this feature.

## Known/intentional gaps (not vulnerabilities yet — this is still the functional-feature phase)

- The webhook call has **no SSRF protection** (no private-IP/hostname blocklist) — this is a known future attack surface, to be formally tracked under `docs/vulnerabilities/` once we start the deliberate vulnerability-injection phase, not fixed preemptively here.
- `react-router-dom` is pinned to `6.26.2` deliberately, including the open-redirect CVE it carries (GHSA-wrjc-x8rr-h8h6) — same reasoning as `multer` in `feature/profile-roles`: this app intentionally keeps known-CVE dependency versions as one of the planned vulnerability categories (vulnerable dependencies / SCA target), to be tracked under `docs/vulnerabilities/` once that phase starts rather than patched now.
- `npm audit` also flags a moderate esbuild/Vite dev-server advisory (GHSA-67mh-4wv8-2f99) with no non-breaking fix available (needs Vite 8). Dev-server-only, and this app only ever runs on an isolated network per the project's safety guardrails, so left as-is.

## Verified

Via `docker compose up --build`, through the client's Vite proxy, for both `node` and `java` backends:
- Order creation with server-computed totals (2x keyboard + 1x mouse = $209.97, matches manual calc).
- `GET /api/orders` and `/api/orders/:id` return the right data for the owner.
- A second user attempting `GET /api/orders/1` (owned by the first user) gets `404`, confirming no IDOR here.
- `/confirm` without `TOSS_SECRET_KEY` returns `501` with a clear message rather than a crash.
- Client routes `/cart`, `/orders`, `/checkout/success` all serve the SPA shell (200).
- With a real Toss test key set (`TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`), `/confirm` with a fake `paymentKey` reaches Toss's live confirm API and gets Toss's own rejection back (`NOT_FOUND_PAYMENT_SESSION`, proxied as `502`) on both backends — confirms the server-side Toss wiring (Basic auth, request shape) is correct end to end.

Not yet verified: the actual browser-based Toss-hosted checkout redirect (`requestPayment` → Toss UI → successUrl with a real `paymentKey`), since that requires driving a real browser through Toss's UI rather than curl.
