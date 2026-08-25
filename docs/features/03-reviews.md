# Feature: Product Reviews

Branch: `feature/reviews` (built on top of `feature/cart-orders-payment`)

## What was added

- `GET /api/products/:id/reviews` — public, lists reviews for a product (username, rating, body, createdAt), newest first.
- `POST /api/products/:id/reviews` — `requireAuth`-gated, body `{ rating: 1-5, body: string }`; rejects missing product, out-of-range rating, or empty body.
- Client: `ProductDetail` page now shows the review list and a submit form for logged-in users (a login prompt otherwise).

## Why this design

- Uses the `reviews` table added in `feature/profile-roles`'s schema-ahead-of-time pass — no migration needed.
- Review text is rendered by React as plain JSX text (`{r.body}`), which auto-escapes by default. That means **this feature is not exploitable as stored XSS yet**, even though `reviews.body` is free text — React's default escaping accidentally protects it. The planned stored-XSS vulnerability (per the project's OWASP coverage list) will need a deliberate later change (e.g. swapping to `dangerouslySetInnerHTML` or a markdown renderer that isn't escaped) tracked as its own `docs/vulnerabilities/VULN-xxx` entry — not introduced here, since this is still the functional-feature phase.

## Verified

Via `docker compose up --build`, through the client's Vite proxy, for both `node` and `java` backends:
- Logged-in user posts a review (`201`), it shows up in the product's review list with the correct username/rating/body.
- Anonymous `POST` is rejected (`401`).
- Client `/products/:id` route serves correctly (`200`).
