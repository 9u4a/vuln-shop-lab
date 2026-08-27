# Vulnerability batch: VULN-019 Java cmd injection, VULN-020 XXE, VULN-021 Text4Shell

Branch: `feature/vuln-batch-019-java-injection` (stacked on `feature/vuln-batch-016-xss-and-upload`, not yet merged)

Java-only. Heaviest branch of the batch (new maven dep, shell exec, new controller,
`vuln/` helper).

## VULN-019 — OS command injection in Java receipt generation

`apps/java-spring/.../OrderController.java` `generateReceipt()` — was `Files.writeString`;
now reads `note` from the request body (falls back to `user.getBio()`), concatenates it into
an `echo "..." > file` string and runs `Runtime.getRuntime().exec(new String[]{"sh","-c",cmd})`.
Exact mirror of VULN-010 (Node). Client already sends `{note}` → no client change.

## VULN-020 — XXE in XML catalog import

New `apps/java-spring/.../controller/CatalogImportController.java` —
`POST /api/admin/products/import` (`consumes=application/xml`, admin-gated). Parses the body
with a bare `DocumentBuilderFactory.newInstance()` (no `disallow-doctype-decl`, no secure
processing), stores/echoes the parsed `<name>`. `<!ENTITY xxe SYSTEM "file:///proc/self/environ">`
→ `TOSS_SECRET_KEY` in the response; external-DTD variant demonstrates SSRF.

## VULN-021 — commons-text 1.9 (CVE-2022-42889, Text4Shell)

- `pom.xml` — explicit `org.apache.commons:commons-text:1.9` (not BOM-managed, so no version
  skew — same reasoning as VULN-012's refusal to pin `jackson-databind`).
- `apps/java-spring/.../vuln/TemplateRenderer.java` — isolates the
  `StringSubstitutor.createInterpolator().replace(...)` call.
- `FaqController.list()` / `NoticeController.list()` now build response maps and pass each
  `answer` / `body` through `TemplateRenderer.render()` (a "merge fields in announcements"
  feature). Any logged-in user posts a FAQ with `${env:TOSS_SECRET_KEY}` / `${url:...}` /
  `${dns:...}`; it resolves when the list renders. `${script:...}` RCE needs a JSR-223 engine
  (not on the Java 21 base image) — the `env`/`url`/`dns` lookups are the live vectors here.

## Verification

- `docker compose build java-spring` (pulls commons-text 1.9, compiles the new controller +
  helper + FAQ/notice changes).
- End-to-end:
  - `POST /api/java/orders/1/receipt {"note":"x; id > receipts/receipt_1.txt; echo x"}` →
    `GET /api/java/orders/receipt/receipt_1.txt` contains `uid=...`.
  - `POST /api/java/admin/products/import` (admin) with a `file:///etc/passwd` DOCTYPE →
    `imported[0].name` contains the file (secrets need the OOB external-DTD variant — direct
    `/proc/self/environ` fails on NUL bytes). Non-admin → 403.
  - `POST /api/java/faqs {"answer":"k=${env:TOSS_SECRET_KEY}"}` → `GET /api/java/faqs` shows the
    real key.
  - FAQ/notice list response shape unchanged for normal (no `${...}`) content — client regression.
