# Vulnerability batch: VULN-015 order-quantity business logic

Branch: `feature/vuln-batch-015-business-logic` (stacked on `feature/vuln-batch-013-access-control`, not yet merged)

## VULN-015 — negative/zero order quantity → total manipulation

- `apps/node-express/src/routes/orders.js` `POST /` — removed the `quantity < 1` guard from
  the per-item validation loop (`Number.isInteger` still required).
- `apps/java-spring/.../OrderController.java` `create()` — `if (product == null || quantity < 1)`
  → `if (product == null)`.

Server still computes `total = Σ(price × qty)`; a negative-quantity line item drives the total
to ≤ 1 or negative, and `confirm()` only checks `amount === total`, so the manipulated total is
accepted. No client change (the cart UI never sends negative quantities — this is an API-level
flaw, exercised via Burp Repeater).

Doc: `docs/vulnerabilities/VULN-015-order-quantity-business-logic.md`.

## Verification

- Node: `node -c src/routes/orders.js`.
- Java: `docker compose build java-spring`.
- End-to-end: `POST /api/{node,java}/orders` with `[{expensive, qty 1}, {cheap, qty -N}]` →
  response `amount` ≤ 1 / negative; the order persists with that `totalAmount` in
  `GET /orders/:id` and the admin order list.
