# Feature: Signup profile fields, working Toss checkout, FAQ/Notices search+pagination

Branch: `feature/signup-fields-checkout-fix-search` (built on `main`, after PR #12 merged)

## What was added

- **Cart cleanup**: removed the "Order webhook URL (optional)" input from `Cart.jsx` — it read as an arbitrary, out-of-place field. The backend still accepts `webhookUrl` in `POST /orders` unchanged, so the SSRF it triggers (`fireWebhook()` fetching that URL with zero validation) is still fully reachable via Burp — it just isn't a form field anymore, same relationship VULN-001's SQLi has to the search box. This was actually undocumented before now; recorded as **VULN-004** (`docs/vulnerabilities/VULN-004-order-webhook-ssrf.md`).
- **Fixed the Toss Payments checkout, which was silently broken**: the configured `TOSS_CLIENT_KEY` is a `test_gck_*` **Payment Widget** key, but the app was on `@tosspayments/payment-sdk` v1 (`requestPayment('카드', {...})`), which only accepts direct API-integration keys — every checkout attempt failed instantly with a Toss SDK error before any payment UI ever appeared. Swapped to `@tosspayments/tosspayments-sdk` v2 and rewrote `Cart.jsx`'s checkout into the two-step widget flow it actually requires: `Checkout` creates the order then mounts `tossPayments.widgets({customerKey}).renderPaymentMethods()/.renderAgreement()` inline; a `Pay` button then calls `widgets.requestPayment(...)`. Verified live — the widget renders real payment method tiles (cards, 카카오페이, 네이버페이, 계좌이체, etc.), card issuer selection, installment options, and terms checkbox.
- **Signup now collects name, phone, and address** on both stacks: `users` gained `name`, `phone`, `postcode`, `address`, `address_detail` (Node: `db.js` + `auth.js`; Java: `User` entity + `AuthService.signup(...)` + `AuthController`), all required except `address_detail`. `GET /profile` now returns these fields too.
- **Address search popup**: `AddressSearchModal.jsx`, a self-contained modal backed by a fixture list (`data/dummyAddresses.js`, ~18 fictional Korean addresses — no external API, no real addresses, same "dummy data only" convention as the product seed images). Search filters by substring; selecting an entry fills postcode+address in the signup form, leaving `address_detail` free text.
- **FAQ opened up to any logged-in user**: `POST /faqs` changed from admin-only to `requireAuth` on both stacks (Node: `faqs.js`; Java: `FaqController`), storing the author (`user_id` FK + `username`/`authorUsername` in the response — Node joins live, Java denormalizes at write time). `PUT`/`DELETE` stay admin-only. `Faq.jsx` now has an "Ask a question" form for any authenticated user, shown as a login prompt otherwise; `AdminFaq.jsx` keeps working unchanged (admin is also just an authenticated user as far as this endpoint cares).
- **Search + pagination for FAQ and Notices**, both stacks: `GET /faqs` and `GET /notices` now take `q`, `page`, `pageSize` and return `{..., total, page, pageSize}`. Node uses parameterized `LIKE ... LIMIT ... OFFSET` (bound params — not a designated vuln surface, unlike products' search). Java uses Spring Data derived queries (`findByQuestionContainingIgnoreCaseOrAnswerContainingIgnoreCase`, `Pageable`). Added a reusable `Pagination.jsx` (Prev/numbered pages/Next) and a `.search-row` search box, used on both `Faq.jsx` and `Notices.jsx`. Admin list views (`AdminFaq.jsx`/`AdminNotices.jsx`) now explicitly request `pageSize: 50` so they keep showing everything at once rather than being capped at the new default page size of 10.

## Verified

Fresh volumes, `docker compose up --build`, both backends via curl (UTF-8-encoded request bodies — Git Bash's own heredoc encoding briefly produced a false-positive 400 on the Java side during testing, unrelated to the app):
- Signup with full profile → `201` on both stacks; missing address → `400` with the expected message on both.
- `GET /profile` returns `name`/`phone`/`postcode`/`address`/`addressDetail`.
- `POST /faqs` as a plain `user` → `201` with `authorUsername` set; unauthenticated → `401`.
- FAQ/Notices pagination (`page`/`pageSize`) and search (`q`) both return correctly on both stacks, including the total count.
- `POST /orders` still accepts `webhookUrl` with no UI involvement — SSRF surface intact for Burp-based reproduction.

In the browser (Node backend):
- Signup: address modal opens, search-filters to matching fixture entries, selection fills postcode+address; full signup → login → succeeded.
- Cart: no webhook field. Checkout → order created → Toss Payment Widget renders inline with live payment-method tiles, card issuer picker with installment dropdown, and a test-mode banner — confirms the SDK/key mismatch is actually fixed, not just silently working differently.
- FAQ: search box, 5-per-page pagination (Prev/1/2/Next), "Asked by <user>" byline, and the "Ask a question" form all work — submitted one as a plain user and it appeared immediately.
- Notices: search box and pagination render correctly (empty state with none seeded yet).
- Admin: `/admin/faq` still lists and manages every FAQ (including user-submitted ones) with the `pageSize: 50` fix; `9u4a` system_admin login unaffected by any of the above.
