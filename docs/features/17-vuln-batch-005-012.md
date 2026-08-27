# Vulnerability batch: VULN-005 – VULN-012

Branch: `feature/vuln-batch-005-013` (built on `main` @ `4feb2ea`, not yet merged)

Phase 1 work only — implement the intentional vulnerabilities and document intent/trigger
in `docs/vulnerabilities/`. Diagnosis (Burp) and remediation are later phases.

## Scope

Eight vulnerabilities, chosen to round out the OWASP Top 10 coverage the earlier
findings (VULN-001, 002, 004 — 003 was withdrawn) left open — injection variants,
access control, misconfig, deserialization.

| ID | Vuln | Stack | New endpoint / surface |
|----|------|-------|------------------------|
| VULN-005 | SQL injection in product search/filter | java-spring | `GET /api/products` (`q`, `category`) — Java twin of VULN-001 |
| VULN-006 | Session fixation + no login lockout | both | existing `POST /api/auth/login` (doc-only, describes current behavior) |
| VULN-007 | Security misconfiguration: exposed diagnostics | both | `/actuator/*` (Java), default `development` error handler (Node) |
| VULN-008 | Stored XSS in review body | client + both | `ProductDetail.jsx` renders `r.body` via `dangerouslySetInnerHTML` |
| VULN-009 | IDOR: review update/delete without ownership check | both | `PUT`/`DELETE /api/products/:id/reviews/:reviewId` |
| VULN-010 | OS command injection in receipt generation | node-express | `POST /api/orders/:id/receipt` |
| VULN-011 | Path traversal in receipt download | both | `GET /api/orders/receipt/:filename` |
| VULN-012 | Insecure deserialization in cart backup import | java-spring | `POST /api/cart/import` |

(The branch name says `005-013`; the batch landed at 012 — there is no VULN-013.)

## Design notes

- **VULN-005** — `ProductService.list()` now branches: no filters → `findAll()`; any filter →
  hand-built native SQL string with `q`/`category` concatenated directly, run through
  `EntityManager.createNativeQuery(..., Product.class)`. The typed `ProductRepository`
  finder methods are left in place (unused for the filtered path) so the safe version is
  a small diff at remediation time.

- **VULN-006** — No code change. Both `AuthController.login` (Java) and `auth.js` login
  (Node) already set the user on the pre-existing session without `regenerate()` /
  `changeSessionId()`, and neither stack has any attempt counter. The doc records this as
  the intentional finding so it flows through diagnosis/remediation like the others.

- **VULN-007** — Java: added `spring-boot-starter-actuator` and
  `management.endpoints.web.exposure.include: "*"` with `health.show-details: always`.
  The app has no Spring Security, so every actuator endpoint (`/env`, `/heapdump`,
  `/beans`, …) is unauthenticated. Node: relies on `NODE_ENV` being unset everywhere
  (Dockerfile, `.env.example`) → Express defaults to `development` → stack traces in
  error responses. No new code.

- **VULN-008** — Client-side sink. Review list item switched from `{r.body}` to
  `<span dangerouslySetInnerHTML={{ __html: r.body }} />`. Neither backend sanitizes
  review bodies on create or update, so a stored `<img onerror=…>` executes for every
  viewer of the product page.

- **VULN-009** — New `PUT`/`DELETE` review routes on both stacks. Guarded by
  `requireAuth` / session-user check only; they look the review up by
  `(reviewId, productId)` but never compare `review.user_id` to the caller. Client gets
  "수정 / 삭제" buttons on every review when logged in (not just your own) to exercise it.

- **VULN-010** — `POST /api/orders/:id/receipt` builds an `echo "... 메모: ${note}" > file`
  string and runs it through `child_process.exec`. `note` comes from the request body,
  falling back to the user's `bio` (freely settable via `PUT /api/profile`), so the
  injection is reachable even without the note field. Node-only — the Java receipt
  endpoint writes the file with `Files.writeString`, no shell.

- **VULN-011** — `GET /api/orders/receipt/:filename` on both stacks joins the raw
  path parameter to the receipts dir (`path.join` / `RECEIPTS_DIR.resolve`) with no
  normalization or ownership check. `../` and encoded traversal reach any file the WAS
  process can read.

- **VULN-012** — Isolated in `com.vulnlab.shop.vuln.CartImportController` per the
  Java-stack convention. `POST /api/cart/import` reads the raw body with a local
  `ObjectMapper` whose `activateDefaultTyping(LaissezFaireSubTypeValidator.instance, …)`
  disables subtype validation, so a client-supplied array-form `@class` instantiates
  arbitrary classpath types (CWE-502). Global `jackson-databind` version is deliberately
  left at the Spring Boot BOM version — see the vuln doc for why pinning it down breaks
  the rest of the app's JSON.

- **Client API** — `api.js` gains `generateReceipt`, `fetchReceipt`, `updateReview`,
  `deleteReview`, `importCartBackup`. The cart-backup import form only renders on the
  Java backend (`backendKey === 'java'`).

- `.gitignore` — added `apps/*/receipts/` (generated receipt files, both stacks).

## Verification status

- Node: `node -c` clean on `orders.js`, `products.js`, `auth.js`.
- Java: not compiled locally (no Maven / wrapper on this machine). Changes reviewed by
  hand — new imports present, reused existing helpers (`currentUser`/`unauthorized`,
  `reviewRepository`, `orderRepository`), `vuln` package is under the
  `com.vulnlab.shop` component-scan root.
- End-to-end exploitation of each trigger is Phase 2 (Burp) — to be recorded in
  `docs/findings/`.
