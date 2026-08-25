# Feature: Product Search, Category Filter & Sort (deliberately vulnerable)

Branch: `feature/search-filters`

Unlike features 01-04, this one is **intentionally unsafe** per direct instruction — no safe-then-later-vuln-injection split. Both new vulnerabilities are documented immediately per `CLAUDE.md`'s convention: `docs/vulnerabilities/VULN-001-*.md` and `VULN-002-*.md`.

## What was added

- `GET /api/products` now accepts `category` and `sort` in addition to the existing `q`.
- Client `Products` page: category text filter + sort dropdown (Name/Price), plus a `sortKey` debug line per product when `sort` is active (this is the Java exploit surface, shown deliberately since it mirrors a realistic "left the debug field in" bug).

## The vulnerabilities

- **VULN-001 (node-express)**: `q`/`category`/`sort` are concatenated directly into the SQL string (no parameter binding) — classic SQL injection, exploitable via UNION SELECT to dump other tables (verified: dumps the `flags` table, see below).
- **VULN-002 (java-spring)**: `sort` is parsed and evaluated as a full Spring Expression Language (SpEL) expression against each `Product`, with the evaluated value echoed back in a `sortKeys` response field — exploitable via `T(...)` type references for arbitrary static method calls (verified: reads env vars; RCE via `Runtime.exec` is the same primitive, documented but not executed).

Full detail, exact payloads, and impact are in the VULN docs — not duplicated here per the project's "don't repeat what's in docs" rule.

## Verified

Via `docker compose up --build`, through the client's Vite proxy:
- Normal usage still works: `?category=accessories&sort=price` returns filtered/sorted results correctly on both backends.
- `GET /api/node/products?category=nonexistent' UNION SELECT 0, vuln_id, flag_value, 0, '', '', captured_at FROM flags -- ` returns `FLAG_VULN_001`'s value in a fake product's `description` field.
- `GET /api/java/products?sort=T(System).getenv('FLAG_VULN_002')` returns `FLAG_VULN_002`'s value in every entry of `sortKeys`.
