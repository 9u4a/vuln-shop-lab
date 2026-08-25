# Feature: KRW currency, full Korean localization

Branch: `feature/krw-currency-korean-localization` (built on `main`, after PR #13 merged)

## What was added

- **KRW currency, integer amounts**: seed product prices on both stacks switched from decimal USD-style (`89.99`) to whole-won integers (`89000`). Added `apps/client/src/format.js` (`formatCurrency`) — rounds and renders `xx,xxx원` (Korean thousands-separator convention) — and replaced every `$${...toFixed(2)}` price display across the client (`Products`, `ProductDetail`, `Cart`, `Orders`, `OrderDetail`, `AdminOrders`, `AdminProducts`) with it. `AdminProducts`' price input changed from `step="0.01"` to integer (`step="1"`, rounds on submit). This was the direct fix for Toss checkout failing to even be attempted — decimal totals had nothing to do with the earlier SDK/key mismatch (already fixed in the previous feature), but non-integer KRW amounts are the kind of thing that reads as broken/foreign in a KRW-only payment flow, so both are now clean.
- **Full Korean UI translation**: every client page's user-facing text — nav labels, headers, buttons, form labels, placeholders, empty-state and status messages, toasts — translated to Korean, across `App.jsx`, `Home`, `Login`, `Signup`, `AddressSearchModal`, `Products`, `ProductDetail`, `Cart`, `CheckoutResult`, `Orders`, `OrderDetail`, `Faq`, `Notices`, `Pagination`, `mypage/*`, `admin/*`. (`NotFound`/`Forbidden`/the login toast were already Korean from earlier work.) `MyPageProfile` now also displays the signup-collected name/phone/address fields, which had no UI surface before this.
- **Backend error messages translated to Korean**, both stacks — every `{"error": "..."}` string returned by Node's route files and `middleware/auth.js`, and Java's controller classes, now reads in Korean (e.g. "로그인이 필요합니다.", "아이디 또는 비밀번호가 올바르지 않습니다."). `api.js`'s generic fallback (`Request failed (...)`) is now `요청에 실패했습니다 (...)` too, so no English ever reaches the user through a normal flow. Product/user-facing English identifiers that read as intentional loanwords (`FAQ`, `SYSTEM_ADMIN`-style role badges) were left as-is.
- Left untouched: `docs/vulnerabilities/*` payload examples, VULN-001's `sortKey` debug column on the Products page (diagnostic, not addressed by this task), and seed usernames/roles (`system_admin` etc.) — these are identifiers, not UI copy.

## Verified

Fresh volumes, `docker compose up --build`, both backends:
- curl: seeded product prices are clean integers on Node (`89000`) and Java (`89000.0`, harmless BigDecimal scale artifact — `formatCurrency` rounds client-side regardless); signup/login error bodies return the Korean strings above on both stacks.

In the browser (Node backend, logged in as `9u4a`):
- Products, Home, Cart, FAQ, MyPage, and Admin → Products all render fully in Korean with `xx,xxx원` pricing.
- Cart checkout with a fresh cart (cleared stale localStorage from earlier English-named test data) → order created as "주문 #1 — 29,000원" → Toss Payment Widget renders inline with the "테스트 환경이에요" banner, payment method tiles, and 결제하기/취소 buttons — confirms the whole flow works end-to-end with the new integer KRW amount.
