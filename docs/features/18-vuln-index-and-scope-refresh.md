# Chore: vulnerability index + scope-coverage refresh

Branch: `chore/vuln-index-refresh` (built on `main` @ PR #18, not yet merged)

## Problem

`docs/vulnerabilities/README.md` still said "아직 등록된 취약점이 없다" even though VULN-001–012
had shipped — the real index only existed as a table inside `docs/features/17-*.md`. No single
place showed which OWASP scope classes were covered vs open.

## Change

- `docs/vulnerabilities/README.md` rewritten as the live index: one row per VULN-001…022
  (implemented + planned), each linking to its doc, plus a scope-coverage matrix
  (DONE / PLANNED per `CLAUDE.md` scope item). VULN-003 shown struck through (withdrawn).
- `CLAUDE.md` "Vulnerability scope" section: NoSQLi noted as in-scope via a dedicated
  MongoDB feature; XXE, mass assignment, CSRF, business-logic/insecure-design added as
  explicit sub-items; a pointer to the README index/matrix added.

No code changes. This lands first so each subsequent VULN-013–022 branch only appends a row.

## Planned batch (VULN-013–022)

Access control (013 mass assignment, 014 CSRF) → business logic (015 negative qty) →
XSS/upload (016 reflected, 017 DOM, 018 file upload) → Java injection (019 cmd, 020 XXE,
021 Text4Shell dep) → NoSQLi (022, adds a `mongo` compose service). Six branches, merged in
order. Full detail: the plan file for this work.

## Verified

Docs only — `README.md` links resolve to existing `VULN-00N-*.md` filenames; matrix rows
match the CLAUDE.md scope list.
